import User from "../db/userModel.js";
import Redis from "ioredis";
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

const createAndSendGroupNotification = async (userId, io, room, msg) => {
  let group = await redis.get(room);
  group = group && JSON.parse(group);
  const { participants } = group;
  const notificationObj = {
    room,
    groupData: group,
    preview: msg.slice(0, 22),
    sendedAt: Date.now(),
    triggeredBy: userId,
    totalMessages: 1,
    isFromGroup: true,
  };
  participants
    .filter((id) => id !== userId)
    .forEach(async (id) => {
      const userObj = await getUserObj(id);
      const notificationIndex = userObj.chatNotifications.findIndex(
        (el) =>
          el.room === notificationObj.room &&
          notificationObj.room.includes("GROUP")
      );
      if (notificationIndex !== -1) {
        notificationObj.totalMessages =
          userObj.chatNotifications[notificationIndex].totalMessages + 1;
        userObj.chatNotifications[notificationIndex] = notificationObj;
      } else {
        userObj.chatNotifications.push(notificationObj);
      }
      redis.set(id, JSON.stringify(userObj));
      console.log(id);
      io.to(id).emit("chatNotification", notificationObj);
    });
};

// Armazenar salas nas quais o socket está inscrito

export const joinToRoom = async (
  room,
  joinedRooms,
  socket,
  callback,
  userId
) => {
  if (!joinedRooms.has(room)) {
    socket.join(room);
    joinedRooms.add(room);
    console.log(`Usuário ${socket.id} inscrito na sala ${room}`);
    try {
      const roomJson = await redis.get(room);
      const roomObj = roomJson && JSON.parse(roomJson);
      const callbackObj = { status: "joined" };
      if (userId) {
        callbackObj.data = roomObj.messages;
        callbackObj.myId = userId;
      }
      if (callback) callback(callbackObj);
    } catch (err) {
      console.error("Error mine", err);
    }

    return true;
  } else {
    console.log(`Usuário ${socket.id} já está inscrito na sala ${room}`);
    if (callback) callback({ status: "alredy joined" });
  }
};

//function to be executed on the chat emiter
export const onChat = (socket, io, userId) => {
  return async (msg, room, callback) => {
    try {
      let targetUserId;
      if (room.includes("CHAT"))
        targetUserId = room
          .split("-")
          .slice(1)
          .filter((id) => id !== userId)[0];

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
          console.log("id do alvo da notificaçao", targetUserId);
          targetUserId &&
            (await createAndSendChatNotification(
              userId,
              targetUserId,
              io,
              room,
              msg
            ));
          targetUserId ||
            (await createAndSendGroupNotification(userId, io, room, msg));
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

export const onJoin = (socket, joinedRooms, userId) => {
  return (room, callback) => {
    [...joinedRooms].filter((room) => {
      if (room.includes("-")) {
        joinedRooms.delete(room);
        socket.leave(room);
      }
    });
    joinToRoom(room, joinedRooms, socket, callback, userId);
  };
};

export const onIssueInvitations = (socket, io, userId) => {
  return async (participants, room) => {
    console.log("SENDING INVITATIONS!");
    console.log(room);
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
