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
    for (let rdv of [...rendezvous2Jours, ...rendezvous4H]) {
      const message = rdv.date === moment().add(2, "days").format("YYYY-MM-DD") 
                      ? `Rappel : Vous avez un rendez-vous dans 2 jours, le ${rdv.date} à ${rdv.heure}.`
                      : `Rappel : Vous avez un rendez-vous dans 4 heures, à ${rdv.heure}.`;
  
      await new Notification({
        type: "Rappel",
        role: "CLIENT",
        message: message,
        utilisateur_id: rdv.client_id,  // Assure-toi que l'utilisateur_id est bien défini
      }).save();
  
      // Optionnel : envoyer également un email ou un SMS
      // await sendEmail(rdv.client_id, message); // Exemple de fonction pour envoyer un e-mail
    }
  
    console.log("Rappels envoyés.");
  };
  