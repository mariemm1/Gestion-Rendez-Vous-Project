const express = require("express");
const mongoose = require("mongoose");  // <-- Import mongoose ici
const RendezVous = require("../models/rendezVous");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const Notification = require("../models/notification");

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

const router = express.Router();

// ✅ Ajouter une notification lors de la prise de rendez-vous (client only)
//    + validations de créneau (pro dispo ce jour, heure dans fenêtre, pas déjà pris)
router.post("/prendre/:clientId", verifyToken, authorizeRoles("CLIENT"), async (req, res) => {
  try {
    const { date, heure, professionnel_id } = req.body; // professionnel_id = userId du professionnel
    const { clientId } = req.params;

    // 0) Sécurité: vérifier user = client
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).send({ message: "Client non trouvé" });
    if (req.user.userId !== client.userId.toString()) {
      return res.status(403).send({ message: "Accès refusé." });
    }

    // 1) Récup pro par userId (pas _id)
    const professionnel = await Professionnel.findOne({ userId: professionnel_id });
    if (!professionnel) return res.status(404).send({ message: "Professionnel non trouvé" });

    // 2) Normaliser la date du jour [00:00 -> 24:00[
    const picked = new Date(date); // "YYYY-MM-DD"
    const dayStart = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate());
    const dayEnd   = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    // 3) Le pro a-t-il des dispos ce jour ?
    const proWithDay = await Professionnel.findOne({
      _id: professionnel._id,
      'disponibilites.date': { $gte: dayStart, $lt: dayEnd }
    });
    if (!proWithDay) return res.status(400).send({ message: "Pas de disponibilité ce jour." });

    // 4) L'heure demandée est-elle dans une de ses fenêtres de la journée ?
    const windowsThisDay = proWithDay.disponibilites.filter(w => {
      const d = new Date(w.date);
      return d >= dayStart && d < dayEnd;
    });
    // Heure "HH:mm" doit être dans [heure_debut, heure_fin[
    const inside = windowsThisDay.some(w => (heure >= w.heure_debut) && (heure < w.heure_fin));
    if (!inside) return res.status(400).send({ message: "Heure hors créneau." });

    // 5) Le créneau n’est pas déjà pris ?
    const clash = await RendezVous.findOne({
      professionnel_id: professionnel._id,
      date: { $gte: dayStart, $lt: dayEnd },
      heure,
      statut: { $ne: "Annulé" }
    });
    if (clash) return res.status(400).send({ message: "Créneau déjà réservé." });

    // 6) Créer RDV
    const newRendezVous = new RendezVous({
      date: dayStart,                 // on stocke la date normalisée du jour
      heure,                          // "HH:mm"
      client_id: client._id,
      professionnel_id: professionnel._id,
      statut: "En attente",
    });
    await newRendezVous.save();

    // 7) Ajout à l'historique du client
    client.historiqueRendezVous.push(newRendezVous._id);
    await client.save();

    // 8) Notifier le pro
    await new Notification({
      type: "Rendez-vous",
      role: "PROFESSIONNEL",
      message: `Un client a pris un rendez-vous le ${date} à ${heure}.`,
      utilisateur_id: professionnel._id,
    }).save();

    return res.status(201).json({ message: "Rendez-vous pris avec succès.", rendezvous: newRendezVous });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
});


//  Annulation de rendez-vous (client only)
router.put("/annuler/:clientUserId/:rendezvousId", verifyToken, authorizeRoles("CLIENT"), async (req, res) => {
  try {
    const { clientUserId, rendezvousId } = req.params;

    // Vérifier que c'est bien le user connecté
    if (req.user.userId !== clientUserId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }

    // Trouver client par userId
    const client = await Client.findOne({ userId: clientUserId });
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Comparer le client_id stocké dans le rendezvous avec _id du client
    if (!rendezvous.client_id.equals(client._id)) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    rendezvous.statut = "Annulé";
    await rendezvous.save();

    // Créer notification si besoin

    res.status(200).json({ message: "Rendez-vous annulé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});





//  DELETE rendezvous annulé (client only)
router.delete("/annuler/:clientUserId/:rendezvousId", verifyToken, authorizeRoles("CLIENT"), async (req, res) => {
  try {
    const { clientUserId, rendezvousId } = req.params;

    if (req.user.userId !== clientUserId) {
      return res.status(403).send({ message: "Accès refusé" });
    }

    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      return res.status(404).send({ message: "Rendez-vous introuvable" });
    }

    // Trouver client par userId
    const client = await Client.findOne({ userId: clientUserId });
    if (!client) {
      return res.status(404).send({ message: "Client non trouvé" });
    }

    // Comparer les ObjectId correctement avec 'new'
    if (!rendezvous.client_id.equals(client._id)) {
      return res.status(403).send({ message: "Non autorisé" });
    }

    if (rendezvous.statut !== "Annulé") {
      return res.status(400).send({ message: "Seuls les rendez-vous annulés peuvent être supprimés" });
    }

    // Supprimer le rendez-vous de l'historique client
    client.historiqueRendezVous = client.historiqueRendezVous.filter(
      id => id.toString() !== rendezvousId
    );
    await client.save();

    await RendezVous.findByIdAndDelete(rendezvousId);

    res.status(200).send({ message: "Rendez-vous supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
  }
});


//  READ all rendezvous of the connected client
router.get("/client/:clientUserId", verifyToken, authorizeRoles("CLIENT"), async (req, res) => {
  try {
    const { clientUserId } = req.params;

    // Vérifier que l'utilisateur connecté est bien le client concerné
    if (req.user.userId !== clientUserId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Trouver le document Client à partir du userId
    const client = await Client.findOne({ userId: clientUserId });
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Récupérer les rendez-vous liés à ce client (_id de Client)
    const rendezvousList = await RendezVous.find({ client_id: client._id }).populate("professionnel_id");

    res.status(200).json(rendezvousList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


// Get all RDVs of a professional
router.get("/professionnel/:userId",
  verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
    try {
      const { userId } = req.params;
      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).send({ message: "Professionnel non trouvé" });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id })
        .populate({ path: "client_id", populate: { path: "userId", select: "nom email" } })
        .sort({ date: 1, heure: 1 });

      res.status(200).send(rdvs);
    } catch (e) { res.status(500).send({ message: e.message }); }
  });

// Get all RDVs en-attente of a professional
router.get("/professionnel/:userId/en-attente",
  verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.userId !== userId) return res.status(403).json({ message: "Accès refusé" });

      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id, statut: "En attente" })
        .populate({ path: "client_id", populate: { path: "userId", select: "nom email" } })
        .sort({ date: 1, heure: 1 });

      res.status(200).json(rdvs);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });


// Get all RDVs confirme of a professional
router.get("/professionnel/:userId/confirme",
  verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.userId !== userId) return res.status(403).json({ message: "Accès refusé" });

      const pro = await Professionnel.findOne({ userId });
      if (!pro) return res.status(404).json({ message: "Professionnel non trouvé" });

      const rdvs = await RendezVous.find({ professionnel_id: pro._id, statut: "Confirmé" })
        .populate({ path: "client_id", populate: { path: "userId", select: "nom email" } })
        .sort({ date: 1, heure: 1 });

      res.status(200).json(rdvs);
    } catch (e) { res.status(500).json({ message: e.message }); }
  });



//  Confirmation by professional only
router.put("/confirmer/:userId/:rendezvousId", verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId, rendezvousId } = req.params;

    // Verify that the authenticated user is the one sending the request
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Find the professional by userId
    const professionnel = await Professionnel.findOne({ userId });
    if (!professionnel) {
      return res.status(404).json({ message: "Professionnel non trouvé" });
    }

    // Find the rendez-vous
    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }

    // Make sure the rendez-vous belongs to the authenticated professional
    if (!rendezvous.professionnel_id.equals(professionnel._id)) {
      return res.status(403).json({ message: "Ce rendez-vous ne vous appartient pas" });
    }

    // Update the status
    rendezvous.statut = "Confirmé";
    await rendezvous.save();

    // Notify the client
    await new Notification({
      type: "Confirmation",
      role: "CLIENT",
      message: `Votre rendez-vous du ${rendezvous.date} à ${rendezvous.heure} a été confirmé.`,
      utilisateur_id: rendezvous.client_id
    }).save();

    res.status(200).json({ message: "Rendez-vous confirmé avec succès", rendezvous });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
