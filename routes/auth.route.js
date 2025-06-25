const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/user");
const Admin = require("../models/admin");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { nom, email, pwd, role = "CLIENT", specialite } = req.body;

    // Validate required fields
    if (!nom || !email || !pwd)
      return res.status(400).send({ message: "All fields are required." });

    // Validate role
    if (!["ADMIN", "CLIENT", "PROFESSIONNEL"].includes(role))
      return res.status(400).send({ message: "Invalid role." });

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).send({ message: "Email already exists." });

    // Create user (password hashing handled by model pre-save hook)
    const user = new User({ nom, email, pwd, role });
    await user.save();

    // Create role-specific document
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

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).send({ message: "User not found" });

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).send({ message: "Invalid credentials" });

    // Create JWT token
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

module.exports = router;
