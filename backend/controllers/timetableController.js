const Timetable = require("../models/Timetable");
const ClassRoom = require("../models/ClassRoom");
const { buildClassRegex, canonicalClassKey, notifyClassStudents } = require("../utils/notifications");
const { toWebPath } = require("../utils/uploadPath");

exports.addTimetable = async (req, res) => {
  const className = req.body.class;
  const data = await Timetable.create({
    ...req.body,
    class: canonicalClassKey(className)
  });

  if (className) {
    await notifyClassStudents(req, className, `Timetable updated for class ${canonicalClassKey(className)}`);
  }

  res.json(data);
};

exports.getTimetable = async (req, res) => {
  const filter = {};

  if (req.query.class) {
    filter.class = buildClassRegex(req.query.class);
  }

  const data = await Timetable.find(filter);
  res.json(data);
};

// Upload timetable image/PDF
exports.uploadTimetable = async (req, res) => {
  try {
    const { class: className } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: "File is required" });
    }

    if (!className) {
      return res.status(400).json({ msg: "Class is required" });
    }

    // Verify teacher owns this class
    const classRegex = buildClassRegex(className);

    const classExists = await ClassRoom.findOne({
      teacherId: req.user._id,
      className: classRegex
    });

    if (!classExists) {
      return res.status(403).json({ msg: "You can upload timetable only for classes you teach" });
    }

    // Delete previous timetable for this class if exists
    await Timetable.deleteOne({ class: classRegex, uploadedBy: req.user._id });

    const timetable = await Timetable.create({
      class: canonicalClassKey(className),
      fileUrl: toWebPath(req.file.path),
      uploadedBy: req.user._id
    });

    await notifyClassStudents(req, className, `Timetable updated for class ${canonicalClassKey(className)}`);

    res.status(201).json(timetable);
  } catch (error) {
    res.status(500).json({ msg: "Unable to upload timetable", error: error.message });
  }
};

// Get timetable by class (for students)
exports.getTimetableByClass = async (req, res) => {
  try {
    const { class: className } = req.query;
    
    if (!className) {
      return res.status(400).json({ msg: "Class is required" });
    }

    const timetable = await Timetable.findOne({ class: buildClassRegex(className) });
    
    if (!timetable) {
      return res.status(404).json({ msg: "Timetable not found for this class" });
    }

    res.json(timetable);
  } catch (error) {
    res.status(500).json({ msg: "Unable to fetch timetable", error: error.message });
  }
};