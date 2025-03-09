const express = require('express');
const User = require('../models/user');
const bcryptjs = require('bcryptjs');

const router = express.Router();

// Create a user
router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd, role = 'CLIENT' } = req.body;

    // Basic validation (you can extend this further)
    if (!nom || !email || !pwd) {
      return res.status(400).send({ message: "All fields (nom, email, pwd) are required." });
    }

    // Ensure role is valid
    if (!['ADMIN', 'PROFESSIONNEL', 'CLIENT'].includes(role)) {
      return res.status(400).send({ message: "Invalid role. Choose from 'ADMIN', 'PROFESSIONNEL', or 'CLIENT'." });
    }

    // Create a new user
    const user = new User({ nom, email, pwd, role });
    await user.save();

    res.status(201).send({ message: "User saved successfully", user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get all users
router.get('/all', async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get a user by name
router.get('/:name', async (req, res) => {
  try {
    const user = await User.findOne({ nom: req.params.name }); // Find by 'nom'
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Update a user by email
router.put('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body; // Collect the updates from the body

    // Basic validation for email update (only allow updating non-sensitive fields)
    if (!updates.nom && !updates.pwd && !updates.role) {
      return res.status(400).send({ message: "Please provide at least one field to update." });
    }

    // Ensure role is valid
    if (updates.role && !['ADMIN', 'PROFESSIONNEL', 'CLIENT'].includes(updates.role)) {
      return res.status(400).send({ message: "Invalid role. Choose from 'ADMIN', 'PROFESSIONNEL', or 'CLIENT'." });
    }

    // Hash password if it’s modified
    if (updates.pwd) {
      updates.pwd = await bcryptjs.hash(updates.pwd, 10);
    }

    const user = await User.findOneAndUpdate({ email }, updates, { new: true });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Delete a user by email
router.delete('/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email }); // Check if user exists
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    await User.deleteOne({ email }); // Delete user by email
    res.status(200).send({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
