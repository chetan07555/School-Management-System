const express = require("express");
const router = express.Router();
const { generateReport } = require("../controllers/reportController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Generate PDF report
router.get("/generate", auth, role("student"), generateReport);

module.exports = router;