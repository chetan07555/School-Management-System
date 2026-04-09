const express = require("express");
const router = express.Router();
const {
  addMarks,
  getMarks,
  uploadMarks,
  getStudentMarksComparison
} = require("../controllers/marksController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Teacher adds marks
router.post("/add", auth, role("teacher"), addMarks);
router.post("/upload", auth, role("teacher"), uploadMarks);
router.get("/", auth, role(["student", "teacher"]), getMarks);
router.get("/comparison", auth, role("student"), getStudentMarksComparison);

module.exports = router;