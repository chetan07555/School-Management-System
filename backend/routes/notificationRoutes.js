const express = require("express");
const router = express.Router();

const { getMyNotifications, markMyNotificationsRead, createClassNotice } = require("../controllers/notificationController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/", auth, getMyNotifications);
router.patch("/read", auth, markMyNotificationsRead);
router.post("/notice", auth, role("teacher"), createClassNotice);

module.exports = router;