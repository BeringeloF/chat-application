import User from '../db/userModel.js';
import catchAsync from '../helpers/catchAsync.js';
import { AppError } from '../helpers/appError.js';
import { redis } from './socketController.js';
import multer from 'multer';
import { getUserObj, getRoomObj } from '../helpers/getObjFromRedis.js';
import path from 'node:path';
import xssFilters from 'xss-filters';
import PrivateRoom from '../db/userToUserRoomModel.js';
import Messages from '../db/messagesModel.js';
import GroupRoom from '../db/groupRoomModel.js';

export const getUsers = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.query.search) {
    filter = { $text: { $search: req.query.search } };
  }
  const users = await User.find(filter);

  const temp = users.filter((user) => user._id !== req.user._id);

  console.log(temp);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users: users.filter((user) => user._id !== req.user._id),
    },
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  let user;
  if (!req.query.redisUser) {
    user = await User.findById(req.params.userId);

    if (!user) return next(new AppError('user not found', 404));
  } else {
    user = await getUserObj(req.params.userId);
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  if (req.query.onlyId) {
    return res.status(200).json({
      status: 'success',
      userId: req.user._id.toString(),
    });
  }
  const user = await User.findById(req.user._id.toString());
  res.status(200).json({
    status: 'success',
    user,
  });
});

export const getNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id.toString());

  res.status(200).json({
    status: 'success',
    data: {
      chatNotifications: userObj.chatNotifications,
      serverNotifications: userObj.serverNotifications,
    },
  });
});

export const getServerNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id.toString());

  res.status(200).json({
    status: 'success',
    data: userObj.serverNotifications,
  });
});

async function markNotificationsAsVisualizedOnDB(
  room,
  myId,
  secondIdIfServerNotification = false
) {
  try {
    const user = await User.findById(myId);
    if (!secondIdIfServerNotification) {
      const index = user.chatNotifications.findIndex((el) => el.room === room);
      index > -1 &&
        user.chatNotifications.splice(index, 1) &&
        (await user.save({ validateBeforeSave: false }));
    } else {
      const index = user.serverNotifications.findIndex(
        (el) =>
          el.room === room || el.triggeredBy.id === secondIdIfServerNotification
      );
      console.log(user);
      index > -1 &&
        user.serverNotifications.splice(index, 1) &&
        (await user.save({ validateBeforeSave: false }));
      console.log(user);
    }
  } catch (err) {
    console.error(err);
  }
}
export const markNotificationsAsVisualized = catchAsync(
  async (req, res, next) => {
    const userObj = await getUserObj(req.user._id.toString());

    const { serverNotification } = req.query;

    if (!serverNotification) {
      markNotificationsAsVisualizedOnDB(req.params.room, req.user._id);
      const index = userObj.chatNotifications.findIndex(
        (el) => el.room === req.params.room
      );

      index > -1 && userObj.chatNotifications.splice(index, 1);
    } else {
      console.log(req.params);
      const id = req.params.room
        .split('-')
        .slice(1)
        .filter((id) => id !== req.user._id.toString())[0];

      console.log(userObj.name, userObj.serverNotifications, id);
      const index = userObj.serverNotifications.findIndex(
        (el) => el.room === req.params.room || el.triggeredBy.id === id
      );

      index > -1 && userObj.serverNotifications.splice(index, 1);
      markNotificationsAsVisualizedOnDB(req.params.room, req.user._id, id);
    }

    await redis.set(
      req.user._id.toString(),
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    );
    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

//Este filtro serve pra garantir que os unicos files que estao sendo carregados sao imagens
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!, please upload only images', 400), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/img/users/'); // Pasta onde os arquivos serão salvos
  },
  filename: (req, file, cb) => {
    cb(null, `user-image-${Date.now()}-${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
});

export const uploadUserImage = upload.single('photo');

export const getContacts = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id);
  const contactsPromises = userObj.rooms.map(async (room) => {
    const arr = room.split('-');
    if (arr.includes('CHAT')) {
      arr.splice(0, 1);
      const contact = arr.find((el) => el !== req.user._id.toString());
      return JSON.parse(await redis.get(contact));
    }
  });
  const contacts = (await Promise.all(contactsPromises)).filter((el) => el);
  res.status(200).json({
    status: 'success',
    data: contacts,
  });
});

export const deleteMessages = catchAsync(async (req, res, next) => {
  const room = req.params.room;
  const roomObj = await getRoomObj(room);
  roomObj.messages = [];
  await redis.set(room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const deleteNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.params.id);
  userObj.chatNotifications = [];
  userObj.serverNotifications = [];

  await redis.set(
    req.params.id,
    JSON.stringify(userObj),
    'EX',
    60 * 60 * 24 * 5
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const deleteMessagesUI = catchAsync(async (req, res, next) => {
  const roomObj = await getRoomObj(req.params.room);
  const date = Date.now() - 800;
  const obj = {
    date,
    user: req.user._id.toString(),
  };

  const roomFromDB = req.params.room.includes('CHAT')
    ? await PrivateRoom.findById(req.params.room)
    : await GroupRoom.findById(req.params.room);

  //get the participants of this room which could be a normal chat room or a group room
  const participants = req.params.room.includes('CHAT')
    ? req.params.room.split('-').slice(1)
    : roomObj.participants;

  //checking if all the participants has deleted a message at some point, if so get the first 'deleted message' obj
  //and realy delete all messages that were sent before this

  const index = roomObj.doNotShowMessagesBeforeDateToThisUsers.findIndex(
    (el) => el.user === req.user._id.toString()
  );

  // checking if it's this user has alredy deleted a message before, if so we gonna replace the old obj by the new one
  if (index > -1) {
    roomObj.doNotShowMessagesBeforeDateToThisUsers[index] = obj;
    roomFromDB.doNotShowMessagesBeforeDateToThisUsers[index] = {
      date,
      user: req.user._id,
    };
  } else {
    roomObj.doNotShowMessagesBeforeDateToThisUsers.push(obj);
    roomFromDB.doNotShowMessagesBeforeDateToThisUsers.push({
      date,
      user: req.user._id,
    });
  }

  const ids = roomObj.doNotShowMessagesBeforeDateToThisUsers.map(
    (obj) => obj.user
  );
  if (
    roomObj.doNotShowMessagesBeforeDateToThisUsers.length > 0 &&
    participants.every((id) => ids.includes(id))
  ) {
    const firstDeletedMessage =
      roomObj.doNotShowMessagesBeforeDateToThisUsers.sort((a, b) => {
        return a.date - b.date;
      })[0];
    roomObj.messages = roomObj.messages.filter(
      (msg) => msg.sendedAt > firstDeletedMessage.date
    );
    const deleted = await Messages.deleteMany({
      'room.roomId': req.params.room,
      sendedAt: { $lt: firstDeletedMessage.date },
    });
    console.log(
      'todos as messagems antes de certa data foram deletadas, deletetObj:',
      deleted
    );
  }

  await Promise.all([
    roomFromDB.save(),
    redis.set(req.params.room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
  ]);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const updateUserProfileImage = catchAsync(async (req, res, next) => {
  const [user, redisUser] = await Promise.all([
    User.findById(req.user._id),
    getUserObj(req.user._id.toString()),
  ]);

  user.photo = req.file.filename;
  redisUser.image = req.file.filename;
  await Promise.all([
    user.save({ validateBeforeSave: false }),
    redis.set(
      req.user._id.toString(),
      JSON.stringify(redisUser),
      'EX',
      60 * 60 * 24 * 5
    ),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      redisUser,
    },
  });
});

export const getMoreMessages = catchAsync(async (req, res, next) => {
  const messages = await Messages.find({
    'room.roomId': req.params.room,
    sendedAt: { $lt: req.query.date },
  }).limit(100);

  res.status(200).json({
    status: 'success',
    data: messages,
  });
});
