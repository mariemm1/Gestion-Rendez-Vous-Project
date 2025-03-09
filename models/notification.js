const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["Réservation", "Annulation", "Modification", "Rappel", "Confirmation", "Rendez-vous proche"], 
    required: true 
  },
  message: { type: String, required: true },
  dateEnvoi: { type: Date, default: Date.now },
  utilisateur_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true }, // Linked to User
  envoyePar_admin: { type: Boolean, default: false },
});

module.exports = mongoose.model("Notification", notificationSchema);
