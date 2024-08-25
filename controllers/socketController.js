import User from "../db/userModel.js";
import Redis from "ioredis";
import { AppError } from "../helpers/appError.js";
import generateTemplate from "../helpers/generateTemplate.js";
import getUserObj from "../helpers/getUserObj.js";

export const redis = new Redis();
redis.on("error", (err) => {
  console.error("Erro ao conectar ao Redis:", err);
});

const createAndSendChatNotification = async (
  userId,
  targetUserId,
  io,
  room,
  msg
) => {
  try {
    const userObj = await getUserObj(targetUserId);

    const triggeredByUser = await User.findById(userId);
    const notificationObj = {
      room,
      preview: msg.slice(0, 22),
      sendedAt: Date.now(),
      triggeredBy: triggeredByUser,
      targetUserId,
      totalMessages: 1,
    };

    console.log(userObj, targetUserId);

    //if there is alredy a notification triggeredBy the same user we just incresse the totalMessages propertie and, replace the existing obj
    //by this new one

    const notificationIndex = userObj.chatNotifications.findIndex(
      (el) =>
        el.triggeredBy._id.toString() ===
        notificationObj.triggeredBy._id.toString()
    );
    console.log(notificationIndex);

    if (notificationIndex !== -1) {
      notificationObj.totalMessages =
        userObj.chatNotifications[notificationIndex].totalMessages + 1;
      userObj.chatNotifications[notificationIndex] = notificationObj;
    } else {
      userObj.chatNotifications.push(notificationObj);
    }
    //saving the target userObj with the newest notification
    await redis.set(targetUserId, JSON.stringify(userObj));
    console.log(io);
    console.log(targetUserId);
    io.to(targetUserId).emit("chatNotification", notificationObj);
  } catch (err) {
    console.error("ERROR MINE", err);
  }
};

const createAndSendServerNotification = () => {};

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
    if (!userId || !targetUserId)
      throw new AppError("some of the provided id is invalid!", 400);

    // Usar await para obter os valores
    const roomOneIsNotEmpty = await redis.get(`CHAT-${userId}-${targetUserId}`);
    const roomTwoIsNotEmpty = await redis.get(`CHAT-${targetUserId}-${userId}`);

    console.log("possiveis rooms", roomOneIsNotEmpty, roomTwoIsNotEmpty);

    let data, room;

    if (roomOneIsNotEmpty) {
      room = `CHAT-${userId}-${targetUserId}`;
      data = JSON.parse(roomOneIsNotEmpty);
    } else if (roomTwoIsNotEmpty) {
      room = `CHAT-${targetUserId}-${userId}`;
      data = JSON.parse(roomTwoIsNotEmpty);
    } else {
      room = `CHAT-${userId}-${targetUserId}`;
      const roomObj = {
        messages: [],
      };
      await redis.set(room, JSON.stringify(roomObj));
      console.log("Novo room criado e salvo.");
    }

    const userObj = await getUserObj(userId);
    if (!userObj.rooms.find((el) => el === room)) {
      userObj.rooms.push(room);
      redis.set(userId, JSON.stringify(userObj));
    }

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
      console.log("RESPOSTA:", res);
      redis.get(room, async (err, reply) => {
        if (err) {
          console.error("Erro ao obter o valor:", err);
        }
        console.log(reply);
        const roomObj = reply && JSON.parse(reply);
        const message = {
          content: msg,
          sendAt: Date.now(),
          sendBy: userId,
          messageIndex: roomObj.messages.length,
        };
        if (!res[0]?.arrived) {
          createAndSendChatNotification(userId, targetUserId, io, room, msg);
        }

        roomObj.messages.push(message);
        redis.set(room, JSON.stringify(roomObj));
      });

      callback({ status: "ok" });
    } catch (err) {
      console.error(err);
    }
  };
};

export const onChatWith = (socket, io, userId, joinedRooms) => {
  return async (targetUserId, callback) => {
    //verify if the users with the given ids exist
    try {
      [...joinedRooms].filter((room) => {
        if (room.includes("-")) {
          joinedRooms.delete(room);
          socket.leave(room);
        }
      });
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

export const onIssueInvitations = (socket, io, userId) => {
  return async (participants, room) => {
    console.log("SENDING INVITATIONS!");
    try {
      const { image, name } = await getUserObj(userId);
      await Promise.all([
        ...participants.map(async (el) => {
          console.log(el);
          const notification = {
            triggeredBy: {
              id: userId,
              image,
              name,
            },
            context: "invite to group",
            room,
            sendedAt: Date.now(),
            targetUserId: el,
          };

          const userObj = await getUserObj(el);
          userObj.serverNotifications.push(notification);
          await redis.set(el, JSON.stringify(userObj));
          io.to(el).emit("serverNotification", notification);
        }),
      ]);
    } catch (err) {
      console.error("ERROR MINE", err);
      socket.emit("appError", err);
    }
  };
};
