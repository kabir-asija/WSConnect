const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());

app.get("/", (_req, res) => {
  res.json({ message: "Chat server is running" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://ws-connect.vercel.app",
    methods: ["GET", "POST"],
  },
});

const users = new Map();

io.on("connection", (socket) => {
  socket.on("join_chat", (username) => {
    users.set(socket.id, username || "Anonymous");

    io.emit("user_list", Array.from(users.values()));
    io.emit("system_message", `${users.get(socket.id)} joined the chat`);
  });

  socket.on("send_message", (payload) => {
    const username = users.get(socket.id) || "Anonymous";
    io.emit("receive_message", {
      id: Date.now(),
      username,
      text: payload?.text || "",
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("typing", (isTyping) => {
    const username = users.get(socket.id) || "Someone";
    socket.broadcast.emit("user_typing", {
      username,
      isTyping: Boolean(isTyping),
    });
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      io.emit("user_list", Array.from(users.values()));
      io.emit("system_message", `${username} left the chat`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}!`);
});
