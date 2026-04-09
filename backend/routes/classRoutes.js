const express = require("express");
const router = express.Router();

const { createClass, getClasses, getClassStudents } = require("../controllers/classController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/", auth, role("teacher"), createClass);
router.get("/", auth, role(["teacher", "student"]), getClasses);
router.get("/students", auth, role("teacher"), getClassStudents);

module.exports = router;
