import express from 'express';
import * as userController from '../controllers/userController.js';
import * as authController from '../controllers/authController.js';
import passport from '../passport-setup.js';

export const router = express.Router();

router.get('/', authController.protect, userController.getUsers);

router.post('/login', authController.login);
router.post('/singup', authController.singup);

router.get('/logout', authController.logout);

router.get('/getMe', authController.protect, userController.getMe);

router.get('/getContacts', authController.protect, userController.getContacts);

router.get(
  '/auth/sing-in-with-google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback do Google
router.get(
  '/oauth/google',
  passport.authenticate('google', { session: false }),
  authController.loginWithGoogle
);

router.patch(
  '/updateUserProfileImage',
  authController.protect,
  userController.uploadUserImage,
  userController.updateUserProfileImage
);

//.get(authController.protect, userController.getAllGroups);

router.get('/search', authController.protect, userController.getUsers);

router.delete(
  '/messages/:room',
  authController.protect,
  userController.deleteMessages
);
router
  .route('/notifications')
  .get(authController.protect, userController.getNotifications);

router.delete(
  '/notifications/:room',
  authController.protect,
  userController.markNotificationsAsVisualized
);

router.delete('/deleteNotifications/:id', userController.deleteNotifications);

router.delete(
  '/deleteMessages/:room',
  authController.protect,
  userController.deleteMessagesUI
);

router.get('/getMoreMessages/:room', userController.getMoreMessages);

router.route('/:userId').get(userController.getUser);
