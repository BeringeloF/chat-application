import User from "../db/userModel.js";
import catchAsync from "../helpers/catchAsync.js";
import { AppError } from "../helpers/appError.js";
import { redis } from "./socketController.js";
import multer from "multer";
import { getUserObj, getRoomObj } from "../helpers/getObjFromRedis.js";
import path from "node:path";

export const getUsers = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.query.search) {
    filter = { $text: { $search: req.query.search } };
  }
  const users = await User.find(filter);

  const temp = users.filter((user) => user._id !== req.user._id);

  console.log(temp);

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users: users.filter((user) => user._id !== req.user._id),
    },
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  let user = await User.findById(req.params.userId);

  if (!user) return next(new AppError("user not found", 404));

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    userId: req.user._id.toString(),
  });
});

export const getNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id.toString());

  res.status(200).json({
    status: "success",
    data: {
      chatNotifications: userObj.chatNotifications,
      serverNotifications: userObj.serverNotifications,
    },
  });
});

export const getServerNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id.toString());

  res.status(200).json({
    status: "success",
    data: userObj.serverNotifications,
  });
});

export const markNotificationsAsVisualized = catchAsync(
  async (req, res, next) => {
    const userObj = await getUserObj(req.user._id.toString());

    const { serverNotification } = req.query;

    if (!serverNotification) {
      const index = userObj.chatNotifications.findIndex(
        (el) => el.room === req.params.room
      );

      index > -1 && userObj.chatNotifications.splice(index, 1);
    } else {
      console.log(req.params);
      const id = req.params.room
        .split("-")
        .slice(1)
        .filter((id) => id !== req.user._id.toString())[0];

      console.log(userObj.name, userObj.serverNotifications, id);
      const index = userObj.serverNotifications.findIndex(
        (el) => el.room === req.params.room || el.triggeredBy.id === id
      );

      index > -1 && userObj.serverNotifications.splice(index, 1);
    }

    redis.set(req.user._id.toString(), JSON.stringify(userObj));
    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

//Este filtro serve pra garantir que os unicos files que estao sendo carregados sao imagens
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image!, please upload only images", 400), false);
  }
};

//Agora para salvar apenas na memoria com um buffer nos fazer assim
//Entao a imagem estara salva em req.file.buffer

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/img/group/"); // Pasta onde os arquivos serão salvos
  },
  filename: (req, file, cb) => {
    cb(null, `group-image-${Date.now()}-${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
});

export const uploadGroupImage = upload.single("image");

export const createGroup = catchAsync(async (req, res, next) => {
  const date = Date.now();
  const room = `GROUP-${req.user._id.toString()}-${date}`;
  const participants = req.body.participants
    .trim()
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => id);
  const roomObj = {
    name: req.body.name,
    image: req.file.filename,
    description: req.body.description,
    messages: [],
    doNotShowMessagesBeforeDateToThisUsers: [],
    maybeParticipants: [...participants],
    participants: [req.user._id.toString()],
    createdBy: req.user._id.toString(),
    createdAt: date,
  };

  const userObj = await getUserObj(req.user._id.toString());

  userObj.rooms.push(room);

  await Promise.all([
    redis.set(room, JSON.stringify(roomObj)),
    redis.set(req.user._id.toString(), JSON.stringify(userObj)),
  ]);

  res.status(201).json({
    status: "success",
    message: "group created successfuly!",
    room,
    data: roomObj,
  });
});

export const updateGroup = catchAsync(async (req, res, next) => {
  const groupObj = await getRoomObj(req.params.room);
  req.body.participants = req.body.participants
    .trim()
    .split(" ")
    .filter((id) => id !== "");

  const newParticipants = req.body.participants.filter(
    (id) =>
      !groupObj.participants.includes(id) &&
      !groupObj.maybeParticipants.includes(id)
  );

  const participants = [...newParticipants, ...groupObj.maybeParticipants];

  if (req.file) groupObj.image = req.file.filename;

  groupObj.name = req.body.name || groupObj.name;
  groupObj.description = req.body.description || groupObj.description;
  groupObj.maybeParticipants = participants;

  redis.set(req.params.room, JSON.stringify(groupObj));
  res.status(200).json({
    status: "success",
    data: groupObj,
  });
});

export const joinToGroup = catchAsync(async (req, res, next) => {
  console.log("funçao join to group foi chamada");
  const userObj = await getUserObj(req.user._id.toString());
  if (!(await redis.get(req.params.room)))
    return next(new AppError("invalid group room!", 400));

  if (userObj.rooms.find((el) => el === req.params.room))
    return next(new AppError("You are alredy joined to this group!", 400));

  userObj.rooms.push(req.params.room);

  console.log("CHEGOU AQUI? 1");
  console.log(req.params.room);

  let [_, roomObj] = await Promise.all([
    redis.set(req.user._id.toString(), JSON.stringify(userObj)),
    redis.get(req.params.room),
  ]);

  console.log("apenas confirmando", roomObj);

  roomObj = roomObj && JSON.parse(roomObj);

  const index = roomObj.maybeParticipants.findIndex(
    (el) => el === req.user._id.toString()
  );
  console.log("CHEGOU AQUI? 2");
  console.log(roomObj);
  console.log(index);

  if (index > -1) {
    roomObj.maybeParticipants.splice(index, 1);
    roomObj.participants.push(req.user._id.toString());
    console.log(roomObj);
    await redis.set(req.params.room, JSON.stringify(roomObj));
  } else {
    return next(
      new AppError("an unexpected error occured, try again later!", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: userObj,
    roomObj,
  });
});

export const getContacts = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id);
  const contactsPromises = userObj.rooms.map(async (room) => {
    const arr = room.split("-");
    if (arr.includes("CHAT")) {
      arr.splice(0, 1);
      const contact = arr.find((el) => el !== req.user._id.toString());
      return JSON.parse(await redis.get(contact));
    }
  });
  const contacts = (await Promise.all(contactsPromises)).filter((el) => el);
  res.status(200).json({
    status: "success",
    data: contacts,
  });
});

export const createChat = catchAsync(async (req, res, next) => {
  console.log(req.body);
  if (req.body.id === req.user._id.toString())
    return next(
      new AppError(
        "Error!, why are you trying to create a chat with yourself?",
        400
      )
    );
  const targetUser = await User.findById(req.body.id);
  if (!targetUser) return next(new AppError("this user does not exist!", 404));
  const room = `CHAT-${req.user._id}-${targetUser._id}`;

  if (await redis.get(room)) {
    return res.status(409).json({
      status: "failed!",
      message: "this chat has alredy been created",
    });
  }

  const usersObj = await Promise.all([
    getUserObj(req.user._id.toString()),
    getUserObj(targetUser._id.toString()),
  ]);

  usersObj.forEach((el) => {
    el.rooms.push(room);
  });

  const roomObj = {
    messages: [],
    doNotShowMessagesBeforeDateToThisUsers: [],
  };

  await Promise.all([
    redis.set(req.user._id.toString(), JSON.stringify(usersObj[0])),
    redis.set(targetUser._id.toString(), JSON.stringify(usersObj[1])),
    redis.set(room, JSON.stringify(roomObj)),
  ]);

  res.status(201).json({
    status: "success",
    room,
  });
});

export const getGroup = catchAsync(async (req, res, next) => {
  const groupJson = await redis.get(req.params.room);
  if (!groupJson) return next(new AppError("could not find this group!", 404));
  const group = JSON.parse(groupJson);

  res.status(200).json({
    status: "success",
    data: group,
  });
});

export const deleteMessages = catchAsync(async (req, res, next) => {
  const room = req.params.room;
  const roomObj = await getRoomObj(room);
  roomObj.messages = [];
  await redis.set(room, JSON.stringify(roomObj));

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const deleteNotifications = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.params.id);
  userObj.chatNotifications = [];
  userObj.serverNotifications = [];

  await redis.set(req.params.id, JSON.stringify(userObj));

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const denyGroupInvitation = catchAsync(async (req, res, next) => {
  const groupObj = await getRoomObj(req.body.room);

  groupObj.maybeParticipants = groupObj.maybeParticipants.filter(
    (id) => id !== req.user._id.toString()
  );

  redis.set(req.body.room, JSON.stringify(groupObj));

  res.status(200).json({
    status: "success",
  });
});

export const removeInviteToGroup = catchAsync(async (req, res, next) => {
  const groupObj = await getRoomObj(req.params.room);

  if (!groupObj.maybeParticipants.includes(req.params.userId))
    return next(
      new AppError("there is no invite this user on the group!", 404)
    );

  groupObj.maybeParticipants = groupObj.maybeParticipants.filter(
    (id) => id !== req.params.userId
  );
  redis.set(req.params.room, JSON.stringify(groupObj));
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const deleteMessagesUI = catchAsync(async (req, res, next) => {
  const roomObj = await getRoomObj(req.params.room);

  const obj = {
    date: Date.now() - 800,
    user: req.user._id.toString(),
  };

  //get the participants of this room which could be a normal chat room or a group room
  const participants = req.params.room.includes("CHAT")
    ? req.params.room.split("-").slice(1)
    : roomObj.participants;

  //checking if all the participants has exclude a message at some point, if so get the first 'exclude message' obj
  //and realy exclude all messages that were sended before this

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
  }

  const index = roomObj.doNotShowMessagesBeforeDateToThisUsers.findIndex(
    (el) => el.user === req.user._id.toString()
  );

  // checking if it's this user has alredy exclude a message before, if so we gonna replace the old obj by the new one
  if (index > -1) roomObj.doNotShowMessagesBeforeDateToThisUsers[index] = obj;
  else roomObj.doNotShowMessagesBeforeDateToThisUsers.push(obj);

  redis.set(req.params.room, JSON.stringify(roomObj));

  res.status(204).json({
    status: "success",
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
      redis.set(id, JSON.stringify(userObj));
    } catch (err) {
      throw err;
    }
  });
  redis.del(req.params.room);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
