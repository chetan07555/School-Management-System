const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  message: String,
  userId: mongoose.Schema.Types.ObjectId,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);