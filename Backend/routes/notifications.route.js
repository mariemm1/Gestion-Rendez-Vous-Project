const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

// Add a notification (only CLIENT or PROFESSIONNEL can add their own notifications)
router.post(
  "/add",
  verifyToken,
  authorizeRoles("CLIENT", "PROFESSIONNEL"),
  async (req, res) => {
    try {
      const { utilisateur_id, role, type, message } = req.body;

      // Validate required fields
      if (!utilisateur_id || !role || !type || !message) {
        return res
          .status(400)
          .json({ message: "Tous les champs sont obligatoires" });
      }

      // Check if token user matches utilisateur_id and role
      if (req.user.userId !== utilisateur_id) {
        return res
          .status(403)
          .json({ message: "Accès refusé : utilisateur non autorisé" });
      }
      if (req.user.role !== role) {
        return res.status(403).json({ message: "Accès refusé : rôle invalide" });
      }

      const rolesAutorises = ["CLIENT", "PROFESSIONNEL"];
      if (!rolesAutorises.includes(role)) {
        return res.status(400).json({ message: "Rôle invalide" });
      }

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
      res.status(201).json({
        message: "Notification ajoutée avec succès",
        notification: nouvelleNotification,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur", erreur: error.message });
    }
  }
);

// Get all notifications of a user (only the user can see their own notifications)
router.get("/:userId", verifyToken, authorizeRoles("CLIENT", "PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow if user is requesting their own notifications
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const notifications = await Notification.find({ utilisateur_id: userId }).sort({
      dateEnvoi: -1,
    });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});

// Mark a notification as read (only owner CLIENT or PROFESSIONNEL)
router.put("/lire/:notificationId", verifyToken, authorizeRoles("CLIENT", "PROFESSIONNEL"), async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification non trouvée" });

    // Comparaison IDs avec toString()
    if (req.user.userId !== notification.utilisateur_id.toString()) {
      return res.status(403).json({ message: "Accès refusé : utilisateur non propriétaire" });
    }

    notification.lue = true;
    await notification.save();

    res.status(200).json({ message: "Notification marquée comme lue" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", erreur: error.message });
  }
});


// Delete a notification (only the owner can delete)
router.delete(
  "/:notificationId",
  verifyToken,
  authorizeRoles("CLIENT", "PROFESSIONNEL"),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await Notification.findById(notificationId);

      if (!notification)
        return res.status(404).json({ message: "Notification non trouvée" });

      // Only owner can delete
      if (req.user.userId !== notification.utilisateur_id.toString()) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      await Notification.findByIdAndDelete(notificationId);
      res.status(200).json({ message: "Notification supprimée avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur", erreur: error.message });
    }
  }
);

module.exports = router;
