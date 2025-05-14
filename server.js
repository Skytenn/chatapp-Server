const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const mainRoom = {
  users: [],
  history: []
};

// Бүх хэрэглэгчид онлайн тоог илгээх
const broadcastUserCount = () => {
  io.emit("room_users", mainRoom.users.length);
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  broadcastUserCount();

  // Нийтийн чатад нэгдэх
  socket.on("join_room", () => {
    if (!mainRoom.users.includes(socket.id)) {
      mainRoom.users.push(socket.id);
      socket.join('main');
    }
    // Мессежний түүх илгээх
    socket.emit("room_history", mainRoom.history);
    socket.emit("room_joined", {
      success: true,
      usersCount: mainRoom.users.length
    });
    broadcastUserCount();
  });

  // Мессеж илгээх
  socket.on("send_message", (data) => {
    const messageData = {
      ...data
    };
    mainRoom.history.push(messageData);
    if (mainRoom.history.length > 100) mainRoom.history.shift();
    io.emit("receive_message", messageData);
  });

  // Гарсан үед
  socket.on("disconnect", () => {
    mainRoom.users = mainRoom.users.filter(id => id !== socket.id);
    broadcastUserCount();
    console.log(`User Disconnected: ${socket.id}`);
  });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});