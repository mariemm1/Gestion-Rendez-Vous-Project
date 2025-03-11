const mongoose = require("mongoose");

const rendezVousSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  heure: { type: String, required: true },
  statut: { type: String, enum: ["Confirmé", "Annulé", "En attente"], default: "En attente" },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  professionnel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Professionnel", required: true }
});
rendezVousSchema.methods.confirmerRendezVous = async function() {
  if (this.statut === "En attente") {
    this.statut = "Confirmé";
    await this.save();
  }
};

module.exports = mongoose.model("RendezVous", rendezVousSchema);
