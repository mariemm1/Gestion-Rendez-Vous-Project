// Backend/routes/auth.route.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/user");
const Admin = require("../models/admin");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const verifyToken = require("../middleware/auth"); // <-- IMPORTANT

// -------- REGISTER (yours unchanged) --------
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

    const user = new User({ nom, email, pwd, role }); // pwd hashed in pre-save
    await user.save();

    if (role === "CLIENT") {
      await new Client({ userId: user._id }).save();
    } else if (role === "ADMIN") {
      await new Admin({ userId: user._id }).save();
    } else if (role === "PROFESSIONNEL") {
      if (!specialite)
        return res.status(400).send({ message: "Specialité required for professionnel." });
      await new Professionnel({ userId: user._id, specialite }).save();
    }

    res.status(201).send({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// -------- LOGIN (yours unchanged) --------
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

    res.status(200).send({ message: "Login successful", token });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// -------- NEW: ME (lets the app know the user's name/email/role) --------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const u = await User.findById(req.user.userId)
      .select("_id nom email role createdAt updatedAt");
    if (!u) return res.status(404).send({ message: "User not found" });
    res.status(200).send(u);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
