const express = require("express");
const Professionnel = require("../models/professionnel");
const User = require("../models/user");
const bcryptjs = require('bcryptjs');
const router = express.Router();

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const { buildSlots } = require('./time');           
const RendezVous = require('../models/rendezVous');       


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

// ✅ PUBLIC (auth optional) list of professionals for clients to browse.
//    Returns only useful public fields.
router.get('/public', async (req, res) => {
  try {
    const profs = await Professionnel.find().populate('userId', 'nom email');
    const lite = profs.map(p => ({
      _id: p._id,
      userId: p.userId?._id,
      nom: p.userId?.nom,
      email: p.userId?.email,
      specialite: p.specialite
    }));
    res.status(200).send(lite);
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

// ✅ PRO — ADD a day window (date + start/end)
router.post('/:userId/disponibilites', verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.userId !== userId) return res.status(403).send({ message: 'Accès refusé' });

    const { date, heure_debut, heure_fin } = req.body; // "YYYY-MM-DD", "HH:mm", "HH:mm"
    if (!date || !heure_debut || !heure_fin) {
      return res.status(400).send({ message: 'date, heure_debut, heure_fin requis' });
    }

    const pro = await Professionnel.findOne({ userId });
    if (!pro) return res.status(404).send({ message: 'Professionnel non trouvé' });

    pro.disponibilites.push({ date: new Date(date), heure_debut, heure_fin });
    await pro.save();

    res.status(201).send({ message: 'Disponibilité ajoutée', disponibilites: pro.disponibilites });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

// ✅ PRO/CLIENT — GET available slots per day, computed from disponibilites minus booked RDVs.
//    Optional range: ?from=YYYY-MM-DD&to=YYYY-MM-DD&step=30
router.get('/:userId/disponibilites', async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to, step = '30' } = req.query;
    const stepMin = parseInt(step, 10) || 30;

    const pro = await Professionnel.findOne({ userId });
    if (!pro) return res.status(404).send({ message: 'Professionnel non trouvé' });

    // Filter windows by optional range
    const windows = pro.disponibilites.filter(w => {
      const d = new Date(w.date);
      return (!from || d >= new Date(from)) && (!to || d <= new Date(to));
    });

    // Fetch existing RDVs (non-annulés) in that range
    const q = { professionnel_id: pro._id, statut: { $ne: 'Annulé' } };
    if (from || to) {
      q.date = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to   ? { $lte: new Date(to) }   : {})
      };
    }
    const rdvs = await RendezVous.find(q);

    // Build "booked map": { 'YYYY-MM-DD' -> Set('HH:mm'...) }
    const booked = new Map();
    for (const r of rdvs) {
      const day = new Date(r.date).toISOString().substring(0,10);
      if (!booked.has(day)) booked.set(day, new Set());
      booked.get(day).add(r.heure);
    }

    // Produce list of free slots per window
    const result = windows.map(w => {
      const day = new Date(w.date).toISOString().substring(0,10);
      const slots = buildSlots(w.heure_debut, w.heure_fin, stepMin);
      const busy = booked.get(day) || new Set();
      const free = slots.filter(s => !busy.has(s));
      return { date: day, heure_debut: w.heure_debut, heure_fin: w.heure_fin, step: stepMin, freeSlots: free };
    });

    res.status(200).send(result);
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

// ✅ PRO — DELETE a window by exact match (date + start + end)
router.delete('/:userId/disponibilites', verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.userId !== userId) return res.status(403).send({ message: 'Accès refusé' });

    const { date, heure_debut, heure_fin } = req.body;
    if (!date || !heure_debut || !heure_fin) {
      return res.status(400).send({ message: 'date, heure_debut, heure_fin requis' });
    }

    const pro = await Professionnel.findOne({ userId });
    if (!pro) return res.status(404).send({ message: 'Professionnel non trouvé' });

    const before = pro.disponibilites.length;
    pro.disponibilites = pro.disponibilites.filter(w => {
      const sameDay = new Date(w.date).toISOString().substring(0,10) === date;
      return !(sameDay && w.heure_debut === heure_debut && w.heure_fin === heure_fin);
    });
    await pro.save();

    res.status(200).send({ message: `Fenêtre(s) supprimée(s): ${before - pro.disponibilites.length}` });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

module.exports = router;
