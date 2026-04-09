const express = require("express");
const router = express.Router();

const { uploadNote, getNotes, updateNote, deleteNote } = require("../controllers/noteController");
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

// ✅ BEST PRACTICE USAGE
router.post("/upload", auth, role("teacher"), upload.single("file"), uploadNote);

// Students + teachers both can view
router.get("/", auth, getNotes);
router.put("/:id", auth, role("teacher"), updateNote);
router.delete("/:id", auth, role("teacher"), deleteNote);

module.exports = router;