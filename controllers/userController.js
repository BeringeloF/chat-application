import User from "../db/userModel.js";
import catchAsync from "../helpers/catchAsync.js";
import { AppError } from "../helpers/appError.js";
import { redis } from "./socketController.js";
import multer from "multer";
import getUserObj from "../helpers/getUserObj.js";

export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
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

    const index = userObj.chatNotifications.findIndex(
      (el) => el.triggeredBy._id.toString() === req.params.triggeredById
    );

    index > -1 && userObj.chatNotifications.splice(index, 1);

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
    cb(null, "./public/img/group-images/"); // Pasta onde os arquivos serão salvos
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
    .map((id) => id);
  const roomObj = {
    name: req.body.name,
    imageCover: req.file.filename,
    messages: [],
    maybeParticipants: [...participants],
    participants: [req.user._id.toString()],
    createdBy: req.user._id.toString(),
    createdAt: date,
  };

  const userObj = await getUserObj(req.user._id.toString());

  userObj.rooms.push(room);

  await Promise.all([
    redis.set(room, JSON.stringify(roomObj)),
    redis.set(req.user._id.toString(), JSON.parse(userObj)),
  ]);

  res.status(201).json({
    status: "success",
    message: "group created successfuly!",
    room,
    data: roomObj,
  });
});

export const joinToGroup = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id.toString());
  if (!(await redis.get(req.params.room)))
    return next(new AppError("invalid group room!", 400));

  if (userObj.rooms.find((el) => el === req.params.room))
    return next(new AppError("You are alredy joined to this group!", 400));

  userObj.rooms.push(req.params.room);

  let [, , roomObj] = await Promise.all([
    redis.set(req.user._id.toString(), JSON.stringify(userObj)),
    redis.get(req.params.room),
  ]);

  roomObj = roomObj && JSON.parse(roomObj);

  const index = roomObj.maybeParticipants.findIndex(
    (el) => el === req.user._id.toString()
  );

  if (index > -1) {
    roomObj.maybeParticipants.splice(index, 1);
    roomObj.participants.push(req.user._id.toString());
    await redis.set(req.params.room, JSON.stringify(roomObj));
  } else {
    return next(
      new AppError("an unexpected error occured, try again later!", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: userObj,
  });
});

export const getChats = catchAsync(async (req, res, next) => {
  const userObj = await getUserObj(req.user._id);
  const chats = userObj.rooms.map((room) => {
    const arr = room.split("-");
    if (arr.includes("CHAT")) {
      arr.splice(0, 1);
      const chat = arr.find((el) => el !== req.user._id);
      return chat;
    } else {
      return room;
    }
  });
  res.status(200).json({
    status: "success",
    data: chats,
  });
});
