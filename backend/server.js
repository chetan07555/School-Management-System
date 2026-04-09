const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();
const app = require("./app");

const server = http.createServer(app);

// Socket.io
const io = require("socket.io")(server, {
  cors: { origin: "*" }
});

// DB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Socket connection
io.on("connection", (socket) => {
  console.log("User Connected");
});

app.set("io", io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));