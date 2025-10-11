const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  historiqueRendezVous: [{ type: mongoose.Schema.Types.ObjectId, ref: "RendezVous" }],
}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);
