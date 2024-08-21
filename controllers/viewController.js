import catchAsync from "../helpers/catchAsync.js";
import User from "../db/userModel.js";
import getUserObj from "../helpers/getUserObj.js";
import { redis } from "./socketController.js";

export const getHomePage = catchAsync(async (req, res) => {
  const userObj = await getUserObj(req.user._id);
  const chatsPromises = userObj.rooms.map(async (room) => {
    const arr = room.split("-");
    if (arr.includes("CHAT")) {
      arr.splice(0, 1);
      const chat = arr.find((el) => el !== req.user._id);
      return JSON.parse(await redis.get(chat));
    } else {
      return room;
    }
  });

  const chats = await Promise.all(chatsPromises);

  res.status(200).render("chat-page", {
    chats,
  });
});

export const getLoginForm = (req, res) => {
  res.status(200).render("login");
};
