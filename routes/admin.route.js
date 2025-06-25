const express = require("express");
const bcryptjs = require("bcryptjs");
const router = express.Router();

const Admin = require("../models/admin");
const User = require("../models/user");

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

// CREATE: Create a new admin
// Only users with ADMIN role can create new admins
router.post("/create", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const { nom, email, pwd } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Cet email est déjà utilisé." });
    }

    const hashedPwd = await bcryptjs.hash(pwd, 10);

    // Création du user
    const user = new User({ nom, email, pwd: hashedPwd, role: "ADMIN" });
    await user.save();

    // Création de l'admin
    const newAdmin = new Admin({ userId: user._id, historiqueRendezVous: [] });
    await newAdmin.save();

    res.status(201).send({ message: "Admin créé avec succès", admin: newAdmin });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur", error: error.message });
  }
});

// READ: Get all Admins
// Only ADMIN users can list all admins
router.get("/all", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const admins = await Admin.find().populate("userId");
    res.status(200).send(admins);
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur", error: error.message });
  }
});

// READ: Get a specific Admin by name
// ADMIN users can access any, others forbidden
router.get("/:nom", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    const admin = await Admin.findOne({ userId: user._id }).populate("userId");
    if (!admin) {
      return res.status(404).send({ message: "Admin non trouvé" });
    }

    res.status(200).send(admin);
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur", error: error.message });
  }
});

// UPDATE: Update an Admin by email
// Only ADMIN can update admins
router.put("/:email", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    const admin = await Admin.findOne({ userId: user._id }).populate("userId");
    if (!admin) {
      return res.status(404).send({ message: "Admin non trouvé" });
    }

    const { nom, email, pwd } = req.body;

    // Mise à jour des informations
    if (nom) user.nom = nom;
    if (email) user.email = email;
    if (pwd) user.pwd = await bcryptjs.hash(pwd, 10);

    await user.save();
    await admin.save();

    res.status(200).send({ message: "Admin mis à jour avec succès", admin });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur", error: error.message });
  }
});

// DELETE: Delete an Admin by userId
// Only ADMIN can delete admins
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: req.params.id });
    if (!admin) {
      return res.status(404).send({ message: "Admin non trouvé" });
    }

    // Suppression de l'Admin et de l'Utilisateur associé
    await Admin.findByIdAndDelete(admin._id);
    await User.findByIdAndDelete(req.params.id);

    res.status(200).send({ message: "Admin et utilisateur associés supprimés avec succès" });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;
