const express = require("express");
const router = express.Router();
const {
  addTimetable,
  getTimetable,
  uploadTimetable,
  getTimetableByClass
} = require("../controllers/timetableController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const multer = require("multer");

// multer config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Add timetable (old way)
router.post("/add", auth, role("teacher"), addTimetable);

// Upload timetable image/PDF
router.post("/upload", auth, role("teacher"), upload.single("file"), uploadTimetable);

// Get timetable
router.get("/", auth, getTimetable);

// Get timetable by class (for students)
router.get("/by-class", auth, getTimetableByClass);

module.exports = router;