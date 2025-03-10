const express = require('express');
const Client = require('../models/client');
const User = require('../models/user');  // Import User model for reference
const bcryptjs = require('bcryptjs'); 
const router = express.Router();

// CREATE: Create a new client (first create a user and then create a client)
router.post('/create', async (req, res) => {
  try {
    const { nom, email, pwd, historiqueRendezVous } = req.body;

    // Create the user with default role "CLIENT"
    const hashedPwd = await bcryptjs.hash(pwd, 10); // Hash the password
    const user = new User({ nom, email, pwd: hashedPwd, role: "CLIENT" });

    await user.save(); // Save the user document

    // Create the client with the user reference
    const newClient = new Client({ userId: user._id, historiqueRendezVous: historiqueRendezVous || [] });

    await newClient.save(); // Save the client document

    res.status(201).send({ message: "Client saved successfully", client: newClient });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all clients
router.get('/all', async (req, res) => {
  try {
    const clients = await Client.find().populate('userId');
    res.status(200).send(clients);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// READ: Get all clients with their associated user and rendezvous history
router.get('/allH', async (req, res) => {
  try {
    const clients = await Client.find()
      .populate('userId') // Populate user details
      .populate('historiqueRendezVous'); // Populate rendezvous history

    res.status(200).send(clients);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});


// // READ: Get a specific client by name
// // READ: Get a specific client by user name
// router.get('/:nom', async (req, res) => {
//     try {
//       // Find the user by name
//       const user = await User.findOne({ nom: req.params.nom });
//       if (!user) {
//         return res.status(404).send({ message: "User not found" });
//       }
  
//       // Find the client using the user ID
//       const client = await Client.findOne({ userId: user._id }).populate('userId');
//       if (!client) {
//         return res.status(404).send({ message: "Client not found" });
//       }
  
//       res.status(200).send(client);
//     } catch (error) {
//       res.status(500).send({ message: error.message });
//     }
//   });

  // READ: Get a specific client by name with their rendezvous history
router.get('/:nom', async (req, res) => {
  try {
    // Find the user by name
    const user = await User.findOne({ nom: req.params.nom });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Find the client using the user ID and populate rendezvous history
    const client = await Client.findOne({ userId: user._id })
      .populate('userId')
      .populate('historiqueRendezVous');

    if (!client) {
      return res.status(404).send({ message: "Client not found" });
    }

    res.status(200).send(client);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

  

router.put('/:email', async (req, res) => {
  try {
    const { nom, email, pwd } = req.body;

    if (!nom && !email && !pwd) {
      return res.status(400).send({ message: "At least one field (nom, email, or pwd) is required for update." });
    }

    // Find the user by email
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Update user details
    if (nom) user.nom = nom;
    if (email) {
      // Check if email already exists
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).send({ message: "Email already in use" });
      }
      user.email = email;
    }

    // Hash password if updated
    if (pwd) {
      user.pwd = await bcryptjs.hash(pwd, 10);
    }

    await user.save();
    res.status(200).send({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "An error occurred while updating the client" });
  }
});

  
// DELETE: Delete a client by userId
router.delete('/:id', async (req, res) => {
    try {
      // Find the client using userId instead of client _id
      const client = await Client.findOne({ userId: req.params.id });
      if (!client) {
        return res.status(404).send({ message: "Client not found" });
      }
  
      // Delete the client and associated user
      await Client.findByIdAndDelete(client._id);
      await User.findByIdAndDelete(req.params.id);
  
      res.status(200).send({ message: "Client and associated user deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  

module.exports = router;
