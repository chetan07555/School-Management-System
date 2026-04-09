const Notification = require("../models/Notification");
const { notifyClassStudents } = require("../utils/notifications");

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ msg: "Unable to fetch notifications", error: error.message });
  }
};

exports.markMyNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ msg: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ msg: "Unable to update notifications", error: error.message });
  }
};

exports.createClassNotice = async (req, res) => {
  try {
    const { className, message } = req.body;

    if (!className || !message) {
      return res.status(400).json({ msg: "className and message are required" });
    }

    const notice = await notifyClassStudents(req, className, message.trim());

    return res.status(201).json({
      msg: "Notice sent successfully",
      total: notice.length
    });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to send notice", error: error.message });
  }
};