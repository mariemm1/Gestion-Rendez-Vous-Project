// Backend/routes/notification.route.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const verifyToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

// Create (client or pro can create for themselves if ever needed)
router.post(
  '/add',
  verifyToken,
  authorizeRoles('CLIENT', 'PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { utilisateur_id, role, type, message, rendezvous_id } = req.body;

      if (!utilisateur_id || !role || !type || !message) {
        return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
      }
      if (req.user.userId !== utilisateur_id) {
        return res.status(403).json({ message: 'Accès refusé : utilisateur non autorisé' });
      }
      if (req.user.role !== role) {
        return res.status(403).json({ message: 'Accès refusé : rôle invalide' });
      }

      const notif = new Notification({
        utilisateur_id,
        role,
        type,
        message,
        rendezvous_id: rendezvous_id || null,
        lue: false,
      });

      await notif.save();
      res.status(201).json({ message: 'Notification ajoutée avec succès', notification: notif });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
    }
  }
);

// List all notifications for the connected user
router.get(
  '/:userId',
  verifyToken,
  authorizeRoles('CLIENT', 'PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.userId !== userId) return res.status(403).json({ message: 'Accès refusé' });

      const notifications = await Notification.find({ utilisateur_id: userId })
        .sort({ dateEnvoi: -1 })
        .lean();

      res.status(200).json(notifications);
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
    }
  }
);

// Mark one as read
router.put(
  '/lire/:notificationId',
  verifyToken,
  authorizeRoles('CLIENT', 'PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const n = await Notification.findById(notificationId);
      if (!n) return res.status(404).json({ message: 'Notification non trouvée' });
      if (req.user.userId !== n.utilisateur_id.toString())
        return res.status(403).json({ message: 'Accès refusé : utilisateur non propriétaire' });

      n.lue = true;
      await n.save();
      res.status(200).json({ message: 'Notification marquée comme lue' });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
    }
  }
);

// Delete
router.delete(
  '/:notificationId',
  verifyToken,
  authorizeRoles('CLIENT', 'PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const n = await Notification.findById(notificationId);
      if (!n) return res.status(404).json({ message: 'Notification non trouvée' });
      if (req.user.userId !== n.utilisateur_id.toString())
        return res.status(403).json({ message: 'Accès refusé' });

      await Notification.findByIdAndDelete(notificationId);
      res.status(200).json({ message: 'Notification supprimée avec succès' });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
    }
  }
);

module.exports = router;
