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

router
  .route("/group")
  .post(
    authController.protect,
    userController.uploadGroupImage,
    userController.createGroup
  );
//.get(authController.protect, userController.getAllGroups);

router.post("/chat", authController.protect, userController.createChat);
router.post(
  "/denyGroupInvitation",
  authController.protect,
  userController.denyGroupInvitation
);

router.get("/search", authController.protect, userController.getUsers);

router
  .route("/group/:room")
  .get(/*authController.protect,*/ userController.getGroup)
  .patch(
    authController.protect,
    userController.uploadGroupImage,
    userController.updateGroup
  );

router.delete(
  "/messages/:room",
  authController.protect,
  userController.deleteMessages
);
router
  .route("/notifications")
  .get(authController.protect, userController.getNotifications);

router.delete(
  "/notifications/:room",
  authController.protect,
  userController.markNotificationsAsVisualized
);

router.delete("/deleteNotifications/:id", userController.deleteNotifications);

router.delete(
  "/removeInviteToGroup/:room/:userId",
  userController.removeInviteToGroup
);
router.route("/:userId").get(userController.getUser);
