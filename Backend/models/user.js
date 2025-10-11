const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  pwd: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "PROFESSIONNEL", "CLIENT"], required: true },
}, { timestamps: true });

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (this.isModified("pwd")) {
    this.pwd = await bcryptjs.hash(this.pwd, 10);
  }
  next();
});

// Compare plain password with hashed password
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcryptjs.compare(plainPassword, this.pwd);
};

module.exports = mongoose.model("Utilisateur", userSchema);
