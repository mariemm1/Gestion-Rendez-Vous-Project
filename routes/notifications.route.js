const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");

// Ajouter une notification
router.post("/add", async (req, res) => {
  try {
    const { utilisateur_id, role, type, message } = req.body;

    // Vérification des données requises
    if (!utilisateur_id || !role || !type || !message) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    // Vérification du rôle valide
    const rolesAutorises = ["CLIENT", "PROFESSIONNEL"];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    // Vérification du type de notification valide
    const typesAutorises = ["Rendez-vous", "Annulation", "Rappel"];
    if (!typesAutorises.includes(type)) {
      return res.status(400).json({ message: "Type de notification invalide" });
    }

    const nouvelleNotification = new Notification({
      utilisateur_id,
      role,
      type,
      message,
      lue: false,
      dateEnvoi: new Date(),
    });

    await nouvelleNotification.save();
    res.status(201).json({ message: "Notification ajoutée avec succès", notification: nouvelleNotification });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});

// Récupérer toutes les notifications d'un utilisateur
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ utilisateur_id: userId }).sort({ dateEnvoi: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});

// Marquer une notification comme lue
router.put("/lire/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification non trouvée" });

    notification.lue = true;
    await notification.save();

    res.status(200).json({ message: "Notification marquée comme lue" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});

// Supprimer une notification
router.delete("/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) return res.status(404).json({ message: "Notification non trouvée" });

    res.status(200).json({ message: "Notification supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});

module.exports = router;
