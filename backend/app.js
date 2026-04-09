const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const allowedOrigins = [
	process.env.CLIENT_URL,
	process.env.CLIENT_URLS,
	"http://localhost:3000",
	"http://localhost:3001"
]
	.filter(Boolean)
	.flatMap((value) => value.split(","))
	.map((value) => value.trim());

app.use(express.json());
app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		return callback(new Error(`CORS blocked for origin: ${origin}`));
	}
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Default no-op socket emitter for non-socket contexts (tests)
app.set("io", { emit: () => {} });

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/classes", require("./routes/classRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/marks", require("./routes/marksRoutes"));
app.use("/api/timetable", require("./routes/timetableRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/report", require("./routes/reportRoutes"));

module.exports = app;
