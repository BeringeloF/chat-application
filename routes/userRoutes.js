import express from "express";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";

export const router = express.Router();

router.get("/", userController.getAllUsers);

router.post("/login", authController.login);

router.get("/logout", authController.logout);

router.get("/getMe", authController.protect, userController.getMe);

router.get("/getChats", userController.getChats);

router.post(
  "/group",
  authController.protect,
  userController.uploadGroupImage,
  userController.createGroup
);

router
  .route("/group/:room")
  .patch(authController.protect, userController.joinToGroup);

router
  .route("/notifications")
  .get(authController.protect, userController.getNotifications);

router.delete(
  "/notifications/:triggeredById",
  authController.protect,
  userController.markNotificationsAsVisualized
);

router.route("/:userId").get(userController.getUser);
