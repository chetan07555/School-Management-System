const mongoose = require("mongoose");

const classRoomSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

classRoomSchema.index({ className: 1, subject: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model("ClassRoom", classRoomSchema);
