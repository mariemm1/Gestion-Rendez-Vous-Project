const express = require("express");
const Professionnel = require("../models/professionnel");
const User = require("../models/user");
const bcryptjs = require('bcryptjs');
const router = express.Router();

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

// CREATE: Create a new professionnel (only ADMIN can create)
router.post('/create', verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const { nom, email, pwd, specialite, disponibilites } = req.body;

    if (!nom || !email || !pwd || !specialite) {
      return res.status(400).send({ message: "Tous les champs sont obligatoires (nom, email, pwd, specialite)." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Cet email est déjà utilisé." });
    }

    const hashedPwd = await bcryptjs.hash(pwd, 10);
    const user = new User({ nom, email, pwd: hashedPwd, role: "PROFESSIONNEL" });
    await user.save();

    const newProfessionnel = new Professionnel({
      userId: user._id,
      specialite,
      disponibilites: disponibilites || []
    });

    await newProfessionnel.save();

    res.status(201).send({ message: "Professionnel ajouté avec succès", professionnel: newProfessionnel });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all professionnels (only ADMIN)
router.get('/all', verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const profs = await Professionnel.find().populate('userId');
    res.status(200).send(profs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get a professionnel by name (ADMIN or the professionnel themselves)
router.get('/:nom', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Check permission: ADMIN or owner
    if (req.user.role !== "ADMIN" && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId: user._id }).populate('userId');
    if (!professionnel) {
      return res.status(404).send({ message: "Professionnel not found" });
    }

    res.status(200).send(professionnel);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// UPDATE: Update a professionnel by email (ADMIN or the professionnel themselves)
router.put('/:email', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (req.user.role !== "ADMIN" && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId: user._id }).populate('userId');
    if (!professionnel) {
      return res.status(404).send({ message: "Professionnel not found" });
    }

    const { nom, email, pwd } = req.body;

    if (nom) user.nom = nom;
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).send({ message: "Email already in use" });
      }
      user.email = email;
    }

    if (pwd) {
      user.pwd = await bcryptjs.hash(pwd, 10);
    }

    await user.save();
    await professionnel.save();

    res.status(200).send({ message: "Professionnel updated successfully", professionnel });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// DELETE: Delete a professionnel and associated user (only ADMIN)
router.delete('/:id', verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
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
