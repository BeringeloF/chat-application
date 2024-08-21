import { redis } from "../controllers/socketController.js";
import { AppError } from "./appError.js";

const getUserObj = async (id, next) => {
  try {
    let userObj = await redis.get(id);
    userObj = userObj && JSON.parse(userObj);

    if (!userObj) throw new AppError("this user was not found on redis!", 404);
    return userObj;
  } catch (err) {
    throw err;
  }
};

export default getUserObj;
