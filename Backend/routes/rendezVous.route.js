// Backend/routes/rendezVous.route.js
const express = require('express');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const RendezVous = require('../models/rendezVous');
const Client = require('../models/client');
const Professionnel = require('../models/professionnel');
const Notification = require('../models/notification');

const verifyToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');

const router = express.Router();

/**
 * POST /rendezVous/prendre/:clientId
 * Client prend un rendez-vous → notifie le professionnel
 */
router.post(
  '/prendre/:clientId',
  verifyToken,
  authorizeRoles('CLIENT'),
  async (req, res) => {
    try {
      const { date, heure, professionnel_id } = req.body; // professionnel_id = Utilisateur._id du pro
      const { clientId } = req.params;

      // 0) Sécurité: vérifier client ↔ token
      const client = await Client.findById(clientId);
      if (!client) return res.status(404).send({ message: 'Client non trouvé' });
      if (req.user.userId !== client.userId.toString()) {
        return res.status(403).send({ message: 'Accès refusé.' });
      }

      // 1) Pro par userId
      const professionnel = await Professionnel.findOne({ userId: professionnel_id });
      if (!professionnel) return res.status(404).send({ message: 'Professionnel non trouvé' });

      // 2) Normaliser la date [00:00]
      const picked = new Date(date); // "YYYY-MM-DD"
      const dayStart = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate());
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

      // 3) Pro a des dispos ce jour ?
      const proWithDay = await Professionnel.findOne({
        _id: professionnel._id,
        'disponibilites.date': { $gte: dayStart, $lt: dayEnd },
      });
      if (!proWithDay) return res.status(400).send({ message: 'Pas de disponibilité ce jour.' });

      // 4) Heure dans une fenêtre ?
      const windowsThisDay = proWithDay.disponibilites.filter(w => {
        const d = new Date(w.date);
        return d >= dayStart && d < dayEnd;
      });
      const inside = windowsThisDay.some(w => heure >= w.heure_debut && heure < w.heure_fin);
      if (!inside) return res.status(400).send({ message: 'Heure hors créneau.' });

      // 5) Créneau libre ?
      const clash = await RendezVous.findOne({
        professionnel_id: professionnel._id,
        date: { $gte: dayStart, $lt: dayEnd },
        heure,
        statut: { $ne: 'Annulé' },
      });
      if (clash) return res.status(400).send({ message: 'Créneau déjà réservé.' });

      // 6) Créer RDV
      const newRendezVous = new RendezVous({
        date: dayStart,
        heure,
        client_id: client._id,
        professionnel_id: professionnel._id,
        statut: 'En attente',
      });
      await newRendezVous.save();

      // 7) Ajouter à l'historique du client
      client.historiqueRendezVous.push(newRendezVous._id);
      await client.save();

      // 8) Notifier le pro (avec lien RDV => rendezvous_id)
      const msgDate = DateTime.fromJSDate(dayStart).toFormat('yyyy-LL-dd');
      await new Notification({
        type: 'Rendez-vous',
        role: 'PROFESSIONNEL',
        message: `Un client a pris un rendez-vous le ${msgDate} à ${heure}.`,
        utilisateur_id: professionnel.userId,  // Utilisateur du pro
        rendezvous_id: newRendezVous._id,      // 🔗 lien RDV
      }).save();

      return res.status(201).json({
        message: 'Rendez-vous pris avec succès.',
        rendezvous: newRendezVous,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: error.message });
    }
  }
);

/**
 * PUT /rendezVous/annuler/:clientUserId/:rendezvousId
 * Client annule → notifie le professionnel
 */
router.put(
  '/annuler/:clientUserId/:rendezvousId',
  verifyToken,
  authorizeRoles('CLIENT'),
  async (req, res) => {
    try {
      const { clientUserId, rendezvousId } = req.params;

      if (req.user.userId !== clientUserId) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      const rendezvous = await RendezVous.findById(rendezvousId);
      if (!rendezvous) return res.status(404).json({ message: 'Rendez-vous non trouvé' });

      const client = await Client.findOne({ userId: clientUserId });
      if (!client) return res.status(404).json({ message: 'Client non trouvé' });
      if (!rendezvous.client_id.equals(client._id)) {
        return res.status(403).json({ message: 'Non autorisé' });
      }

      rendezvous.statut = 'Annulé';
      await rendezvous.save();

      // Notifier le pro
      const pro = await Professionnel.findById(rendezvous.professionnel_id).select('userId');
      if (pro) {
        const d = DateTime.fromJSDate(rendezvous.date).toFormat('yyyy-LL-dd');
        await new Notification({
          type: 'Annulation',
          role: 'PROFESSIONNEL',
          message: `Le client a annulé le rendez-vous du ${d} à ${rendezvous.heure}.`,
          utilisateur_id: pro.userId,
          rendezvous_id: rendezvous._id,
        }).save();
      }

      res.status(200).json({ message: 'Rendez-vous annulé avec succès' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * DELETE /rendezVous/annuler/:clientUserId/:rendezvousId
 * Client supprime un RDV déjà annulé
 */
router.delete(
  '/annuler/:clientUserId/:rendezvousId',
  verifyToken,
  authorizeRoles('CLIENT'),
  async (req, res) => {
    try {
      const { clientUserId, rendezvousId } = req.params;

      if (req.user.userId !== clientUserId) {
        return res.status(403).send({ message: 'Accès refusé' });
      }

      const rendezvous = await RendezVous.findById(rendezvousId);
      if (!rendezvous) return res.status(404).send({ message: 'Rendez-vous introuvable' });

      const client = await Client.findOne({ userId: clientUserId });
      if (!client) return res.status(404).send({ message: 'Client non trouvé' });
      if (!rendezvous.client_id.equals(client._id)) {
        return res.status(403).send({ message: 'Non autorisé' });
      }

      if (rendezvous.statut !== 'Annulé') {
        return res.status(400).send({ message: 'Seuls les rendez-vous annulés peuvent être supprimés' });
      }

      client.historiqueRendezVous = client.historiqueRendezVous.filter(
        id => id.toString() !== rendezvousId
      );
      await client.save();

      await RendezVous.findByIdAndDelete(rendezvousId);
      res.status(200).send({ message: 'Rendez-vous supprimé avec succès' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: error.message });
    }
  }
);

/**
 * GET /rendezVous/client/:clientUserId
 * Liste RDVs du client connecté
 */
router.get(
  '/client/:clientUserId',
  verifyToken,
  authorizeRoles('CLIENT'),
  async (req, res) => {
    try {
      const { clientUserId } = req.params;
      if (req.user.userId !== clientUserId) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      const client = await Client.findOne({ userId: clientUserId });
      if (!client) return res.status(404).json({ message: 'Client non trouvé' });

      const rendezvousList = await RendezVous.find({ client_id: client._id })
        .populate('professionnel_id')
        .lean();

      res.status(200).json(rendezvousList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /rendezVous/professionnel/:userId
 * Tous les RDVs du pro
 */
router.get(
  '/professionnel/:userId',
  verifyToken,
  authorizeRoles('PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).send({ message: 'Professionnel non trouvé' });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id })
        .populate({ path: 'client_id', populate: { path: 'userId', select: 'nom email' } })
        .sort({ date: 1, heure: 1 })
        .lean();

      res.status(200).send(rdvs);
    } catch (e) {
      res.status(500).send({ message: e.message });
    }
  }
);

/** GET /rendezVous/professionnel/:userId/en-attente */
router.get(
  '/professionnel/:userId/en-attente',
  verifyToken,
  authorizeRoles('PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.userId !== userId) return res.status(403).json({ message: 'Accès refusé' });

      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).json({ message: 'Professionnel non trouvé' });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id, statut: 'En attente' })
        .populate({ path: 'client_id', populate: { path: 'userId', select: 'nom email' } })
        .sort({ date: 1, heure: 1 })
        .lean();

      res.status(200).json(rdvs);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

/** GET /rendezVous/professionnel/:userId/confirme */
router.get(
  '/professionnel/:userId/confirme',
  verifyToken,
  authorizeRoles('PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.userId !== userId) return res.status(403).json({ message: 'Accès refusé' });

      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).json({ message: 'Professionnel non trouvé' });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id, statut: 'Confirmé' })
        .populate({ path: 'client_id', populate: { path: 'userId', select: 'nom email' } })
        .sort({ date: 1, heure: 1 })
        .lean();

      res.status(200).json(rdvs);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

/**
 * PUT /rendezVous/confirmer/:userId/:rendezvousId
 * Pro confirme → notifie client + auto-read pro's booking notif
 */
router.put(
  '/confirmer/:userId/:rendezvousId',
  verifyToken,
  authorizeRoles('PROFESSIONNEL'),
  async (req, res) => {
    try {
      const { userId, rendezvousId } = req.params;

      if (req.user.userId !== userId) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      const professionnel = await Professionnel.findOne({ userId });
      if (!professionnel) return res.status(404).json({ message: 'Professionnel non trouvé' });

      const rendezvous = await RendezVous.findById(rendezvousId)
        .populate({ path: 'client_id', select: 'userId' });
      if (!rendezvous) return res.status(404).json({ message: 'Rendez-vous non trouvé' });
      if (!rendezvous.professionnel_id.equals(professionnel._id)) {
        return res.status(403).json({ message: 'Ce rendez-vous ne vous appartient pas' });
      }

      rendezvous.statut = 'Confirmé';
      await rendezvous.save();

      // ✅ Auto-mark pro's “Rendez-vous” notif for THIS RDV as read
      await Notification.updateMany(
        {
          utilisateur_id: professionnel.userId,
          role: 'PROFESSIONNEL',
          type: 'Rendez-vous',
          rendezvous_id: rendezvous._id,
          lue: false,
        },
        { $set: { lue: true } }
      );

      // Notify the client
      const d = DateTime.fromJSDate(rendezvous.date).toFormat('yyyy-LL-dd');
      await new Notification({
        type: 'Confirmation',
        role: 'CLIENT',
        message: `Votre rendez-vous du ${d} à ${rendezvous.heure} a été confirmé.`,
        utilisateur_id: rendezvous.client_id.userId,
        rendezvous_id: rendezvous._id,
      }).save();

      res.status(200).json({ message: 'Rendez-vous confirmé avec succès', rendezvous });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
