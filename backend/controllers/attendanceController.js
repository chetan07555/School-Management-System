const Attendance = require("../models/Attendance");
const User = require("../models/User");
const ClassRoom = require("../models/ClassRoom");
const calculate = require("../utils/calculateAttendance");
const { buildClassRegex, canonicalClassKey, notifyClassStudents } = require("../utils/notifications");

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const enrichAttendanceSubjects = async (records) => {
  if (!Array.isArray(records) || records.length === 0) return [];

  const missing = records.filter((record) => !record.subject && record.markedBy && record.className);
  if (!missing.length) return records;

  const teacherClassPairs = Array.from(
    new Set(missing.map((record) => `${String(record.markedBy)}|${String(record.className)}`))
  );

  const subjectsByPair = new Map();
  for (const pair of teacherClassPairs) {
    const [teacherId, className] = pair.split("|");
    const classRegex = buildClassRegex(className);
    const classRows = await ClassRoom.find({ teacherId, className: classRegex }).select("subject");
    subjectsByPair.set(
      pair,
      Array.from(new Set((classRows || []).map((row) => row.subject).filter(Boolean)))
    );
  }

  return records.map((record) => {
    if (record.subject) return record;

    const pairKey = `${String(record.markedBy)}|${String(record.className)}`;
    const teacherSubjects = subjectsByPair.get(pairKey) || [];

    if (teacherSubjects.length === 1) {
      return { ...record.toObject?.() || record, subject: teacherSubjects[0] };
    }

    const sameDayKnownSubjects = new Set(
      records
        .filter((row) =>
          String(row.studentId) === String(record.studentId)
          && String(row.className) === String(record.className)
          && String(row.markedBy) === String(record.markedBy)
          && dateKey(row.date) === dateKey(record.date)
          && row.subject
        )
        .map((row) => row.subject)
    );

    const remaining = teacherSubjects.filter((subject) => !sameDayKnownSubjects.has(subject));
    if (remaining.length === 1) {
      return { ...record.toObject?.() || record, subject: remaining[0] };
    }

    return record;
  });
};

exports.markAttendance = async (req, res) => {
  try {
    const { studentId, className, subject, date, status } = req.body;

    if (!studentId || !className || !subject || !date || !status) {
      return res.status(400).json({ msg: "studentId, className, subject, date and status are required" });
    }

    const classKey = canonicalClassKey(className);
    const classRegex = buildClassRegex(className);

    const teacherHasClass = await ClassRoom.findOne({ teacherId: req.user._id, className: classRegex, subject });
    if (!teacherHasClass) {
      return res.status(403).json({ msg: "You can mark attendance only for classes you teach" });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student" || canonicalClassKey(student.class) !== classKey) {
      return res.status(400).json({ msg: "Student does not belong to this class" });
    }

    const record = await Attendance.create({
      studentId,
      className: classKey,
      subject,
      date,
      status,
      markedBy: req.user._id
    });

    const io = req.app.get("io");
    io.emit("student_data_updated", { studentId: String(studentId), type: "attendance" });

    await notifyClassStudents(req, className, `Attendance updated for class ${classKey} - ${subject}`);

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ msg: "Unable to mark attendance", error: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "student") {
      filter.studentId = req.user._id;
    } else {
      filter.markedBy = req.user._id;

      if (req.query.className) {
        const classRegex = buildClassRegex(req.query.className);
        const classKey = canonicalClassKey(req.query.className);
        const subject = req.query.subject;
        const teacherHasClass = await ClassRoom.findOne({
          teacherId: req.user._id,
          className: classRegex,
          ...(subject ? { subject } : {})
        });

        if (!teacherHasClass) {
          return res.status(403).json({ msg: "You can view attendance only for classes you teach" });
        }
        filter.className = classKey;
      }

      if (req.query.subject) {
        filter.subject = req.query.subject;
      }

      if (req.query.date) {
        const date = normalizeDate(req.query.date);
        if (!date) {
          return res.status(400).json({ msg: "Valid date is required" });
        }

        const nextDate = new Date(date);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        filter.date = { $gte: date, $lt: nextDate };
      }

      if (req.query.studentId) {
        filter.studentId = req.query.studentId;
      }
    }

    const rawRecords = await Attendance.find(filter).sort({ date: -1 });
    const records = req.user.role === "student"
      ? await enrichAttendanceSubjects(rawRecords)
      : rawRecords;

    if (req.user.role === "student") {
      const classKey = canonicalClassKey(req.user.class);
      const classRecordsResult = await Attendance.find({ className: classKey });
      const classRecords = Array.isArray(classRecordsResult)
        ? classRecordsResult
        : (typeof classRecordsResult?.sort === "function"
          ? await classRecordsResult.sort({ date: -1 })
          : []);
      const byStudent = classRecords.reduce((acc, record) => {
        const key = String(record.studentId);
        acc[key] = acc[key] || [];
        acc[key].push(record);
        return acc;
      }, {});

      const studentRanking = Object.entries(byStudent)
        .map(([studentId, studentRecords]) => ({
          studentId,
          percentage: Number(calculate(studentRecords))
        }))
        .sort((a, b) => b.percentage - a.percentage);

      const ownPercentage = Number(calculate(records));
      const classPercentage = Number(calculate(classRecords));
      const rank = Math.max(1, studentRanking.findIndex((item) => item.studentId === String(req.user._id)) + 1);

      const grouped = records.reduce((acc, record) => {
        const key = record.className || "Unknown";
        acc[key] = acc[key] || [];
        acc[key].push(record);
        return acc;
      }, {});

      const overall = calculate(records);
      const byClass = Object.entries(grouped).map(([className, classRecords]) => ({
        className,
        percentage: calculate(classRecords)
      }));

      return res.json({
        records,
        percentage: overall,
        byClass,
        comparison: {
          yourAttendance: ownPercentage,
          classAverage: classPercentage,
          difference: Number((ownPercentage - classPercentage).toFixed(2)),
          rank,
          classSize: studentRanking.length
        }
      });
    }

    return res.json({ records, percentage: null, byClass: [] });
  } catch (error) {
    res.status(500).json({ msg: "Unable to fetch attendance", error: error.message });
  }
};

exports.uploadAttendance = async (req, res) => {
  try {
    const { className, subject, date, attendance } = req.body;

    if (!className || !subject || !date || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ msg: "className, subject, date and attendance array are required" });
    }

    const classKey = canonicalClassKey(className);
    const classRegex = buildClassRegex(className);
    const normalizedDate = normalizeDate(date);

    if (!normalizedDate) {
      return res.status(400).json({ msg: "Valid date is required" });
    }

    const teacherHasClass = await ClassRoom.findOne({ teacherId: req.user._id, className: classRegex, subject });
    if (!teacherHasClass) {
      return res.status(403).json({ msg: "You can mark attendance only for classes you teach" });
    }

    const students = await User.find({ role: "student", class: classRegex }).select("_id");
    const allowedStudentIds = new Set(students.map((student) => String(student._id)));

    let created = 0;
    let updated = 0;

    for (const row of attendance) {
      const studentId = row?.studentId;
      const status = row?.status;

      if (!studentId || !["Present", "Absent"].includes(status)) {
        return res.status(400).json({ msg: "Each attendance row must contain studentId and status (Present/Absent)" });
      }

      if (!allowedStudentIds.has(String(studentId))) {
        return res.status(400).json({ msg: "One or more students do not belong to this class" });
      }

      const existing = await Attendance.findOne({
        studentId,
        className: classKey,
        subject,
        date: normalizedDate,
        markedBy: req.user._id
      });

      if (existing) {
        existing.status = status;
        await existing.save();
        updated += 1;
      } else {
        await Attendance.create({
          studentId,
          className: classKey,
          subject,
          date: normalizedDate,
          status,
          markedBy: req.user._id
        });
        created += 1;
      }
    }

    const io = req.app.get("io");
    for (const row of attendance) {
      io.emit("student_data_updated", { studentId: String(row.studentId), type: "attendance" });
    }

    await notifyClassStudents(req, className, `Attendance uploaded for class ${classKey} - ${subject}`);

    return res.status(200).json({ msg: "Attendance uploaded", created, updated, total: attendance.length });
  } catch (error) {
    return res.status(500).json({ msg: "Unable to upload attendance", error: error.message });
  }
};