// /models/notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  utilisateur_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  role: { type: String, enum: ["CLIENT", "PROFESSIONNEL"], required: true },
  type: { type: String, enum: ["Rendez-vous", "Annulation", "Rappel", "Confirmation"], required: true },
  message: { type: String, required: true },
  lue: { type: Boolean, default: false },
  dateEnvoi: { type: Date, default: Date.now },
  // ✅ Link to a RDV so we can mark the exact notification as read on confirmation
  rendezvous_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RendezVous",
    required: false,
  },
},
  { timestamps: false }
);

// For fast "my notifications" queries
notificationSchema.index({ utilisateur_id: 1, dateEnvoi: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
