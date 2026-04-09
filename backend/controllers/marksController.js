const Marks = require("../models/Marks");
const User = require("../models/User");
const ClassRoom = require("../models/ClassRoom");
const { buildClassRegex, canonicalClassKey, notifyClassStudents } = require("../utils/notifications");

const averageFromMarks = (records) => {
  if (!records.length) return 0;
  const total = records.reduce((sum, record) => sum + ((record.marksObtained / record.totalMarks) * 100), 0);
  return Number((total / records.length).toFixed(2));
};

exports.addMarks = async (req, res) => {
  try {
    const { studentId, className, subject, testName, marksObtained, totalMarks } = req.body;

    if (!studentId || !className || !subject || !testName || marksObtained === undefined || totalMarks === undefined) {
      return res.status(400).json({ msg: "studentId, className, subject, testName, marksObtained and totalMarks are required" });
    }

    const classKey = canonicalClassKey(className);
    const classRegex = buildClassRegex(className);

    const classExists = await ClassRoom.findOne({
      teacherId: req.user._id,
      className: classRegex,
      subject
    });
    if (!classExists) {
      return res.status(403).json({ msg: "You can add marks only for classes and subjects you teach" });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student" || canonicalClassKey(student.class) !== classKey) {
      return res.status(400).json({ msg: "Student does not belong to this class" });
    }

    const mark = await Marks.create({
      studentId,
      className: classKey,
      subject,
      testName,
      marksObtained,
      totalMarks,
      teacherId: req.user._id
    });

    const io = req.app.get("io");
    io.emit("student_data_updated", { studentId: String(studentId), type: "marks" });

    await notifyClassStudents(req, className, `Marks updated for class ${classKey} - ${subject}`);

    res.status(201).json(mark);
  } catch (error) {
    res.status(500).json({ msg: "Unable to add marks", error: error.message });
  }
};

exports.getMarks = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "student") {
      filter.studentId = req.user._id;
      filter.className = canonicalClassKey(req.user.class);
    } else {
      filter.teacherId = req.user._id;

      if (req.query.className && req.query.subject) {
        const classRegex = buildClassRegex(req.query.className);
        const classExists = await ClassRoom.findOne({
          teacherId: req.user._id,
          className: classRegex,
          subject: req.query.subject
        });
        if (!classExists) {
          return res.status(403).json({ msg: "You can view marks only for classes and subjects you teach" });
        }
      }

      if (req.query.className) {
        filter.className = canonicalClassKey(req.query.className);
      }

      if (req.query.subject) {
        filter.subject = req.query.subject;
      }

      if (req.query.testName) {
        filter.testName = req.query.testName;
      }

      if (req.query.studentId) {
        filter.studentId = req.query.studentId;
      }
    }

    const marks = await Marks.find(filter);
    res.json(marks);
  } catch (error) {
    res.status(500).json({ msg: "Unable to fetch marks", error: error.message });
  }
};

exports.uploadMarks = async (req, res) => {
  try {
    const { className, subject, testName, totalMarks, marks } = req.body;

    if (!className || !subject || !testName || totalMarks === undefined || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ msg: "className, subject, testName, totalMarks and marks array are required" });
    }

    const total = Number(totalMarks);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ msg: "totalMarks must be a positive number" });
    }

    const classKey = canonicalClassKey(className);
    const classRegex = buildClassRegex(className);

    const classExists = await ClassRoom.findOne({
      teacherId: req.user._id,
      className: classRegex,
      subject
    });
    if (!classExists) {
      return res.status(403).json({ msg: "You can upload marks only for classes and subjects you teach" });
    }

    const students = await User.find({ role: "student", class: classRegex }).select("_id");
    const allowedStudentIds = new Set(students.map((student) => String(student._id)));

    let created = 0;
    let updated = 0;

    for (const row of marks) {
      const studentId = row?.studentId;
      const marksObtained = Number(row?.marksObtained);

      if (!studentId || !Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > total) {
        return res.status(400).json({ msg: "Each row must contain a valid studentId and marksObtained within range" });
      }

      if (!allowedStudentIds.has(String(studentId))) {
        return res.status(400).json({ msg: "One or more students do not belong to this class" });
      }

      const existing = await Marks.findOne({
        studentId,
        className: classKey,
        subject,
        testName,
        teacherId: req.user._id
      });

      if (existing) {
        existing.marksObtained = marksObtained;
        existing.totalMarks = total;
        await existing.save();
        updated += 1;
      } else {
        await Marks.create({
          studentId,
          className: classKey,
          subject,
          testName,
          marksObtained,
          totalMarks: total,
          teacherId: req.user._id
        });
        created += 1;
      }
    }

    const io = req.app.get("io");
    for (const row of marks) {
      io.emit("student_data_updated", { studentId: String(row.studentId), type: "marks" });
    }

    await notifyClassStudents(req, className, `Marks updated for class ${classKey} - ${subject}`);

    return res.status(200).json({ msg: "Marks uploaded", created, updated, total: marks.length });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to upload marks", error: error.message });
  }
};

exports.getStudentMarksComparison = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ msg: "Only students can view comparison analytics" });
    }

    const classKey = canonicalClassKey(req.user.class);
    const ownMarks = await Marks.find({
      studentId: req.user._id,
      className: classKey
    });

    const classMarks = await Marks.find({ className: classKey });
    const ownAverage = averageFromMarks(ownMarks);
    const classAverage = averageFromMarks(classMarks);

    const byStudent = classMarks.reduce((acc, record) => {
      const key = String(record.studentId);
      acc[key] = acc[key] || [];
      acc[key].push(record);
      return acc;
    }, {});

    const studentRanking = Object.entries(byStudent)
      .map(([studentId, records]) => ({ studentId, avg: averageFromMarks(records) }))
      .sort((a, b) => b.avg - a.avg);

    const rank = Math.max(1, studentRanking.findIndex((item) => item.studentId === String(req.user._id)) + 1);

    const subjectOwn = ownMarks.reduce((acc, record) => {
      const key = record.subject || "Unknown";
      acc[key] = acc[key] || [];
      acc[key].push(record);
      return acc;
    }, {});

    const subjectClass = classMarks.reduce((acc, record) => {
      const key = record.subject || "Unknown";
      acc[key] = acc[key] || [];
      acc[key].push(record);
      return acc;
    }, {});

    const subjects = Array.from(new Set([...Object.keys(subjectOwn), ...Object.keys(subjectClass)]));
    const subjectComparison = subjects.map((subject) => ({
      subject,
      yourAverage: averageFromMarks(subjectOwn[subject] || []),
      classAverage: averageFromMarks(subjectClass[subject] || [])
    }));

    return res.json({
      className: classKey,
      yourAverage: ownAverage,
      classAverage,
      difference: Number((ownAverage - classAverage).toFixed(2)),
      rank,
      classSize: studentRanking.length,
      subjectComparison,
      records: ownMarks
    });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to fetch marks comparison", error: error.message });
  }
};