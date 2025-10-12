const express = require("express");
const bcryptjs = require("bcryptjs");
const Professionnel = require("../models/professionnel");
const User = require("../models/user");
const RendezVous = require("../models/rendezVous");

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const { buildSlots } = require("./time");

const router = express.Router();

/**
 * IMPORTANT ROUTING NOTE
 * ----------------------
 * Put the concrete/static routes BEFORE param routes (/:something).
 * Otherwise '/:nom' will catch '/public' and '/:userId/disponibilites'.
 *
 * We also provide /by-nom/:nom and /by-email/:email to avoid any ambiguity.
 */

/* ===========================
 * PUBLIC: list professionals
 * =========================== */
router.get("/public", async (req, res) => {
  try {
    const profs = await Professionnel.find().populate("userId", "nom email");
    const lite = profs.map((p) => ({
      _id: p._id,
      userId: p.userId?._id,
      nom: p.userId?.nom,
      email: p.userId?.email,
      specialite: p.specialite,
    }));
    res.status(200).send(lite);
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

/* ==========================================================
 * PUBLIC: disponibilités d’un pro (par userId) + booked info
 * GET /prof/public/:userId/disponibilites?date=YYYY-MM-DD
 * ========================================================== */
router.get("/public/:userId/disponibilites", async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ message: "Paramètre date requis (YYYY-MM-DD)" });
    }

    const pro = await Professionnel.findOne({ userId });
    if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });

    const d = new Date(date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const wins = (pro.disponibilites || []).filter((w) => {
      const wd = new Date(w.date);
      return wd >= dayStart && wd < dayEnd;
    });

    const taken = await RendezVous.find({
      professionnel_id: pro._id,
      date: { $gte: dayStart, $lt: dayEnd },
      statut: { $ne: "Annulé" },
    }).select("heure");

    const takenSet = new Set(taken.map((r) => r.heure));

    res.json({
      date,
      windows: wins.map((w) => ({
        _id: w._id,
        heure_debut: w.heure_debut,
        heure_fin: w.heure_fin,
      })),
      hoursTaken: Array.from(takenSet),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* =====================================================
 * PROFESSIONNEL (connecté): gérer mes disponibilités
 * POST/GET/DELETE /prof/me/disponibilites
 * ===================================================== */
router.post(
  "/me/disponibilites",
  verifyToken,
  authorizeRoles("PROFESSIONNEL"),
  async (req, res) => {
    try {
      const { windows } = req.body; // [{ date, heure_debut, heure_fin }, ...]
      if (!Array.isArray(windows) || windows.length === 0) {
        return res.status(400).json({ message: "Liste de disponibilités vide." });
      }

      const pro = await Professionnel.findOne({ userId: req.user.userId });
      if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });

      for (const w of windows) {
        if (!w.date || !w.heure_debut || !w.heure_fin) continue;
        pro.disponibilites.push({
          date: new Date(w.date),
          heure_debut: w.heure_debut,
          heure_fin: w.heure_fin,
        });
      }
      await pro.save();

      res
        .status(201)
        .json({ message: "Disponibilités ajoutées", disponibilites: pro.disponibilites });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.get(
  "/me/disponibilites",
  verifyToken,
  authorizeRoles("PROFESSIONNEL"),
  async (req, res) => {
    try {
      const pro = await Professionnel.findOne({ userId: req.user.userId });
      if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });
      res.json(pro.disponibilites || []);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.delete(
  "/me/disponibilites/:dispoId",
  verifyToken,
  authorizeRoles("PROFESSIONNEL"),
  async (req, res) => {
    try {
      const pro = await Professionnel.findOne({ userId: req.user.userId });
      if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });

      const before = pro.disponibilites.length;
      pro.disponibilites = pro.disponibilites.filter(
        (d) => d._id.toString() !== req.params.dispoId
      );
      if (pro.disponibilites.length === before) {
        return res.status(404).json({ message: "Disponibilité introuvable" });
      }
      await pro.save();
      res.json({ message: "Disponibilité supprimée" });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

/* =======================================================================
 * ANYONE: slots calculés (fenêtres - RDV) sur une plage et un pas (min)
 * GET /prof/:userId/disponibilites?from=YYYY-MM-DD&to=YYYY-MM-DD&step=30
 * NOTE: placé AVANT les routes paramétriques /by-nom/:nom, etc.
 * ======================================================================= */
router.get("/:userId/disponibilites", async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to, step = "30" } = req.query;
    const stepMin = parseInt(step, 10) || 30;

    const pro = await Professionnel.findOne({ userId });
    if (!pro) return res.status(404).send({ message: "Professionnel non trouvé" });

    const windows = pro.disponibilites.filter((w) => {
      const d = new Date(w.date);
      return (!from || d >= new Date(from)) && (!to || d <= new Date(to));
    });

    const q = { professionnel_id: pro._id, statut: { $ne: "Annulé" } };
    if (from || to) {
      q.date = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const rdvs = await RendezVous.find(q);

    const booked = new Map(); // day -> Set(HH:mm)
    for (const r of rdvs) {
      const day = new Date(r.date).toISOString().substring(0, 10);
      if (!booked.has(day)) booked.set(day, new Set());
      booked.get(day).add(r.heure);
    }

    const result = windows.map((w) => {
      const day = new Date(w.date).toISOString().substring(0, 10);
      const slots = buildSlots(w.heure_debut, w.heure_fin, stepMin);
      const busy = booked.get(day) || new Set();
      const free = slots.filter((s) => !busy.has(s));
      return {
        date: day,
        heure_debut: w.heure_debut,
        heure_fin: w.heure_fin,
        step: stepMin,
        freeSlots: free,
      };
    });

    res.status(200).send(result);
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

/* ======================================================
 * ADMIN: create professional
 * ====================================================== */
router.post("/create", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const { nom, email, pwd, specialite, disponibilites } = req.body;

    if (!nom || !email || !pwd || !specialite) {
      return res
        .status(400)
        .send({ message: "Tous les champs sont obligatoires (nom, email, pwd, specialite)." });
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
      disponibilites: disponibilites || [],
    });

    await newProfessionnel.save();

    res.status(201).send({ message: "Professionnel ajouté avec succès", professionnel: newProfessionnel });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ======================================================
 * ADMIN: list all pros
 * ====================================================== */
router.get("/all", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const profs = await Professionnel.find().populate("userId");
    res.status(200).send(profs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ======================================================
 * ADMIN or OWNER: get by name — use a non-ambiguous path
 * ====================================================== */
router.get("/by-nom/:nom", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (req.user.role !== "ADMIN" && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId: user._id }).populate("userId");
    if (!professionnel) {
      return res.status(404).send({ message: "Professionnel not found" });
    }

    res.status(200).send(professionnel);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/* ======================================================
 * ADMIN or OWNER: update by email — non-ambiguous path
 * ====================================================== */
router.put("/by-email/:email", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (req.user.role !== "ADMIN" && req.user.userId !== user._id.toString()) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId: user._id }).populate("userId");
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

/* ======================================================
 * ADMIN: delete by userId (unchanged)
 * ====================================================== */
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const professionnel = await Professionnel.findOne({ userId: req.params.id });
    if (!professionnel) {
      return res.status(404).send({ message: "Professionnel not found" });
    }

    await Professionnel.findByIdAndDelete(professionnel._id);
    await User.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .send({ message: "Professionnel and associated user deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
