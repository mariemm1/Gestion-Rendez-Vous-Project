const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const clientRoutes = require("./routes/client.route");
const AuthRoutes = require("./routes/auth.route");
const RendezVousRoutes = require("./routes/rendezVous.route");
const notificationRoutes = require("./routes/notifications.route");
const profRoutes = require("./routes/professionel.route");
const cronRoutes = require("./cron/cronJobs");
const AdminRoutes = require("./routes/admin.route");
const cors = require('cors');

const app = express();

app.use(cors({ origin: ['http://localhost:8100'], credentials: true }));


// Middleware pour traiter les requêtes JSON
app.use(express.json());


// Routes
app.use("/client", clientRoutes);
app.use("/auth", AuthRoutes);
app.use("/rendezVous", RendezVousRoutes);
app.use("/notification", notificationRoutes);
app.use("/prof", profRoutes);
app.use("/admin", AdminRoutes)


// Ajouter la route pour tester le cron job manuellement
app.post("/test-cron", async (req, res) => {
  try {
    await cronRoutes.envoyerRappels(); // Exécuter la logique du cron job manuellement
    res.status(200).json({ message: "Rappels envoyés avec succès !" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Connexion à la base de données
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    console.log("Error connecting to the database:", err);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
