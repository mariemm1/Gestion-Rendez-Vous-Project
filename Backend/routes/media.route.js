// Backend/routes/media.route.js
const express = require("express");
const multer  = require("multer");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../middleware/auth");
const User = require("../models/user");

const router = express.Router();

const UP = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UP)) fs.mkdirSync(UP);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `avatar_${req.user.userId}${ext}`);
  },
});
const upload = multer({ storage });

router.post("/avatar", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });

    const rel = `/uploads/${req.file.filename}`;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatarUrl = rel;
    await user.save();

    const safe = { _id: user._id, nom: user.nom, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
    res.json({ message: "Avatar updated", user: safe });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
