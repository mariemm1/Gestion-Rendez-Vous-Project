const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();

const Client = require('../models/client');
const User = require('../models/user');

const verifyToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

// CREATE: Create a new client (public route)
router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd, historiqueRendezVous } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Cet email est déjà utilisé." });
    }

    // Create the user with default role "CLIENT"
    const hashedPwd = await bcryptjs.hash(pwd, 10);
    const user = new User({ nom, email, pwd: hashedPwd, role: "CLIENT" });
    await user.save();

    // Create the client with the user reference
    const newClient = new Client({ userId: user._id, historiqueRendezVous: historiqueRendezVous || [] });
    await newClient.save();

    res.status(201).send({ message: "Client créé avec succès", client: newClient });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all clients (ADMIN only)
router.get('/all', verifyToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const clients = await Client.find().populate('userId');
    res.status(200).send(clients);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all clients with their rendezvous history (ADMIN only)
router.get('/allH', verifyToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const clients = await Client.find()
      .populate('userId')
      .populate('historiqueRendezVous');
    res.status(200).send(clients);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get a specific client by name with rendezvous history
// Accessible by ADMIN or the client themselves
router.get('/:nom', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) return res.status(404).send({ message: "Utilisateur non trouvé" });

    // Check authorization: admin or self
    if (req.user.role !== 'ADMIN' && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const client = await Client.findOne({ userId: user._id })
      .populate('userId')
      .populate('historiqueRendezVous');

    if (!client) return res.status(404).send({ message: "Client non trouvé" });

    res.status(200).send(client);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// UPDATE: Update client info by email
// Accessible by ADMIN or the client themselves
router.put('/:email', verifyToken, async (req, res) => {
  try {
    const { nom, email, pwd } = req.body;
    if (!nom && !email && !pwd) {
      return res.status(400).send({ message: "Au moins un champ est requis pour la mise à jour." });
    }

    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).send({ message: "Utilisateur non trouvé" });

    // Check authorization: admin or self
    if (req.user.role !== 'ADMIN' && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    if (nom) user.nom = nom;
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).send({ message: "Email déjà utilisé" });
      }
      user.email = email;
    }
    if (pwd) user.pwd = await bcryptjs.hash(pwd, 10);

    await user.save();
    res.status(200).send({ message: "Utilisateur mis à jour avec succès", user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// DELETE: Delete a client by userId
// Accessible by ADMIN or the client themselves
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.params.id });
    if (!client) return res.status(404).send({ message: "Client non trouvé" });

    // Check authorization: admin or self
    if (req.user.role !== 'ADMIN' && req.user.userId !== req.params.id) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    await Client.findByIdAndDelete(client._id);
    await User.findByIdAndDelete(req.params.id);

    res.status(200).send({ message: "Client et utilisateur associés supprimés avec succès" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
