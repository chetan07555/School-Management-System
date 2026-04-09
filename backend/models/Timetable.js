const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
  class: String,
  day: String,
  subject: String,
  startTime: String,
  endTime: String,
  // New fields for file upload
  fileUrl: String,
  uploadedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Timetable", timetableSchema);