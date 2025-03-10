const express = require("express");
const Professionnel = require("../models/professionnel"); // Correct import
const User = require("../models/user");
const bcryptjs = require('bcryptjs');
const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd, specialite, disponibilites } = req.body;

    // Vérification que tous les champs requis sont fournis
    if (!nom || !email || !pwd || !specialite) {
      return res.status(400).send({ message: "Tous les champs sont obligatoires (nom, email, pwd, specialite)." });
    }

    // Hashage du mot de passe
    const hashedPwd = await bcryptjs.hash(pwd, 10);

    // Créer un utilisateur avec le rôle 'PROFESSIONNEL'
    const user = new User({ nom, email, pwd: hashedPwd, role: "PROFESSIONNEL" });
    await user.save();  // Sauvegarder l'utilisateur dans la base de données

    // Créer un professionnel avec les informations de l'utilisateur créé
    const newProfessionnel = new Professionnel({
      userId: user._id,  // Associer le professionnel à l'utilisateur
      specialite: specialite,  // Spécialité du professionnel
      disponibilites: disponibilites || []  // Si aucune disponibilité n'est fournie, un tableau vide est utilisé
    });

    await newProfessionnel.save();  // Sauvegarder le professionnel dans la base de données

    // Réponse après la création du professionnel
    res.status(201).send({ message: "Professionnel ajouté avec succès", professionnel: newProfessionnel });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all Admins
router.get('/all', async (req, res) => {
  try {
    const profs = await Professionnel.find().populate('userId');
    res.status(200).send(profs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.get('/:nom', async (req, res) => {
    try {
      // Find the user by name
      const user = await User.findOne({ nom: req.params.nom });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      // Find the Professionnel using the user ID
      const professionnel = await Professionnel.findOne({ userId: user._id }).populate('userId');
      if (!professionnel) {
        return res.status(404).send({ message: "Professionnel not found" });
      }
  
      res.status(200).send(professionnel);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
});

router.put('/:email', async (req, res) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email: req.params.email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      const professionnel = await Professionnel.findOne({ userId: user._id }).populate('userId');
      if (!professionnel) {
        return res.status(404).send({ message: "Professionnel not found" });
      }
  
      const { nom, email, pwd } = req.body;
  
      // Update user details
      if (nom) user.nom = nom;
      if (email) user.email = email;
  
      // Hash password if updated
      if (pwd) {
        user.pwd = await bcryptjs.hash(pwd, 10);
      }
  
      await user.save();
      await professionnel.save();
  
      res.status(200).send({ message: "professionnel updated successfully", professionnel });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
      const professionnel = await Professionnel.findOne({ userId: req.params.id });
      if (!professionnel) {
        return res.status(404).send({ message: "Professionnel not found" });
      }
  
      await Professionnel.findByIdAndDelete(professionnel._id);
      await User.findByIdAndDelete(req.params.id);
  
      res.status(200).send({ message: "Professionnel and associated user deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
});

module.exports = router;
