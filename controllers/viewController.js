import catchAsync from "../helpers/catchAsync.js";
import User from "../db/userModel.js";
import getUserObj from "../helpers/getUserObj.js";
import { redis } from "./socketController.js";

export const getHomePage = catchAsync(async (req, res) => {
  const userObj = await getUserObj(req.user._id);
  const contactsPromises = userObj.rooms.map(async (room) => {
    const arr = room.split("-");
    if (arr.includes("CHAT")) {
      arr.splice(0, 1);
      const contact = arr.find((el) => el !== req.user._id.toString());
      return JSON.parse(await redis.get(contact));
    } else {
      return JSON.parse(await redis.get(room));
    }
  });
  const constactsAndGroups = await Promise.all(contactsPromises);

  res.status(200).render("chat-page", {
    users: constactsAndGroups,
  });
});

export const getLoginForm = (req, res) => {
  res.status(200).render("login");
};
