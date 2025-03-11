const moment = require("moment");
const RendezVous = require("../models/rendezVous");
const Notification = require("../models/notification");

const envoyerRappels = async () => {
  const now = moment();

  // Trouver les rendez-vous 2 jours avant
  const rendezvous2Jours = await RendezVous.find({
    date: moment().add(2, "days").format("YYYY-MM-DD"),
    statut: "Confirmé",
  });

  // Trouver les rendez-vous 4 heures avant
  const rendezvous4H = await RendezVous.find({
    date: now.format("YYYY-MM-DD"),
    heure: { $eq: now.add(4, "hours").format("HH:mm") },
    statut: "Confirmé",
  });

  // Envoyer les notifications
  await Promise.all(
    [...rendezvous2Jours, ...rendezvous4H].map(async (rdv) => {
      const message =
        rdv.date === moment().add(2, "days").format("YYYY-MM-DD")
          ? `Rappel : Vous avez un rendez-vous dans 2 jours, le ${rdv.date} à ${rdv.heure}.`
          : `Rappel : Vous avez un rendez-vous dans 4 heures, à ${rdv.heure}.`;

      // Envoi de la notification au client
      await new Notification({
        type: "Rappel",
        role: "CLIENT",
        message: message,
        utilisateur_id: rdv.client_id, // Assure-toi que l'utilisateur_id est bien défini
      }).save();
    })
  );

  console.log("Rappels envoyés.");
};

// Notification envoyée au client lorsqu'un professionnel confirme un rendez-vous
const envoyerNotificationConfirmation = async (rendezvous) => {
  const message = `Votre rendez-vous du ${rendezvous.date} à ${rendezvous.heure} a été confirmé par le professionnel.`;

  // Envoi de la notification au client
  await new Notification({
    type: "Rendez-vous",
    role: "CLIENT",
    message: message,
    utilisateur_id: rendezvous.client_id, // Utiliser l'ID du client
  }).save();

  console.log("Notification envoyée au client pour confirmation.");
};

// Notification envoyée au professionnel lorsque le client prend ou annule un rendez-vous
const envoyerNotificationProfessionnel = async (rendezvous, action) => {
  let message;

  if (action === 'prendre') {
    message = `Un client a pris un rendez-vous pour le ${rendezvous.date} à ${rendezvous.heure}.`;
  } else if (action === 'annuler') {
    message = `Le client a annulé son rendez-vous prévu pour le ${rendezvous.date} à ${rendezvous.heure}.`;
  }

  // Envoi de la notification au professionnel
  await new Notification({
    type: "Rendez-vous",
    role: "PROFESSIONNEL",
    message: message,
    utilisateur_id: rendezvous.professionnel_id, // Utiliser l'ID du professionnel
  }).save();

  console.log(`Notification envoyée au professionnel pour l'action: ${action}`);
};

// Exemple de fonction pour gérer l'action de prise ou d'annulation d'un rendez-vous
const traiterRendezVous = async (action, rendezvousId, clientId, professionnelId) => {
  try {
    const rendezvous = await RendezVous.findById(rendezvousId);
    if (!rendezvous) {
      console.log("Rendez-vous non trouvé");
      return;
    }

    // Gérer la prise de rendez-vous
    if (action === 'prendre') {
      rendezvous.statut = "Confirmé";
      await rendezvous.save();
      await envoyerNotificationProfessionnel(rendezvous, 'prendre');
      await envoyerNotificationConfirmation(rendezvous);
    }

    // Gérer l'annulation du rendez-vous
    if (action === 'annuler') {
      rendezvous.statut = "Annulé";
      await rendezvous.save();
      await envoyerNotificationProfessionnel(rendezvous, 'annuler');
    }

    console.log(`Action "${action}" sur le rendez-vous réussie.`);
  } catch (error) {
    console.error("Erreur lors du traitement du rendez-vous:", error);
  }
};

module.exports = {
  envoyerRappels,
  envoyerNotificationConfirmation,
  envoyerNotificationProfessionnel,
  traiterRendezVous,
};
