const express = require('express');
const User = require('../models/user');
const Admin = require('../models/admin');
const Client = require('../models/client');
const Professionnel = require('../models/professionnel');
const bcryptjs = require('bcryptjs');
const jwt = require ('jsonwebtoken');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { nom, email, pwd, role = 'CLIENT', specialite } = req.body; // Include specialite

    // Basic validation
    if (!nom || !email || !pwd) {
      return res.status(400).send({ message: "All fields (nom, email, pwd) are required." });
    }

    // Ensure role is valid
    if (!['ADMIN', 'PROFESSIONNEL', 'CLIENT'].includes(role)) {
      return res.status(400).send({ message: "Invalid role. Choose from 'ADMIN', 'PROFESSIONNEL', or 'CLIENT'." });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email already in use. Please choose another one." });
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
      // Check if specialite is required and pass it
      if (!specialite) {
        return res.status(400).send({ message: "Specialite is required for PROFESSIONNEL." });
      }

      const professionnel = new Professionnel({ userId: user._id, specialite });
      await professionnel.save();
    }

    res.status(201).send({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/login', async(req,res)=>{
  try{
      const {email,password}=req.body
      const user = await User.findOne({email})
      if(!user){
          res.status(404).send({message:'user not found'})
      }
  const isHavePassword = user.comparePassword(password)
  if(!isHavePassword){
      res.status(400).send({message:'invalid credentiel'})
  }
  const token = await jwt.sign({userId:user._id},process.env.SECRET_KEY)
  res.send({message:'user logged in successfully', token})
  }catch (error){
      res.status(400).send({message : error.message})
  }
})

module.exports = router;
