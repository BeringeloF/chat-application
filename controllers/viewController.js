import catchAsync from "../helpers/catchAsync.js";
import User from "../db/userModel.js";

export const getHomePage = catchAsync(async (req, res) => {
  const testUsers = await User.find().limit(5);

  res.status(200).render("chat-page", {
    users: testUsers,
  });
});

export const getLoginForm = (req, res) => {
  res.status(200).render("login");
};
