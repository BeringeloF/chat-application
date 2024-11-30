import User from '../db/userModel.js';
import Redis from 'ioredis';
import { getUserObj, getRoomObj } from '../helpers/getObjFromRedis.js';
import xssFilters from 'xss-filters';
import PrivateRoom from '../db/userToUserRoomModel.js';
import GroupRoom from '../db/groupRoomModel.js';
import Messages from '../db/messagesModel.js';

export const redis = new Redis({
  host: process.env.REDIS_HOST, // Host do Redis
  port: process.env.REDIS_PORT, // Porta do Redis
  password: process.env.REDIS_PASSWORD, // Senha do Redis (se necessário)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // Para conexões seguras
});

redis.on('error', (err) => {
  console.error('Erro ao conectar ao Redis:', err);
  redis.quit();
});

export const createAndSendChatNotification = async (
  userId,
  targetUserId,
  io,
  room,
  msg
) => {
  try {
    console.log(
      'UMA NOTIFICAÇAO FOI CHAMADA PARA SER EMITIDA PARA O CHAT',
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
        el.triggeredBy._id?.toString() ===
        notificationObj.triggeredBy._id.toString()
    );
    console.log(notificationIndex);

    if (notificationIndex > -1) {
      notificationObj.totalMessages =
        userObj.chatNotifications[notificationIndex].totalMessages + 1;
      userObj.chatNotifications[notificationIndex] = notificationObj;
    } else {
      userObj.chatNotifications.push(notificationObj);
    }
    saveNotificationOnDB(notificationObj, notificationIndex);
    //saving the target userObj with the newest notification
    await redis.set(
      targetUserId,
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    );
    console.log(targetUserId);
    io.to(targetUserId).emit('chatNotification', notificationObj);
  } catch (err) {
    console.error('ERROR MINE', err);
  }
};

async function saveNotificationOnDB(notification, index, id) {
  try {
    if (!notification?.isFromGroup) {
      const user = await User.findById(notification.targetUserId);
      if (index > -1) user.chatNotifications[index] = notification;
      else user.chatNotifications.push(notification);
      await user.save({ validateBeforeSave: false });
    }
    if (notification.isFromGroup) {
      const user = await User.findById(id);
      notification.groupData = notification.room;
      if (index > -1) user.chatNotifications[index] = notification;
      else user.chatNotifications.push(notification);
      await user.save({ validateBeforeSave: false });
    }
  } catch (err) {
    console.error('ERROR MINE', err);
  }
}

export const createAndSendGroupNotification = async (
  userId,
  io,
  room,
  msg,
  doNotSendToThisIds
) => {
  console.log(
    'UMA NOTIFICAÇAO FOI CHAMADA PARA SER EMITIDA PARA O GRUPO',
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
          notificationObj.room.includes('GROUP')
      );
      if (notificationIndex > -1) {
        notificationObj.totalMessages =
          userObj.chatNotifications[notificationIndex].totalMessages + 1;
        userObj.chatNotifications[notificationIndex] = notificationObj;
      } else {
        userObj.chatNotifications.push(notificationObj);
      }
      saveNotificationOnDB(notificationObj, notificationIndex, id);
      await redis.set(id, JSON.stringify(userObj), 'EX', 60 * 60 * 24 * 5);
      console.log(id);
      io.to(id).emit('chatNotification', notificationObj);
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
      const callbackObj = { status: 'joined' };
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
              ? 'me'
              : 'another user';
          console.log('this user was blocked by you or blocked you himself');
        }

        callbackObj.data = messages;
        callbackObj.myId = userId;
      }
      if (callback) callback(callbackObj);
    } catch (err) {
      console.error('Error mine', err);
    }

    return true;
  } else {
    console.log(`Usuário ${socket.id} já está inscrito na sala ${room}`);
    if (callback) callback({ status: 'alredy joined' });
  }
};

export const saveMessage = async (roomObj, message, room) => {
  roomObj.messages.length === 100 && roomObj.messages.shift();
  roomObj.messages.push(message);
  message.room = {
    roomId: room,
    roomType: message.isFromGroup ? 'GroupRoom' : 'PrivateRoom',
  };

  await Promise.all([
    Messages.create(message),
    redis.set(room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
  ]);
};

//function to be executed on the chat emiter
export const onChat = (socket, io, userId) => {
  return async (msg, room, callback) => {
    msg = xssFilters.inHTMLData(msg);
    try {
      let targetUserId;
      if (room.includes('CHAT'))
        targetUserId = room
          .split('-')
          .slice(1)
          .filter((id) => id !== userId)[0];

      const roomObj = await getRoomObj(room);

      if (roomObj.chatBlockedBy?.length > 0) {
        return callback({ status: 'failed' });
      }

      console.log('message: ' + msg);

      const user = await getUserObj(userId);
      const message = {
        sendedBy: { name: user.name, id: userId },
        content: msg,
        sendedAt: Date.now(),
        isFromGroup: targetUserId ? false : true,
      };

      //sending message
      const res = await socket.broadcast
        .to(room)
        .timeout(5000)
        .emitWithAck('chat', message);
      //res is an array, no matter if the message was sent into a group or not
      console.log('RESPOSTA:', res);

      message.messageIndex = roomObj.messages.at(-1)?.messageIndex + 1 || 1;

      //checking if the message was sent into a normal chat or in a group, and  if the message was visualized.
      // if the it was sent into a normal chat and the message wasn't visualized then send a notification to the targetUser
      if (targetUserId && !res[0]?.arrived) {
        console.log('id do alvo da notificaçao', targetUserId);

        await createAndSendChatNotification(
          userId,
          targetUserId,
          io,
          room,
          msg
        );
        //cheking if every participant of the group has visualized the message. if not get the ones who did, and send the notification to only the others
      } else if (res?.length < roomObj.participants?.length - 1) {
        //stores the ids of the users who alredy visualized the message
        const doNotSendToThisIds = res.map((el) => el.id);

        await createAndSendGroupNotification(
          userId,
          io,
          room,
          msg,
          doNotSendToThisIds
        );
      }
      saveMessage(roomObj, message, room);
      callback({ status: 'ok' });
    } catch (err) {
      console.error(err);
    }
  };
};

export const onJoin = (socket, joinedRooms, userId) => {
  return (room, callback) => {
    [...joinedRooms].filter((room) => {
      if (room.includes('-')) {
        joinedRooms.delete(room);
        socket.leave(room);
      }
    });
    joinToRoom(room, joinedRooms, socket, callback, userId);
  };
};

export const onSendChatInvitation = (io, userId) => {
  return async (targetUserId) => {
    try {
      if (userId === targetUserId) return;
      const { image, name } = await getUserObj(userId);
      const notification = {
        triggeredBy: {
          id: userId,
          image,
          name,
        },
        context: 'invite to chat',
        sendedAt: Date.now(),
        targetUserId,
      };
      const targetUserObj = await getUserObj(targetUserId);
      targetUserObj.serverNotifications.push(notification);
      io.to(targetUserId).emit('serverNotification', notification);
      const user = await User.findById(targetUserId);
      user.serverNotifications.push(notification);
      await Promise.all([
        redis.set(
          targetUserId,
          JSON.stringify(targetUserObj),
          'EX',
          60 * 60 * 24 * 5
        ),
        user.save({ validateBeforeSave: false }),
      ]);
    } catch (err) {
      console.error(err);
    }
  };
};

export const onIssueInvitations = (socket, io, userId) => {
  return async (participants, room, callback) => {
    console.log('SENDING INVITATIONS!');
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
            context: 'invite to group',
            room,
            sendedAt: Date.now(),
            targetUserId: el,
          };

          io.to(el).emit('serverNotification', notification);
          const userObj = await getUserObj(el);
          userObj.serverNotifications.push(notification);
          const user = await User.findById(el);
          user.serverNotifications.push(notification);

          await Promise.all([
            redis.set(el, JSON.stringify(userObj), 'EX', 60 * 60 * 24 * 5),
            user.save({ validateBeforeSave: false }),
          ]);
        }),
      ]);
      callback && callback({ status: 'ok' });
    } catch (err) {
      console.error('ERROR MINE', err);
    }
  };
};
