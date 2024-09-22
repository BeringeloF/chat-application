import express from "express";
import * as viewController from "../controllers/viewController.js";
import * as authController from "../controllers/authController.js";

export const router = express.Router();

router.get("/", authController.protect, viewController.getHomePage);

router.get("/login", viewController.getLoginForm);

router.get("/singup", viewController.getSingUpForm);
