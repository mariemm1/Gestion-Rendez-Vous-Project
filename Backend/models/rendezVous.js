// /models/rendezVous.js
const mongoose = require("mongoose");

const rendezVousSchema = new mongoose.Schema({
  date: { type: Date, required: true },     // day bucket
  heure: {
    type: String,
    required: true,
    validate: {
      validator: (v) => /^\d{2}:\d{2}$/.test(v),
      message: "Heure doit être au format HH:mm",
    },
  },
  statut: { type: String, enum: ["Confirmé", "Annulé", "En attente"], default: "En attente" },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  professionnel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Professionnel", required: true }
});

// Optional helper
rendezVousSchema.methods.confirmerRendezVous = async function() {
  if (this.statut === "En attente") {
    this.statut = "Confirmé";
    await this.save();
  }
};

// Helpful indexes
rendezVousSchema.index({ professionnel_id: 1, date: 1, heure: 1 }); 
// If you want to strictly prevent double booking at DB level, use:
// rendezVousSchema.index({ professionnel_id: 1, date: 1, heure: 1 }, { unique: true });

module.exports = mongoose.model("RendezVous", rendezVousSchema);
