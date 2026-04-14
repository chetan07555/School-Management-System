const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  className: String,
  subject: String,
  date: Date,
  status: String,
  markedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);