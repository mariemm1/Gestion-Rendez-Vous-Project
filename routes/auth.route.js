const express = require('express');
const User = require('../models/user');
const Admin = require('../models/admin');
const Client = require('../models/client');
const Professionnel = require('../models/professionnel');
const bcryptjs = require('bcryptjs');

const router = express.Router();

// REGISTER: Create a new user with role specification
router.post('/register', async (req, res) => {
  try {
    const { nom, email, pwd, role = 'CLIENT' } = req.body; // Default role is CLIENT

    // Basic validation
    if (!nom || !email || !pwd) {
      return res.status(400).send({ message: "All fields (nom, email, pwd) are required." });
    }

    // Ensure role is valid
    if (!['ADMIN', 'PROFESSIONNEL', 'CLIENT'].includes(role)) {
      return res.status(400).send({ message: "Invalid role. Choose from 'ADMIN', 'PROFESSIONNEL', or 'CLIENT'." });
    }

    // Hash the password before saving
    const hashedPwd = await bcryptjs.hash(pwd, 10);

    // Create a new user
    const user = new User({ nom, email, pwd: hashedPwd, role });
    await user.save();

    // Create the corresponding model based on the role
    if (role === 'CLIENT') {
      const client = new Client({ userId: user._id });
      await client.save();
    } else if (role === 'ADMIN') {
      const admin = new Admin({ userId: user._id });
      await admin.save();
    } else if (role === 'PROFESSIONNEL') {
      const professionnel = new Professionnel({ userId: user._id });
      await professionnel.save();
    }

    res.status(201).send({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
