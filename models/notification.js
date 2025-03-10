const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  utilisateur_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  role: { type: String, enum: ["CLIENT", "PROFESSIONNEL"], required: true }, // Ajout du rôle
  type: { type: String, enum: ["Rendez-vous", "Annulation", "Rappel"], required: true },
  message: { type: String, required: true },
  lue: { type: Boolean, default: false },
  dateEnvoi: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
