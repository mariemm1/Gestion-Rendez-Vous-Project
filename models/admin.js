const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
