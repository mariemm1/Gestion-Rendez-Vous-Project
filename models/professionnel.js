const mongoose = require("mongoose");

const professionnelSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  specialite: { type: String, required: true },
  disponibilites: [{ date: Date, heure_debut: String, heure_fin: String }],
}, { timestamps: true });

module.exports = mongoose.model("Professionnel", professionnelSchema);
