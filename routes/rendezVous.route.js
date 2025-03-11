const express = require("express");
const RendezVous = require("../models/rendezVous");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const Notification = require("../models/notification");

const router = express.Router();

// Ajouter une notification lors de la prise de rendez-vous
router.post("/prendre/:clientId", async (req, res) => {
  try {
    const { date, heure, professionnel_id } = req.body;
    const { clientId } = req.params;

    const client = await Client.findById(clientId);
    const professionnel = await Professionnel.findById(professionnel_id);

    if (!client || !professionnel) {
      return res.status(404).send({ message: "Client ou professionnel non trouvé" });
    }

    const newRendezVous = new RendezVous({
      date,
      heure,
      client_id: clientId,
      professionnel_id: professionnel_id,
      statut: "En attente",
    });

    await newRendezVous.save();

    client.historiqueRendezVous.push(newRendezVous._id);
    await client.save();

    await new Notification({
      type: "Rendez-vous",
      role: "PROFESSIONNEL",
      message: `Un client (${client.nom}) a pris un rendez-vous le ${date} à ${heure}.`,
      utilisateur_id: professionnel_id,
    }).save();

    res.status(201).json({ message: "Rendez-vous pris avec succès.", rendezvous: newRendezVous });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Annulation de rendez-vous
router.put("/annuler/:clientId/:rendezvousId", async (req, res) => {
  try {
    const { clientId, rendezvousId } = req.params;
    const rendezvous = await RendezVous.findById(rendezvousId);

    if (!rendezvous || !rendezvous.client_id.equals(clientId)) {
      return res.status(404).json({ message: "Rendez-vous non trouvé ou non autorisé" });
    }

    rendezvous.statut = "Annulé";
    await rendezvous.save();

    await new Notification({
      type: "Annulation",
      role: "PROFESSIONNEL",
      message: `Le client a annulé son rendez-vous prévu le ${rendezvous.date} à ${rendezvous.heure}.`,
      utilisateur_id: rendezvous.professionnel_id,
    }).save();

    res.status(200).json({ message: "Rendez-vous annulé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// DELETE: Client deletes an annulé rendezvous
router.delete("/annuler/:clientId/:rendezvousId", async (req, res) => {
  try {
    const { clientId, rendezvousId } = req.params;

    // Find the rendezvous
    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      return res.status(404).send({ message: "Rendezvous not found" });
    }

    // Check if the rendezvous belongs to the client
    if (!rendezvous.client_id.equals(clientId)) {
      return res.status(403).send({ message: "You can only delete your own rendezvous" });
    }

    // Ensure the rendezvous is "annulé"
    if (rendezvous.statut !== "Annulé") {
      return res.status(400).send({ message: "Only annulé rendezvous can be deleted" });
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).send({ message: "Client not found" });
    }

    //  Remove rendezvous from client's history
    client.historiqueRendezVous = client.historiqueRendezVous.filter(id => id.toString() !== rendezvousId);
    await client.save();

    //  Delete the rendezvous
    await RendezVous.findByIdAndDelete(rendezvousId);

    res.status(200).send({ message: "Rendezvous deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});



// READ: Get all rendezvous for a specific client
router.get("/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const rendezvousList = await RendezVous.find({ client_id: clientId }).populate("professionnel_id");
    
    if (!rendezvousList) {
      return res.status(404).send({ message: "No rendezvous found for this client" });
    }

    res.status(200).send(rendezvousList);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Confirmer le rendez-vous par le professionnel
router.put("/confirmer/:professionnelId/:rendezvousId", async (req, res) => {
  try {
    const { professionnelId, rendezvousId } = req.params;

    // Trouver le rendez-vous
    const rendezvous = await RendezVous.findById(rendezvousId);

    if (!rendezvous) {
      return res.status(404).send({ message: "Rendez-vous non trouvé" });
    }

    // Vérifier que le rendez-vous correspond au professionnel
    if (!rendezvous.professionnel_id.equals(professionnelId)) {
      return res.status(403).send({ message: "Ce rendez-vous n'appartient pas à ce professionnel" });
    }

    // Appeler la méthode pour confirmer le rendez-vous
    await rendezvous.confirmerRendezVous();

    // Envoi d'une notification au client
    await new Notification({
      type: "Rendez-vous",
      role: "CLIENT",
      message: `Votre rendez-vous du ${rendezvous.date} à ${rendezvous.heure} a été confirmé par le professionnel.`,
      utilisateur_id: rendezvous.client_id
    }).save();

    res.status(200).send({ message: "Rendez-vous confirmé avec succès", rendezvous });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});


module.exports = router;
