const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: String,
  description: String,
  subject: String,
  class: String,
  fileUrl: String,
  uploadedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Note", noteSchema);