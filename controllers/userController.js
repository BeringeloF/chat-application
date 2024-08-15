import User from "../db/userModel.js";
import catchAsync from "../helpers/catchAsync.js";
import { AppError } from "../helpers/appError.js";
import Redis from "ioredis";

const redis = new Redis();
redis.on("error", (err) => {
  console.error("Erro ao conectar ao Redis:", err);
});

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
  let userObj = await redis.get(req.user._id.toString());
  userObj = userObj && (await JSON.parse(userObj));

  if (!userObj)
    return next(new AppError("this user was not found on redis!", 404));

  res.status(200).json({
    status: "success",
    data: userObj,
  });
});

export const markNotificationsAsVisualized = catchAsync(
  async (req, res, next) => {
    let userObj = await redis.get(req.user._id.toString());
    userObj = userObj && (await JSON.parse(userObj));

    if (!userObj)
      return next(new AppError("this user was not found on redis!", 404));

    const index = userObj.notifications.findIndex(
      (el) => el.triggeredBy._id.toString() === req.params.triggeredById
    );

    index > -1 && userObj.notifications.splice(index, 1);

    redis.set(req.user._id.toString(), JSON.stringify(userObj));
    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);


export const createGroup = catchAsync(async (req, res, next) => {
  const date = Date.now()
  const room = `${req.user._id.toString()}-${date}`
  const roomObj = {
      name: req.body.groupName,
      imageCover: req.body.img,
      messages: [],
      participants: [],
      createdBy: req.user._id.toString(),
      createdAt: date
    }
    redis.set(room, JSON.stringify(roomObj))
})
