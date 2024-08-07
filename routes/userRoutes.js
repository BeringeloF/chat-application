import express from "express";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";

export const router = express.Router();

router.get("/", userController.getAllUsers);

router.post("/login", authController.login);

router.get("/logout", authController.logout);

router.get("/getMe", authController.protect, userController.getMe);

router.route("/:userId").get(userController.getUser);
