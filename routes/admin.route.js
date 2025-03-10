const express = require("express");
const admin = express.Router('../models/admin');
const admin = require("../models/admin");
const bcryptjs = require('bcryptjs'); 
const router = express.Router();


// CREATE: Create a new admin 
router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd } = req.body;

    // Create the user with default role "ADMIN"
    const hashedPwd = await bcryptjs.hash(pwd, 10); // Hash the password
    const admin = new Admin({ nom, email, pwd: hashedPwd, role: "ADMIN" });

    await user.save(); 

    // Create the admin with the user reference
    const newAdmin = new Admin({ userId: user._id, historiqueRendezVous: historiqueRendezVous || [] });

    await newAdmin.save(); 

    res.status(201).send({ message: "Admin saved successfully", admin: newAdmin });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all Admins
router.get('/all', async (req, res) => {
  try {
    const admins = await Admin.find().populate('userId');
    res.status(200).send(admins);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get a specific Admin by name
// READ: Get a specific Admin by user name
router.get('/:nom', async (req, res) => {
    try {
      // Find the user by name
      const user = await User.findOne({ nom: req.params.nom });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      // Find the Admin using the user ID
      const client = await Client.findOne({ userId: user._id }).populate('userId');
      if (!client) {
        return res.status(404).send({ message: "Admin not found" });
      }
  
      res.status(200).send(client);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  

// UPDATE: Update a Admin by email
router.put('/:email', async (req, res) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email: req.params.email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      // Find the Admin associated with the user
      const Aamin = await Admin.findOne({ userId: user._id }).populate('userId');
      if (!admin) {
        return res.status(404).send({ message: "Admin not found" });
      }
  
      const { nom, email, pwd } = req.body;
  

  
      // Update user details
      if (nom) user.nom = nom;
      if (email) user.email = email;
  
      // Hash password if updated
      if (pwd) {
        user.pwd = await bcryptjs.hash(pwd, 10);
      }
  
      await user.save();
      await admin.save();
  
      res.status(200).send({ message: "Admin updated successfully", admin });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  
// DELETE: Delete Admin by userId
router.delete('/:id', async (req, res) => {
    try {
      // Find the Admin using userId instead of Admin _id
      const admin = await Admin.findOne({ userId: req.params.id });
      if (!admin) {
        return res.status(404).send({ message: "Admin not found" });
      }
  
      // Delete the Admin and associated user
      await Admin.findByIdAndDelete(admin._id);
      await User.findByIdAndDelete(req.params.id);
  
      res.status(200).send({ message: "Admin and associated user deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });





module.exports = router;