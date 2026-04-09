const ClassRoom = require("../models/ClassRoom");
const User = require("../models/User");
const { notifyClassStudents } = require("../utils/notifications");

const normalize = (value) => (value || "").trim().toUpperCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const canonicalClassKey = (value) => normalize(value).replace(/^CLASS\s+/, "");

exports.createClass = async (req, res) => {
  try {
    const className = normalize(req.body.className);
    const subject = (req.body.subject || "").trim();

    if (!className || !subject) {
      return res.status(400).json({ msg: "className and subject are required" });
    }

    const existing = await ClassRoom.findOne({
      className,
      subject,
      teacherId: req.user._id
    });

    if (existing) {
      return res.status(400).json({ msg: "This class and subject already exists for this teacher" });
    }

    const newClass = await ClassRoom.create({
      className,
      subject,
      teacherId: req.user._id
    });

    await notifyClassStudents(req, className, `New class subject added: ${className} - ${subject}`);

    return res.status(201).json(newClass);
  } catch (error) {
    return res.status(500).json({ msg: "Unable to create class", error: error.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const classes = await ClassRoom.find({ teacherId: req.user._id }).sort({ className: 1, subject: 1 });
      return res.json(classes);
    }

    const classKey = canonicalClassKey(req.user.class);
    const classRegex = new RegExp(`^\\s*(?:CLASS\\s+)?${escapeRegex(classKey)}\\s*$`, "i");
    const classes = await ClassRoom.find({ className: classRegex }).sort({ subject: 1 });
    return res.json(classes);
  } catch (error) {
    return res.status(500).json({ msg: "Unable to fetch classes", error: error.message });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const className = normalize(req.query.className);
    const classKey = canonicalClassKey(className);

    if (!className) {
      return res.status(400).json({ msg: "className is required" });
    }

    const classRegex = new RegExp(`^\\s*(?:CLASS\\s+)?${escapeRegex(classKey)}\\s*$`, "i");
    const teacherHasClass = await ClassRoom.findOne({
      className: classRegex,
      teacherId: req.user._id
    });

    if (!teacherHasClass) {
      return res.status(403).json({ msg: "You do not manage this class" });
    }

    const students = await User.find({ role: "student", class: classRegex })
      .select("name email class")
      .sort({ name: 1 });

    return res.json(students);
  } catch (error) {
    return res.status(500).json({ msg: "Unable to fetch students", error: error.message });
  }
};
