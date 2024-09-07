import { redis } from "../controllers/socketController.js";
import { AppError } from "./appError.js";

export const getUserObj = async (id, next) => {
  try {
    let userObj = await redis.get(id);
    userObj = userObj && JSON.parse(userObj);

    if (!userObj) throw new AppError("this user was not found on redis!", 404);
    return userObj;
  } catch (err) {
    throw err;
  }
};

export const getRoomObj = async (key) => {
  try {
    let roomObj = await redis.get(key);
    roomObj = roomObj && JSON.parse(roomObj);

    if (!roomObj) throw new AppError("this room was not found on redis!", 404);
    return roomObj;
  } catch (err) {
    throw err;
  }
};
