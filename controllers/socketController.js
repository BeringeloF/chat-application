import User from "../db/userModel.js";
import Redis from "ioredis";
import { AppError } from "../helpers/appError.js";
import generateTemplate from "../helpers/generateTemplate.js";

const redis = new Redis();
redis.on("error", (err) => {
  console.error("Erro ao conectar ao Redis:", err);
});

// Armazenar salas nas quais o socket está inscrito

export const joinToRoom = (room, joinedRooms, socket, callback) => {
  if (!joinedRooms.has(room)) {
    socket.join(room);
    joinedRooms.add(room);
    console.log(`Usuário ${socket.id} inscrito na sala ${room}`);
    if (callback) callback({ status: "joined" });

    return true;
  } else {
    console.log(`Usuário ${socket.id} já está inscrito na sala ${room}`);
    if (callback) callback({ status: "alredy joined" });
  }
};

const getOrSetValues = async (userId, targetUserId) => {
  try {
    // Usar await para obter os valores
    const roomOneIsNotEmpty = await redis.get(`${userId}-${targetUserId}`);
    const roomTwoIsNotEmpty = await redis.get(`${targetUserId}-${userId}`);

    console.log("possiveis rooms", roomOneIsNotEmpty, roomTwoIsNotEmpty);

    let data, room;

    if (roomOneIsNotEmpty) {
      room = `${userId}-${targetUserId}`;
      data = JSON.parse(roomOneIsNotEmpty);
    } else if (roomTwoIsNotEmpty) {
      room = `${targetUserId}-${userId}`;
      data = JSON.parse(roomTwoIsNotEmpty);
    } else {
      room = `${userId}-${targetUserId}`;
      const roomObj = {
        messages: [],
      };
      await redis.set(room, JSON.stringify(roomObj));
      console.log("Novo room criado e salvo.");
    }

    // Continue com a lógica após a operação Redis
    console.log("Room:", room);
    console.log("Data:", data);
    return [room, data];
  } catch (err) {
    console.error("Erro ao obter valores ou definir chave:", err);
  }
};

//function to be executed on the chat emiter
export const onChat = (socket, io, userId) => {
  return async (msg, targetUserId, callback) => {
    if (userId.toString() === targetUserId) return;

    let room;
    try {
      [room] = await getOrSetValues(userId, targetUserId);

      console.log("message: " + msg);
      //sending message
      const res = await socket.broadcast
        .to(room)
        .timeout(5000)
        .emitWithAck("chat", msg);
      // if messagem did not arrive send a notification to the targetUser
      if (!res.arrived) {
        const triggeredByUser = await User.findById(userId);
        const notificationObj = {
          room,
          preview: msg,
          sendAt: Date.now(),
          triggeredBy: triggeredByUser,
          targetUserId,
          totalMessages: 1,
        };
        const notifiRes = io
          .to(targetUserId)
          .timeout(5000)
          .emitWithAck("notification", notificationObj);
        //if the notication did not arrive this mean the the user is offline so we need to save the notication at the target user obj
        if (!notifiRes.arrived) {
          let userObj = await redis.get(targetUserId);
          userObj = JSON.parse(userObj);
          console.log(userObj, targetUserId);

          //if there is alredy a notification triggeredBy the same user we just incresse the totalMessages propertie and, replace the existing obj
          //by this new one
          const notificationIndex = userObj.notification.findIndex(
            (el) => el.triggeredBy === notificationObj.triggeredBy
          );

          if (notificationIndex !== -1) {
            notificationObj.totalMessages =
              userObj.notification[notificationIndex].totalMessages + 1;
            userObj.notification[notificationIndex] = notificationObj;
          } else {
            userObj.notification.push(notificationObj);
          }

          //saving the target userObj with the newest notification
          await redis.set(targetUserId, JSON.stringify(userObj));
        }
      }
    } catch (err) {
      console.error(err);
    }

    redis.get(room, (err, reply) => {
      if (err) {
        console.error("Erro ao obter o valor:", err);
      }
      const roomObj = reply && JSON.parse(reply);
      const message = {
        content: msg,
        sendAt: Date.now(),
        sendBy: userId,
        messageIndex: roomObj.messages.length,
      };
      roomObj.messages.push(message);
      redis.set(room, JSON.stringify(roomObj));
    });

    callback({ status: "ok" });
  };
};

export const onChatWith = (socket, io, userId, joinedRooms) => {
  return async (targetUserId, callback) => {
    //verify if the users with the given ids exist
    try {
      const targetUser = await User.findById(targetUserId);

      if (!targetUser) throw new AppError("could not find this user!", 404);

      if (userId.toString() === targetUserId) return;

      //if it's the first time they are chating

      const [room, data] = await getOrSetValues(userId, targetUserId);

      //create room for them
      if (joinToRoom(room, joinedRooms, socket)) {
        callback({
          status: "joined",
          data: data && generateTemplate(data.messages, userId),
        });
        io.to(targetUserId).emit("inviteToRoom", room);
        console.log("era para ter ido");
      } else {
        callback({
          status: "alredy joined",
          data: data && generateTemplate(data.messages, userId),
        });
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
};

export const onJoin = (socket, joinedRooms) => {
  return (room, callback) => {
    joinToRoom(room, joinedRooms, socket, callback);
  };
};

export const onGetNotification = async (userId, callback) => {
  try {
    const json = await redis.get(userId);
    const userObj = JSON.parse(json);
    callback({
      notifications: userObj.notification,
    });
  } catch (err) {
    console.error(err);
  }
};
