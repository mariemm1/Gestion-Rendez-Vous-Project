// Backend/routes/auth.route.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const bcryptjs = require('bcryptjs');
const User = require("../models/user");
const Admin = require("../models/admin");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const verifyToken = require("../middleware/auth"); // must set req.user = { userId, role }

// -------- REGISTER (unchanged) --------
router.post("/register", async (req, res) => {
  try {
    const { nom, email, pwd, role = "CLIENT", specialite } = req.body;
    if (!nom || !email || !pwd)
      return res.status(400).send({ message: "All fields are required." });
    if (!["ADMIN", "CLIENT", "PROFESSIONNEL"].includes(role))
      return res.status(400).send({ message: "Invalid role." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).send({ message: "Email already exists." });

    // pwd is hashed in user model pre-save hook
    const user = new User({ nom, email, pwd, role });
    await user.save();

    if (role === "CLIENT") {
      await new Client({ userId: user._id }).save();
    } else if (role === "ADMIN") {
      await new Admin({ userId: user._id }).save();
    } else if (role === "PROFESSIONNEL") {
      if (!specialite)
        return res
          .status(400)
          .send({ message: "Specialité required for professionnel." });
      await new Professionnel({ userId: user._id, specialite }).save();
    }

    res.status(201).send({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// -------- LOGIN (unchanged) --------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).send({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    // You can optionally also return minimal user info for immediate UI
    res.status(200).send({ message: "Login successful", token });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// -------- ME (UPDATED: include avatarUrl + linked role ids) --------
router.get("/me", verifyToken, async (req, res) => {
  try {
    // 1) Load the base user (now includes avatarUrl)
    const u = await User.findById(req.user.userId)
      .select("_id nom email role avatarUrl createdAt updatedAt");
    if (!u) return res.status(404).send({ message: "User not found" });

    // 2) Optionally add a role-specific id for convenience
    const payload = u.toObject();
    if (u.role === "CLIENT") {
      const c = await Client.findOne({ userId: u._id }).select("_id");
      payload.clientId = c?._id || null;
    } else if (u.role === "PROFESSIONNEL") {
      const p = await Professionnel.findOne({ userId: u._id }).select("_id specialite");
      payload.proId = p?._id || null;
      payload.specialite = p?.specialite || undefined; // handy in UI
    } else if (u.role === "ADMIN") {
      const a = await Admin.findOne({ userId: u._id }).select("_id");
      payload.adminId = a?._id || null;
    }

    res.status(200).send(payload);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});



// PUT /auth/me  (auth required)  — update name/email/password
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { nom, email, password } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (nom)   user.nom = nom;
    if (email) user.email = email;
    if (password && password.length >= 6) user.pwd = password; // hashed by pre('save')

    await user.save();
    const safe = { _id: user._id, nom: user.nom, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
    res.json({ message: "Updated", user: safe });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
