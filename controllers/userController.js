import User from "../db/userModel.js";
import catchAsync from "../helpers/catchAsync.js";
import { AppError } from "../helpers/appError.js";

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
