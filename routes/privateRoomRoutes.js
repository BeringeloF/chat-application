import express from 'express';
import * as authController from '../controllers/authController.js';
import * as privateRoomController from '../controllers/privateRoomController.js';

export const router = express.Router();

router
  .route('/')
  .post(authController.protect, privateRoomController.createChat)
  .get(privateRoomController.getChat);

router.patch(
  '/blockUser/:room',
  authController.protect,
  privateRoomController.blockUser
);
router.patch(
  '/unblockUser/:room',
  authController.protect,
  privateRoomController.unblockUser
);

router.delete('/deleteRoom/:room', privateRoomController.deleteRoom);
