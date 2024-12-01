import { redis } from '../controllers/socketController.js';
import util from 'util';
import { AppError } from './appError.js';
import User from '../db/userModel.js';
import GroupRoom from '../db/groupRoomModel.js';
import mongoose from 'mongoose';
import PrivateRoom from '../db/userToUserRoomModel.js';
import Messages from '../db/messagesModel.js';

//seek the reason for the user guts not show on the rooms

export const getUserObj = async (id, next) => {
  try {
    let userObj = await redis.get(id.toString());
    userObj = userObj && JSON.parse(userObj);

    if (!userObj)
      throw new AppError(
        'this user was not found on redis. searching in the data base...',
        404
      );
    return userObj;
  } catch (err) {
    console.error(err.message);
    const user = await User.findById(id)
      .populate('chatNotifications')
      .populate('serverNotifications');

    if (!user) {
      throw new AppError('user not found on data base', 404);
    }

    const [groupRooms, privateRooms] = await Promise.all([
      GroupRoom.find({ participants: new mongoose.Types.ObjectId(id) }),
      PrivateRoom.find({
        'participants.user': new mongoose.Types.ObjectId(id),
      }),
    ]);
    console.log('grupos e chats do usuario: ' + id);
    console.log(
      util.inspect(groupRooms, { depth: 'Infinity' }),
      util.inspect(privateRooms, { depth: 'Infinity' })
    );
    console.log('--------------------------------------');

    const userObj = {
      name: user.name,
      image: user.photo,
      id: user._id.toString(),
      rooms: [
        ...groupRooms.map((el) => el._id),
        ...privateRooms.map((el) => el._id),
      ],
      chatNotifications: user.chatNotifications,
      serverNotifications: user.serverNotifications,
    };

    await redis.set(user._id, JSON.stringify(userObj), 'EX', 60 * 60 * 24 * 1);
    return userObj;
  }
};

export const getRoomObj = async (key) => {
  try {
    let roomObj = await redis.get(key);
    roomObj = roomObj && JSON.parse(roomObj);

    if (!roomObj)
      throw new AppError(
        'this room was not found on redis. searching on the data base...',
        404
      );
    return roomObj;
  } catch (err) {
    let room;
    console.error(err);
    let messages = await Messages.find({ 'room.roomId': key });

    messages =
      messages.length > 0
        ? messages.map((el) => {
            return {
              content: el.content,
              sendedAt: el.sendedAt,
              sendedBy: { name: el.sendedBy.name, id: el.sendedBy.id },
              isFromGroup: el.isFromGroup,
              messageIndex: el.messageIndex,
            };
          })
        : [];
    if (key.startsWith('CHAT')) {
      room = await PrivateRoom.findById(key);
      if (!room) {
        throw new AppError('room not found on are data base', 404);
      }
      const roomObj = {
        messages: messages.slice(0, 100),
        doNotShowMessagesBeforeDateToThisUsers:
          room.doNotShowMessagesBeforeDateToThisUsers,
      };
      await redis.set(key, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 1);
      return roomObj;
    } else {
      room = await GroupRoom.findById(key);
      if (!room) {
        throw new AppError('room not found on are data base', 404);
      }
      const roomObj = {
        name: room.name,
        description: room.description,
        image: room.image,
        maybeParticipants: room.maybeParticipants.map((el) => el.toString()),
        participants: room.participants.map((el) => el.toString()),
        createdBy: room.createdBy.toString(),
        createdAt: room.createdAt,
        messages: messages.slice(0, 100),
        doNotShowMessagesBeforeDateToThisUsers:
          room.doNotShowMessagesBeforeDateToThisUsers,
      };
      await redis.set(key, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 1);
      return roomObj;
    }
  }
};
