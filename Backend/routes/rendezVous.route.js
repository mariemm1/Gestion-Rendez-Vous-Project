const express = require("express");
const mongoose = require("mongoose");  // <-- Import mongoose ici
const RendezVous = require("../models/rendezVous");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const Notification = require("../models/notification");

const verifyToken = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

// ✅ Validate chosen date/hour against professional windows & double-booking
const jour = new Date(date).toISOString().substring(0,10);

// 1) Ensure the pro has at least one window for that day
const proWithDay = await Professionnel.findOne({ _id: professionnel._id, 'disponibilites.date': new Date(jour) });
if (!proWithDay) return res.status(400).send({ message: "Pas de disponibilité ce jour." });

// 2) Check time is inside one of the day windows
const dayWins = proWithDay.disponibilites.filter(w => new Date(w.date).toISOString().substring(0,10) === jour);
const inRange = dayWins.some(w => (heure >= w.heure_debut) && (heure < w.heure_fin));
if (!inRange) return res.status(400).send({ message: "Heure hors créneau." });

// 3) Check not already booked (non Annulé)
const exists = await RendezVous.findOne({
  professionnel_id: professionnel._id,
  date: new Date(jour),
  heure,
  statut: { $ne: 'Annulé' }
});
if (exists) return res.status(400).send({ message: "Créneau déjà réservé." });

const router = express.Router();

// ✅ Ajouter une notification lors de la prise de rendez-vous (client only)
router.post("/prendre/:clientId", verifyToken, authorizeRoles("CLIENT"), async (req, res) => {
  try {
    const { date, heure, professionnel_id } = req.body;  // professionnel_id = userId du professionnel
    const { clientId } = req.params;

    // Vérifier que l'utilisateur connecté est bien le client
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).send({ message: "Client non trouvé" });
    if (req.user.userId !== client.userId.toString()) {
      return res.status(403).send({ message: "Accès refusé." });
    }

    // Chercher le professionnel par userId (pas _id)
    const professionnel = await Professionnel.findOne({ userId: professionnel_id });
    if (!professionnel) return res.status(404).send({ message: "Professionnel non trouvé" });

    const newRendezVous = new RendezVous({
      date,
      heure,
      client_id: client._id,
      professionnel_id: professionnel._id,
      statut: "En attente",
    });

    await newRendezVous.save();

    client.historiqueRendezVous.push(newRendezVous._id);
    await client.save();

    await new Notification({
      type: "Rendez-vous",
      role: "PROFESSIONNEL",
      message: `Un client a pris un rendez-vous le ${date} à ${heure}.`,
      utilisateur_id: professionnel._id,
    }).save();

    res.status(201).json({ message: "Rendez-vous pris avec succès.", rendezvous: newRendezVous });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
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
router.get("/professionnel/:userId", verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the professionnel record by userId
    const professionnel = await Professionnel.findOne({ userId });
    if (!professionnel) return res.status(404).send({ message: "Professionnel non trouvé" });

    const rdvs = await RendezVous.find({ professionnel_id: professionnel._id }).populate("client_id");

    res.status(200).send(rdvs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get all RDVs en-attente of a professional
router.get("/professionnel/:userId/en-attente", verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId });
    if (!professionnel) {
      return res.status(404).json({ message: "Professionnel non trouvé" });
    }

    const rdvsEnAttente = await RendezVous.find({
      professionnel_id: professionnel._id,
      statut: "En attente"
    }).populate("client_id");

    res.status(200).json(rdvsEnAttente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Get all RDVs confirme of a professional
router.get("/professionnel/:userId/confirme", verifyToken, authorizeRoles("PROFESSIONNEL"), async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const professionnel = await Professionnel.findOne({ userId });
    if (!professionnel) {
      return res.status(404).json({ message: "Professionnel non trouvé" });
    }

    const rdvsConfirmes = await RendezVous.find({
      professionnel_id: professionnel._id,
      statut: "Confirmé"
    }).populate("client_id");

    res.status(200).json(rdvsConfirmes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
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
