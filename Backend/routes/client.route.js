const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();

const Client = require('../models/client');
const User = require('../models/user');

const verifyToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

/* ===========================
 * PUBLIC: create client
 * =========================== */
router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd, historiqueRendezVous } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPwd = await bcryptjs.hash(pwd, 10);
    const user = new User({ nom, email, pwd: hashedPwd, role: 'CLIENT' });
    await user.save();

    const newClient = new Client({
      userId: user._id,
      historiqueRendezVous: historiqueRendezVous || []
    });
    await newClient.save();

    res.status(201).send({ message: 'Client créé avec succès', client: newClient });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* =========================================================
 * IMPORTANT: put concrete/static routes BEFORE param routes
 * ========================================================= */

/* CLIENT (logged-in): fetch my Client document (to get Client._id) */
router.get('/me', verifyToken, authorizeRoles('CLIENT'), async (req, res) => {
  try {
    const doc = await Client.findOne({ userId: req.user.userId });
    if (!doc) return res.status(404).json({ message: 'Client non trouvé' });
    return res.json(doc); // { _id, userId, historiqueRendezVous, ... }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

/* ADMIN: list all clients */
router.get('/all', verifyToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const clients = await Client.find().populate('userId');
    res.status(200).send(clients);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ADMIN: list all with populated history */
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

/* ADMIN or SELF: get a client by the user's display name (nom)
 * NOTE: kept AFTER /me to avoid catching it.
 */
router.get('/:nom', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) return res.status(404).send({ message: 'Utilisateur non trouvé' });

    if (req.user.role !== 'ADMIN' && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: 'Accès refusé' });
    }

    const client = await Client.findOne({ userId: user._id })
      .populate('userId')
      .populate('historiqueRendezVous');

    if (!client) return res.status(404).send({ message: 'Client non trouvé' });

    res.status(200).send(client);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ADMIN or SELF: update by email */
router.put('/:email', verifyToken, async (req, res) => {
  try {
    const { nom, email, pwd } = req.body;
    if (!nom && !email && !pwd) {
      return res.status(400).send({ message: 'Au moins un champ est requis pour la mise à jour.' });
    }

    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).send({ message: 'Utilisateur non trouvé' });

    if (req.user.role !== 'ADMIN' && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: 'Accès refusé' });
    }

    if (nom) user.nom = nom;
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).send({ message: 'Email déjà utilisé' });
      }
      user.email = email;
    }
    if (pwd) user.pwd = await bcryptjs.hash(pwd, 10);

    await user.save();
    res.status(200).send({ message: 'Utilisateur mis à jour avec succès', user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ADMIN or SELF: delete by the user's id */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.params.id });
    if (!client) return res.status(404).send({ message: 'Client non trouvé' });

    if (req.user.role !== 'ADMIN' && req.user.userId !== req.params.id) {
      return res.status(403).send({ message: 'Accès refusé' });
    }

    await Client.findByIdAndDelete(client._id);
    await User.findByIdAndDelete(req.params.id);

    res.status(200).send({ message: 'Client et utilisateur associés supprimés avec succès' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
