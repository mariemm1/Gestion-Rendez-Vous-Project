const express = require("express"); 
const mongoose = require('mongoose');
require("dotenv").config();

const app = express();

// Correction de la faute de frappe
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to the database');
  })
  .catch(err => {
    console.log('Error connecting to the database:', err);
  });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
