const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  className: String,
  subject: String,
  testName: String,
  marksObtained: Number,
  totalMarks: Number,
  teacherId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

module.exports = mongoose.model("Marks", marksSchema);