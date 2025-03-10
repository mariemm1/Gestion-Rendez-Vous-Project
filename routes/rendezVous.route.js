const express = require("express");
const RendezVous = require("../models/rendezVous");
const Client = require("../models/client");
const Professionnel = require("../models/professionnel");
const router = express.Router();

// CREATE: Client makes a new rendezvous
router.post("/prendre/:clientId", async (req, res) => {
  try {
    const { date, heure, professionnel_id } = req.body;
    const { clientId } = req.params;

    // Find the client and professional
    const client = await Client.findById(clientId);
    const professionnel = await Professionnel.findById(professionnel_id);

    if (!client) {
      return res.status(404).send({ message: "Client not found" });
    }

    if (!professionnel) {
      return res.status(404).send({ message: "Professionnel not found" });
    }

    // Create a new rendezvous
    const newRendezVous = new RendezVous({
      date,
      heure,
      client_id: clientId,
      professionnel_id: professionnel_id,
    });

    await newRendezVous.save();

    // ✅ Add rendezvous to client's history
    client.historiqueRendezVous.push(newRendezVous._id);
    await client.save();

    res.status(201).send({ message: "Rendezvous taken successfully", rendezvous: newRendezVous });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// UPDATE: Client cancels an existing rendezvous (changes status to "annulé")
router.put("/annuler/:clientId/:rendezvousId", async (req, res) => {
  try {
    const { clientId, rendezvousId } = req.params;

    // Find the rendezvous
    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      return res.status(404).send({ message: "Rendezvous not found" });
    }

    // Ensure that the rendezvous belongs to the client
    if (!rendezvous.client_id.equals(clientId)) {
      return res.status(403).send({ message: "You can only cancel your own rendezvous" });
    }

    // ✅ Change the status to "annulé"
    rendezvous.statut = "Annulé";
    await rendezvous.save();

    res.status(200).send({ message: "Rendezvous annulé successfully", rendezvous });
  } catch (error) {
    res.status(500).send({ message: error.message });
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

    // ✅ Ensure the rendezvous is "annulé"
    if (rendezvous.statut !== "Annulé") {
      return res.status(400).send({ message: "Only annulé rendezvous can be deleted" });
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).send({ message: "Client not found" });
    }

    // ✅ Remove rendezvous from client's history
    client.historiqueRendezVous = client.historiqueRendezVous.filter(id => id.toString() !== rendezvousId);
    await client.save();

    // ✅ Delete the rendezvous
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

// READ: Get all rendezvous for a specific professional
router.get("/professionnel/:professionnelId", async (req, res) => {
  try {
    const { professionnelId } = req.params;
    const rendezvousList = await RendezVous.find({ professionnel_id: professionnelId }).populate("client_id");
    
    if (!rendezvousList) {
      return res.status(404).send({ message: "No rendezvous found for this professionnel" });
    }

    res.status(200).send(rendezvousList);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
