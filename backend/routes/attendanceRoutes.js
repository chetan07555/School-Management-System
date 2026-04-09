const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  uploadAttendance
} = require("../controllers/attendanceController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Teacher marks attendance
router.post("/mark", auth, role("teacher"), markAttendance);
router.post("/upload", auth, role("teacher"), uploadAttendance);
// Student and teacher can view attendance
router.get("/", auth, role(["student", "teacher"]), getAttendance);




module.exports = router;