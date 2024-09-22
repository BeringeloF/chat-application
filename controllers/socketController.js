import User from "../db/userModel.js";
import Redis from "ioredis";
import { getUserObj, getRoomObj } from "../helpers/getObjFromRedis.js";

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
    console.log(
      "UMA NOTIFICAÇAO FOI CHAMADA PARA SER EMITIDA PARA O CHAT",
      room
    );
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
    console.log(targetUserId);
    io.to(targetUserId).emit("chatNotification", notificationObj);
  } catch (err) {
    console.error("ERROR MINE", err);
  }
};

const createAndSendGroupNotification = async (
  userId,
  io,
  room,
  msg,
  doNotSendToThisIds
) => {
  console.log(
    "UMA NOTIFICAÇAO FOI CHAMADA PARA SER EMITIDA PARA O GRUPO",
    room
  );
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
    .filter((id) => !doNotSendToThisIds.includes(id))
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
      const roomObj = await getRoomObj(room);
      const callbackObj = { status: "joined" };
      if (userId) {
        const index = roomObj.doNotShowMessagesBeforeDateToThisUsers.findIndex(
          (el) => el.user === userId
        );
        const messages =
          index > -1
            ? roomObj.messages.filter(
                (msg) =>
                  msg.sendedAt >
                  roomObj.doNotShowMessagesBeforeDateToThisUsers[index].date
              )
            : roomObj.messages;
        console.log(roomObj.chatBlockedBy?.length > 0);
        if (roomObj.chatBlockedBy?.length > 0) {
          callbackObj.chatBlockedBy =
            roomObj.chatBlockedBy[0] === userId ||
            roomObj.chatBlockedBy[1] === userId
              ? "me"
              : "another user";
          console.log("this user was blocked by you or blocked you himself");
        }

        callbackObj.data = messages;
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

      const roomObj = await getRoomObj(room);
      if (roomObj.chatBlockedBy?.length > 0)
        return callback({ status: "failed" });
      console.log("message: " + msg);

      const user = await getUserObj(userId);
      const message = {
        sendedBy: { name: user.name, id: userId },
        content: msg,
        sendedAt: Date.now(),
      };

      message.isFromGroup = targetUserId ? false : true;
      //sending message
      const res = await socket.broadcast
        .to(room)
        .timeout(5000)
        .emitWithAck("chat", message);
      console.log("RESPOSTA:", res);

      message.messageIndex = roomObj.messages.length;

      if (targetUserId && !res[0]?.arrived) {
        console.log("id do alvo da notificaçao", targetUserId);

        await createAndSendChatNotification(
          userId,
          targetUserId,
          io,
          room,
          msg
        );
      } else if (res?.length < roomObj.participants?.length - 1) {
        const doNotSendToThisIds = res.map((el) => el.id);
        await createAndSendGroupNotification(
          userId,
          io,
          room,
          msg,
          doNotSendToThisIds
        );
      }

      roomObj.messages.push(message);
      redis.set(room, JSON.stringify(roomObj));

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

export const onSendChatInvitation = (io, userId) => {
  return async (targetUserId) => {
    if (userId === targetUserId) return;
    const { image, name } = await getUserObj(userId);
    const notification = {
      triggeredBy: {
        id: userId,
        image,
        name,
      },
      context: "invite to chat",
      sendedAt: Date.now(),
      targetUserId,
    };
    const targetUserObj = await getUserObj(targetUserId);
    targetUserObj.serverNotifications.push(notification);
    io.to(targetUserId).emit("serverNotification", notification);
    redis.set(targetUserId, JSON.stringify(targetUserObj));
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
    }
  };
};
