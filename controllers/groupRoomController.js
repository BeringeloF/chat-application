import catchAsync from '../helpers/catchAsync.js';
import { AppError } from '../helpers/appError.js';
import { redis } from './socketController.js';
import multer from 'multer';
import { getUserObj, getRoomObj } from '../helpers/getObjFromRedis.js';
import path from 'node:path';
import xssFilters from 'xss-filters';
import Messages from '../db/messagesModel.js';
import GroupRoom from '../db/groupRoomModel.js';

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!, please upload only images', 400), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/img/group/'); // Pasta onde os arquivos serão salvos
  },
  filename: (req, file, cb) => {
    cb(null, `group-image-${Date.now()}-${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
});

export const uploadGroupImage = upload.single('image');

export const createGroup = catchAsync(async (req, res, next) => {
  const date = Date.now();
  const room = `GROUP-${req.user._id.toString()}-${date}`;
  const maybeParticipants = req.body.participants
    .trim()
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => id);
  const roomObj = {
    name: req.body.name,
    image: req.file.filename,
    description: req.body.description,
    messages: [],
    doNotShowMessagesBeforeDateToThisUsers: [],
    maybeParticipants: [...maybeParticipants],
    participants: [req.user._id.toString()],
    createdBy: req.user._id.toString(),
    createdAt: date,
  };

  const groupRoom = {
    _id: room,
    name: req.body.name,
    image: req.file.filename,
    description: req.body.description,
    maybeParticipants: [...maybeParticipants],
    participants: [req.user._id],
    createdBy: req.user._id,
    createdAt: date,
  };

  const userObj = await getUserObj(req.user._id.toString());

  userObj.rooms.push(room);

  await Promise.all([
    redis.set(room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
    redis.set(
      req.user._id.toString(),
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    ),
    GroupRoom.create(groupRoom),
  ]);

  res.status(201).json({
    status: 'success',
    message: 'group created successfuly!',
    room,
    data: roomObj,
  });
});

export const updateGroup = catchAsync(async (req, res, next) => {
  const [groupObj, groupRoom] = await Promise.all([
    getRoomObj(req.params.room),
    GroupRoom.findById(req.params.room),
  ]);

  console.log('all good until now');

  req.body.participants = req.body.participants
    .trim()
    .split(' ')
    .filter((id) => id !== '');

  const newParticipants = req.body.participants.filter(
    (id) =>
      !groupObj.participants.includes(id) &&
      !groupObj.maybeParticipants.includes(id)
  );

  const participants = [...newParticipants, ...groupObj.maybeParticipants];

  groupRoom.maybeParticipants = participants;

  if (req.file) {
    groupObj.image = req.file.filename;
    groupRoom.image = req.file.filename;
  }

  groupObj.name = req.body.name || groupObj.name;
  groupRoom.name = groupObj.name = xssFilters.inHTMLData(groupObj.name);
  groupObj.description = req.body.description || groupObj.description;
  groupRoom.description = groupObj.description = xssFilters.inHTMLData(
    groupObj.description
  );
  groupObj.maybeParticipants = participants;

  await Promise.all([
    redis.set(
      req.params.room,
      JSON.stringify(groupObj),
      'EX',
      60 * 60 * 24 * 5
    ),
    groupRoom.save(),
  ]);
  res.status(200).json({
    status: 'success',
    data: groupObj,
  });
});

export const joinToGroup = catchAsync(async (req, res, next) => {
  console.log('funçao join to group foi chamada');
  const userObj = await getUserObj(req.user._id.toString());
  if (!(await redis.get(req.params.room)))
    return next(new AppError("coundn't find this group!", 404));

  if (userObj.rooms.find((el) => el === req.params.room))
    return next(new AppError('You are alredy joined to this group!', 400));

  userObj.rooms.push(req.params.room);

  console.log('CHEGOU AQUI? 1');
  console.log(req.params.room);

  let [roomObj, roomFromDB] = await Promise.all([
    redis.get(req.params.room),
    GroupRoom.findById(req.params.room),
  ]);

  console.log('apenas confirmando', roomObj);

  roomObj = roomObj && JSON.parse(roomObj);

  const index = roomObj.maybeParticipants.findIndex(
    (el) => el === req.user._id.toString()
  );
  const indexTwo = roomFromDB.maybeParticipants.findIndex(
    (el) => el.toString() === req.user._id.toString()
  );

  console.log(req.user._id, roomFromDB);

  if (indexTwo > -1) {
    roomFromDB.participants.push(roomFromDB.maybeParticipants[indexTwo]);
    console.log(roomFromDB.maybeParticipants[indexTwo]);
    console.log(roomFromDB);
    roomFromDB.maybeParticipants.splice(indexTwo, 1);
  }

  console.log('CHEGOU AQUI? 2');
  console.log(roomObj);
  console.log(index);

  if (index > -1) {
    roomObj.maybeParticipants.splice(index, 1);
    roomObj.participants.push(req.user._id.toString());
    console.log(roomObj);
  } else {
    return next(
      new AppError('an unexpected error occured, try again later!', 500)
    );
  }

  await Promise.all([
    redis.set(req.params.room, JSON.stringify(roomObj), 'EX', 60 * 60 * 24 * 5),
    roomFromDB.save(),
    redis.set(
      req.user._id.toString(),
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    ),
  ]);
  res.status(200).json({
    status: 'success',
    data: userObj,
    roomObj,
  });
});

export const getGroup = catchAsync(async (req, res, next) => {
  const groupJson = await redis.get(req.params.room);
  if (!groupJson) return next(new AppError('could not find this group!', 404));
  const group = JSON.parse(groupJson);

  if (req.query.getParticipantsObj) {
    const participantsPromise = group.participants.map(async (id) => {
      return await getUserObj(id);
    });
    const participants = await Promise.all(participantsPromise);
    group.participants = participants;
  }

  res.status(200).json({
    status: 'success',
    data: group,
  });
});

export const denyGroupInvitation = catchAsync(async (req, res, next) => {
  if (!(await redis.get(req.body.room))) {
    return next(new AppError("coundn't find this group!", 404));
  }

  const [groupObj, groupRoom] = await Promise.all([
    getRoomObj(req.body.room),
    GroupRoom.findById(req.body.room),
  ]);

  groupObj.maybeParticipants = groupObj.maybeParticipants.filter(
    (id) => id !== req.user._id.toString()
  );
  groupRoom.maybeParticipants = groupRoom.maybeParticipants.filter(
    (id) => id !== req.user._id
  );

  await Promise.all([
    redis.set(req.body.room, JSON.stringify(groupObj), 'EX', 60 * 60 * 24 * 5),
    groupRoom.save(),
  ]);

  res.status(200).json({
    status: 'success',
  });
});

export const removeInviteToGroup = catchAsync(async (req, res, next) => {
  const groupObj = await getRoomObj(req.params.room);

  if (!groupObj.maybeParticipants.includes(req.params.userId))
    return next(
      new AppError('there is no invite this user on the group!', 404)
    );

  groupObj.maybeParticipants = groupObj.maybeParticipants.filter(
    (id) => id !== req.params.userId
  );
  await redis.set(
    req.params.room,
    JSON.stringify(groupObj),
    'EX',
    60 * 60 * 24 * 5
  );
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const deleteGroup = catchAsync(async (req, res, next) => {
  const groupObj = await getRoomObj(req.params.room);
  groupObj.participants.forEach(async (id) => {
    try {
      const userObj = await getUserObj(id);
      const index = userObj.rooms.findIndex((room) => room === req.params.room);

      if (index > -1) userObj.rooms.splice(index, 1);
      await redis.set(id, JSON.stringify(userObj), 'EX', 60 * 60 * 24 * 5);
    } catch (err) {
      throw err;
    }
  });
  redis.del(req.params.room);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const getGroupParticipants = catchAsync(async (req, res, next) => {});

export const selectNewGroupAdminAndLeave = catchAsync(
  async (req, res, next) => {
    const [groupObj, userObj, groupRoomFromDB] = await Promise.all([
      getRoomObj(req.body.room),
      getUserObj(req.user._id.toString()),
      GroupRoom.findById(req.body.room),
    ]);

    if (
      req.user._id.toString() !== groupObj.createdBy &&
      req.user._id.toString() !== groupObj.admin
    )
      return next(
        new AppError('you do not have permission to perform this action!', 401)
      );

    const index = groupObj.participants.findIndex(
      (el) => el === req.user._id.toString()
    );
    const indexTwo = userObj.rooms.findIndex((el) => el === req.body.room);
    const indexFromDB = groupRoomFromDB.participants.findIndex(
      (el) => el.toString() === req.user._id.toString()
    );

    if (index > -1 && indexFromDB > -1 && indexTwo > -1) {
      groupObj.participants.splice(index, 1);
      groupRoomFromDB.participants.splice(indexFromDB, 1);
      userObj.rooms.splice(indexTwo, 1);
    } else {
      return next(new AppError('you have alredy leaved this group', 400));
    }

    const newAdmin = req.body.newAdmin;
    if (groupObj.participants.some((id) => id === newAdmin)) {
      groupRoomFromDB.admin = groupObj.admin = newAdmin;
    } else
      return next(
        new AppError(
          'this participant that you have selected is not part of the group!',
          400
        )
      );
    await Promise.all([
      redis.set(
        req.body.room,
        JSON.stringify(groupObj),
        'EX',
        60 * 60 * 24 * 5
      ),
      redis.set(
        req.user._id.toString(),
        JSON.stringify(userObj),
        'EX',
        60 * 60 * 24 * 5
      ),
      groupRoomFromDB.save(),
    ]);

    res.status(200).json({
      status: 'success',
      data: groupObj,
    });
  }
);

export const leaveGroup = catchAsync(async (req, res, next) => {
  const [groupObj, userObj, groupRoomFromDB] = await Promise.all([
    getRoomObj(req.params.room),
    getUserObj(req.user._id.toString()),
    GroupRoom.findById(req.params.room),
  ]);

  const index = groupObj.participants.findIndex(
    (el) => el === req.user._id.toString()
  );
  const indexTwo = userObj.rooms.findIndex((el) => el === req.params.room);

  const indexFromDB = groupRoomFromDB.participants.findIndex(
    (el) => el.toString() === req.user._id.toString()
  );

  if (index > -1 && indexFromDB > -1 && indexTwo > -1) {
    groupObj.participants.splice(index, 1);
    groupRoomFromDB.participants.splice(indexFromDB, 1);
    userObj.rooms.splice(indexTwo, 1);
  } else {
    return next(new AppError('you have alredy leaved this group', 400));
  }

  await Promise.all([
    redis.set(
      req.params.room,
      JSON.stringify(groupObj),
      'EX',
      60 * 60 * 24 * 5
    ),
    redis.set(
      req.user._id.toString(),
      JSON.stringify(userObj),
      'EX',
      60 * 60 * 24 * 5
    ),
    groupRoomFromDB.save(),
  ]);

  res.status(200).json({
    status: 'success',
    data: groupObj,
  });
});
