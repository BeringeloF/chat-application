import express from "express";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";
import passport from "../controllers/passport-setup.js";

export const router = express.Router();

router.get("/", userController.getUsers);

router.post("/login", authController.login);
router.post("/singup", authController.singup);

router.get("/logout", authController.logout);

router.get("/getMe", authController.protect, userController.getMe);

router.get("/getContacts", authController.protect, userController.getContacts);

router.get(
  "/joinToGroup/:room",
  authController.protect,
  userController.joinToGroup
);

router.get(
  "/auth/sing-in-with-google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback do Google
router.get(
  "/oauth/google",
  passport.authenticate("google", { session: false }),
  authController.loginWithGoogle
);

router.patch(
  "/updateUserProfileImage",
  authController.protect,
  userController.uploadUserImage,
  userController.updateUserProfileImage
);

router
  .route("/group")
  .post(
    authController.protect,
    userController.uploadGroupImage,
    userController.createGroup
  );
//.get(authController.protect, userController.getAllGroups);

router
  .route("/chat")
  .post(authController.protect, userController.createChat)
  .get(userController.getChat);
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

router.get("/getGroupParticipants/:room", userController.getGroupParticipants);

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

router.delete(
  "/deleteMessages/:room",
  authController.protect,
  userController.deleteMessagesUI
);

router.delete("/deleteGroup/:room", userController.deleteGroup);

router.patch(
  "/selectNewGroupAdminAndLeave",
  authController.protect,
  userController.selectNewGroupAdminAndLeave
);

router.patch(
  "/leaveGroup/:room",
  authController.protect,
  userController.leaveGroup
);

router.patch(
  "/blockUser/:room",
  authController.protect,
  userController.blockUser
);
router.patch(
  "/unblockUser/:room",
  authController.protect,
  userController.unblockUser
);

router.route("/:userId").get(userController.getUser);
