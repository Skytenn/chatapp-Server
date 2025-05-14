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
  id: 'main',
  users: [],
  history: []
};

// Хэрэглэгчдийн тоог бүх хэрэглэгчид илгээх
const broadcastUserCount = () => {
  io.emit("room_users", mainRoom.users.length);
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  broadcastUserCount(); // Шинэ хэрэглэгч нэвтэрхэд тоог шинэчлэх

  // Өрөөнд нэгдэх логик
  socket.on("join_room", () => {
    // Хуучин өрөөнөөс гарах
    if (mainRoom.users.includes(socket.id)) {
      mainRoom.users = mainRoom.users.filter(id => id !== socket.id);
      socket.leave(mainRoom.id);
    }

    // Шинэ өрөөнд нэгдэх
    mainRoom.users.push(socket.id);
    socket.join(mainRoom.id);

    // Өрөөний түүхийг илгээх
    socket.emit("room_history", mainRoom.history);

    // Өрөөнд нэгдсэн мэдээлэл илгээх
    socket.emit("room_joined", { 
      success: true, 
      room: mainRoom.id, 
      usersCount: mainRoom.users.length 
    });

    // Бүх хэрэглэгчид шинэчилсэн тоог илгээх
    broadcastUserCount();
  });

  // Өрөөнөөс гарах логик
  socket.on("leave_room", () => {
    mainRoom.users = mainRoom.users.filter(id => id !== socket.id);
    io.to(mainRoom.id).emit("room_users", mainRoom.users.length);
    socket.leave(mainRoom.id);
  });

  // Мессеж илгээх логик
  socket.on("send_message", (data) => {
    const messageData = {
      ...data,
      room: mainRoom.id
    };
    mainRoom.history.push(messageData);
    
    // Хамгийн сүүлийн 100 мессежийг л хадгалах
    if (mainRoom.history.length > 100) {
      mainRoom.history.shift();
    }
    
    io.to(mainRoom.id).emit("receive_message", messageData);
  });

  // Холболт тасарсан үед
  socket.on("disconnect", () => {
    mainRoom.users = mainRoom.users.filter(id => id !== socket.id);
    console.log(`User Disconnected: ${socket.id}`);
    broadcastUserCount(); // Хэрэглэгч гарахад тоог шинэчлэх
  });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});