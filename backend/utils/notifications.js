const User = require("../models/User");
const Notification = require("../models/Notification");

const normalize = (value) => (value || "").trim().toUpperCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const canonicalClassKey = (value) => normalize(value).replace(/^CLASS\s+/, "");

const buildClassRegex = (value) => {
  const classKey = canonicalClassKey(value);
  return new RegExp(`^\\s*(?:CLASS\\s+)?${escapeRegex(classKey)}\\s*$`, "i");
};

const emitNotification = (req, payload) => {
  const io = req?.app?.get?.("io");

  if (io?.emit) {
    io.emit("new_notification", payload);
  }
};

const notifyClassStudents = async (req, className, message) => {
  const classRegex = buildClassRegex(className);
  const students = await User.find({ role: "student", class: classRegex });

  if (!students.length) {
    return [];
  }

  const notifications = await Promise.all(
    students.map((student) =>
      Notification.create({
        userId: student._id,
        message,
        read: false
      })
    )
  );

  emitNotification(req, { message, className: canonicalClassKey(className) });

  return notifications;
};

module.exports = {
  buildClassRegex,
  canonicalClassKey,
  notifyClassStudents
};