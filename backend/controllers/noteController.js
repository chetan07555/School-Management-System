const Note = require("../models/Note");
const ClassRoom = require("../models/ClassRoom");
const { buildClassRegex, canonicalClassKey, notifyClassStudents } = require("../utils/notifications");
const { toWebPath } = require("../utils/uploadPath");

exports.uploadNote = async (req, res) => {
  try {
    const { title, description, subject, class: className } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: "File is required" });
    }

    if (!title || !subject || !className) {
      return res.status(400).json({ msg: "title, subject and class are required" });
    }

    const classRegex = buildClassRegex(className);

    const classExists = await ClassRoom.findOne({
      teacherId: req.user._id,
      className: classRegex,
      subject
    });

    if (!classExists) {
      return res.status(403).json({ msg: "You can upload notes only for classes and subjects you teach" });
    }

    const note = await Note.create({
      title,
      description: description || "",
      subject,
      class: canonicalClassKey(className),
      fileUrl: toWebPath(req.file.path),
      uploadedBy: req.user._id
    });

    await notifyClassStudents(req, className, `New notes uploaded for class ${canonicalClassKey(className)} - ${subject}`);

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ msg: "Unable to upload note", error: error.message });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "student") {
      filter.class = buildClassRegex(req.user.class);
    } else if (req.user.role === "teacher") {
      filter.uploadedBy = req.user._id;
    }

    if (req.query.class) {
      if (req.user.role === "student" && canonicalClassKey(req.query.class) !== canonicalClassKey(req.user.class)) {
        return res.status(403).json({ msg: "You can view notes only for your class" });
      }
      filter.class = buildClassRegex(req.query.class);
    }

    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    const notes = await Note.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ msg: "Unable to fetch notes", error: error.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const note = await Note.findOne({ _id: id, uploadedBy: req.user._id });
    if (!note) {
      return res.status(404).json({ msg: "Note not found" });
    }

    if (typeof title === "string" && title.trim()) {
      note.title = title.trim();
    }

    if (typeof description === "string") {
      note.description = description.trim();
    }

    await note.save();

    await notifyClassStudents(
      req,
      note.class,
      `Notes updated for class ${canonicalClassKey(note.class)} - ${note.subject}`
    );

    const updated = await Note.findById(note._id).populate("uploadedBy", "name email");
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ msg: "Unable to update note", error: error.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ _id: id, uploadedBy: req.user._id });

    if (!note) {
      return res.status(404).json({ msg: "Note not found" });
    }

    await notifyClassStudents(
      req,
      note.class,
      `A note was removed for class ${canonicalClassKey(note.class)} - ${note.subject}`
    );

    await Note.deleteOne({ _id: id });
    return res.json({ msg: "Note deleted" });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to delete note", error: error.message });
  }
};