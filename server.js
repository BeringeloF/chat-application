import { Server } from "socket.io";
import {
  onChat,
  onJoin,
  joinToRoom,
  onIssueInvitations,
  onSendChatInvitation,
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
    socket.on("createRoomWithServer", async (userId) => {
      let joinedRooms = new Set();
      await joinToRoom(userId, joinedRooms, socket);
      socket.on("join", onJoin(socket, joinedRooms, userId));
      socket.on("chat", onChat(socket, io, userId));
      socket.on("issueInvitations", onIssueInvitations(socket, io, userId));
      socket.on("sendChatInvitation", onSendChatInvitation(io, userId));
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
