const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
let roomCounter = 1;

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Өрөөнд нэгдэх логик
  socket.on("join_room", () => {
    let assignedRoom = null;
    let oldRoom = null;

    // Одоогийн өрөөнөөс гарна
    for (const room in rooms) {
      if (rooms[room]?.includes(socket.id)) {
        oldRoom = room;
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
        io.to(room).emit("room_users", rooms[room].length);
        socket.leave(room);
      }
    }

    // 1 хэрэглэгчтэй өрөө олно
    for (const room in rooms) {
      if (rooms[room]?.length === 1) {
        assignedRoom = room;
        break;
      }
    }

    if (assignedRoom) {
      if (!rooms[assignedRoom]) {
        rooms[assignedRoom] = [];
      }
      rooms[assignedRoom].push(socket.id);
      socket.join(assignedRoom);
      const usersCount = rooms[assignedRoom].length;
      io.to(assignedRoom).emit("room_users", usersCount);

      // Өрөөний түүхийг илгээх
      if (rooms[assignedRoom].history) {
        socket.emit("room_history", rooms[assignedRoom].history);
      }

      socket.emit("room_joined", { success: true, room: assignedRoom, usersCount });
    } else {
      // Шинэ өрөө үүсгэх
      assignedRoom = `room_${roomCounter}`;
      rooms[assignedRoom] = [socket.id];
      rooms[assignedRoom].history = []; // Мессежний түүхийг хадгалах массив
      roomCounter++;

      socket.join(assignedRoom);
      socket.emit("room_joined", { success: true, room: assignedRoom, usersCount: 1 });
      socket.emit("room_users", 1);
    }
  });

  // Өрөөнөөс гарах логик
  socket.on("leave_room", (room) => {
    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      io.to(room).emit("room_users", rooms[room].length);
      if (rooms[room].length === 0) {
        delete rooms[room]; // Хэрэв өрөө хоосон бол устгах
      }
    }
    socket.leave(room);
  });

  // Мессеж илгээх логик
  socket.on("send_message", (data) => {
    if (!rooms[data.room]) {
      rooms[data.room] = { history: [] }; // Хэрэв өрөө байхгүй бол үүсгэнэ
    }

    if (!rooms[data.room].history) {
      rooms[data.room].history = []; // Хэрэв history байхгүй бол үүсгэнэ
    }

    rooms[data.room].history.push(data); // Мессежийг түүхэнд нэмэх
    io.to(data.room).emit("receive_message", data);
  });

  // Холболт тасарсан үед
  socket.on("disconnect", () => {
    for (const room in rooms) {
      if (rooms[room]?.includes(socket.id)) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
        io.to(room).emit("room_users", rooms[room].length);

        if (rooms[room].length === 0) {
          delete rooms[room]; // Хэрэв өрөө хоосон бол устгах
        }
      }
    }
    console.log("User Disconnected", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});