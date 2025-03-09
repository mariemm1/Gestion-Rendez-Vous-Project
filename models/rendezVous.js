const mongoose = require("mongoose");

const rendezVousSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  heure: { type: String, required: true },
  statut: { type: String, enum: ["Confirmé", "Annulé", "En attente"], default: "En attente" },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  professionnel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Professionnel", required: true },
  calendrier: [{ date: Date, heure_debut: String, heure_fin: String }], // Choosing from available slots
});

module.exports = mongoose.model("RendezVous", rendezVousSchema);
