import { Server } from "socket.io";
import {
  onChat,
  onChatWith,
  onJoin,
  joinToRoom,
} from "./controllers/socketController.js";
import server from "./app.js";
import mongoose from "mongoose";

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

const io = new Server(server, { connectionStateRecovery: {} });

mongoose.connect(DB).then(() => {
  console.log("DB connected");
  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("createRoomWithServer", (userId) => {
      let joinedRooms = new Set();
      joinToRoom(userId, joinedRooms, socket);
      socket.on("join", onJoin(socket, joinedRooms));
      socket.on("chat", onChat(socket, io, userId));
      socket.on("chat with", onChatWith(socket, io, userId, joinedRooms));
      socket.on('createGroup', onCreateGroup(socket, io, userId, joinedRooms))
     
    });
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
});

const port = process.env.PORT || 3000;

const servidor = server.listen(port, () => {
  console.log("server running on port " + port);
});
