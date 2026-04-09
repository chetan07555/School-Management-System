require("dotenv").config();
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
};

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required in environment variables.");
  }

  const className = String(getArg("className") || "").trim();
  const teacherId = String(getArg("teacherId") || "").trim();
  const dateInput = String(getArg("date") || "").trim();
  const subject = String(getArg("subject") || "").trim();

  if (!className || !teacherId || !dateInput || !subject) {
    throw new Error("Usage: node scripts/backfillAttendanceSubjectByDate.js --className=<class> --teacherId=<id> --date=<YYYY-MM-DD> --subject=<subject>");
  }

  const date = normalizeDate(dateInput);
  if (!date) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    className,
    markedBy: teacherId,
    date: { $gte: date, $lt: nextDate },
    $or: [{ subject: { $exists: false } }, { subject: null }, { subject: "" }]
  };

  const result = await Attendance.updateMany(filter, { $set: { subject } });

  console.log(
    JSON.stringify(
      {
        className,
        teacherId,
        date: dateInput,
        subject,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Backfill failed:", error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
