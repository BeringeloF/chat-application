import express from "express";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";

export const router = express.Router();

router.get("/", userController.getUsers);

router.post("/login", authController.login);

router.get("/logout", authController.logout);

router.get("/getMe", authController.protect, userController.getMe);

router.get("/getContacts", authController.protect, userController.getContacts);

router.get(
  "/joinToGroup/:room",
  authController.protect,
  userController.joinToGroup
);

router.post(
  "/group",
  authController.protect,
  userController.uploadGroupImage,
  userController.createGroup
);

router.post("/chat", authController.protect, userController.createChat);

router.get("/search", userController.getUsers);

router
  .route("/group/:room")
  .patch(authController.protect, userController.joinToGroup);

router
  .route("/notifications")
  .get(authController.protect, userController.getNotifications);

router.delete(
  "/notifications/:room",
  authController.protect,
  userController.markNotificationsAsVisualized
);

router.route("/:userId").get(userController.getUser);
