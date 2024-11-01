import User from '../db/userModel.js';
import catchAsync from '../helpers/catchAsync.js';
import { AppError } from '../helpers/appError.js';
import { redis } from './socketController.js';
import { getUserObj, getRoomObj } from '../helpers/getObjFromRedis.js';
import path from 'node:path';
import xssFilters from 'xss-filters';
import PrivateRoom from '../db/userToUserRoomModel.js';
import Messages from '../db/messagesModel.js';

export const createChat = catchAsync(async (req, res, next) => {
  console.log(req.body);
  if (req.body.id === req.user._id.toString())
    return next(
      new AppError(
        'Error!, why are you trying to create a chat with yourself?',
        400
      )
    );
  const targetUser = await User.findById(req.body.id);
  if (!targetUser) return next(new AppError('this user does not exist!', 404));
  const room = `CHAT-${req.user._id.toString()}-${targetUser._id.toString()}`;

  if (await redis.get(room)) {
    return res.status(409).json({
      status: 'failed!',
      message: 'this chat has alredy been created',
    });
  }
  const usersObj = await Promise.all([
    getUserObj(req.user._id.toString()),
    getUserObj(targetUser._id.toString()),
  ]);

  const dbRoom = {
    _id: room,
    participants: [
      {
        user: req.user._id,
        image: usersObj[0].image,
      },
      {
        user: targetUser._id,
        image: usersObj[1].image,
      },
    ],
  };

  usersObj.forEach((el) => {
    el.rooms.push(room);
  });

  const roomObj = {
    messages: [],
    doNotShowMessagesBeforeDateToThisUsers: [],
  };

  await Promise.all([
    redis.set(
      req.user._id.toString(),
      JSON.stringify(usersObj[0]),
      'EX',
      60 * 60 * 24 * 5
    ),
    redis.set(
      targetUser._id.toString(),
      JSON.stringify(usersObj[1]),
      'EX',
      60 * 60 * 24 * 5
    ),
    redis.set(room, JSON.stringify(roomObj)),
    PrivateRoom.create(dbRoom),
  ]);

  res.status(201).json({
    status: 'success',
    room,
    data: dbRoom,
  });
});

export const blockUser = catchAsync(async (req, res, next) => {
  const [roomObj, roomFromDB] = await Promise.all([
    getRoomObj(req.params.room),
    PrivateRoom.findById(req.params.room),
  ]);

  if (!roomObj.chatBlockedBy) {
    roomObj.chatBlockedBy = [req.user._id.toString()];
  } else {
    roomObj.chatBlockedBy.push(req.user._id.toString());
  }
  roomFromDB.chatBlockedBy.push(req.user._id.toString());

  await Promise.all([
    redis.set(req.params.room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
    roomFromDB.save(),
  ]);
  res.status(200).json({
    status: 'success',
  });
});

export const getChat = catchAsync(async (req, res, next) => {
  const chat = await getRoomObj(req.params.room);

  res.status(200).json({
    status: 'success',
    data: chat,
  });
});

export const unblockUser = catchAsync(async (req, res, next) => {
  const [roomObj, roomFromDB] = await Promise.all([
    getRoomObj(req.params.room),
    PrivateRoom.findById(req.params.room),
  ]);
  const index = roomObj.chatBlockedBy.findIndex(
    (el) => el === req.user._id.toString()
  );
  index > -1 &&
    roomObj.chatBlockedBy.splice(index, 1) &&
    roomFromDB.chatBlockedBy.splice(index, 1);

  await Promise.all([
    redis.set(req.params.room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
    roomFromDB.save(),
  ]);
  res.status(200).json({
    status: 'success',
  });
});

export const deleteRoom = catchAsync(async (req, res, next) => {
  const idOne = req.params.room.split('-')[1];
  const idTwo = req.params.room.split('-')[2];
  const [userOne, userTwo] = await Promise.all([
    getUserObj(idOne),
    getUserObj(idTwo),
  ]);
  const indexOne = userOne.rooms.findIndex((room) => room === req.params.room);
  indexOne > -1 && userOne.rooms.splice(indexOne, 1);
  console.log('Apos deletar room:', req.params.room, userOne, indexOne);
  const indexTwo = userTwo.rooms.findIndex((room) => room === req.params.room);
  indexTwo > -1 && userTwo.rooms.splice(indexTwo, 1);
  console.log('Apos deletar room:', req.params.room, userTwo, indexTwo);
  await Promise.all([
    redis.set(idOne, JSON.stringify(userOne), 'EX', 60 * 60 * 24 * 5),
    redis.set(idTwo, JSON.stringify(userTwo), 'EX', 60 * 60 * 24 * 5),
    redis.del(req.params.room),
  ]);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
