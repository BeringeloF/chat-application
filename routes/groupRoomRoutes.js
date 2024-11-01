import express from 'express';
import * as authController from '../controllers/authController.js';
import * as groupRoomController from '../controllers/groupRoomController.js';

export const router = express.Router();

router.get(
  '/joinToGroup/:room',
  authController.protect,
  groupRoomController.joinToGroup
);

router
  .route('/')
  .post(
    authController.protect,
    groupRoomController.uploadGroupImage,
    groupRoomController.createGroup
  );
router.get(
  '/getGroupParticipants/:room',
  groupRoomController.getGroupParticipants
);

router
  .route('/:room')
  .get(/*authController.protect,*/ groupRoomController.getGroup)
  .patch(
    authController.protect,
    groupRoomController.uploadGroupImage,
    groupRoomController.updateGroup
  );

router.post(
  '/denyGroupInvitation',
  authController.protect,
  groupRoomController.denyGroupInvitation
);

router.delete(
  '/removeInviteToGroup/:room/:userId',
  groupRoomController.removeInviteToGroup
);

router.delete('/deleteGroup/:room', groupRoomController.deleteGroup);

router.patch(
  '/selectNewGroupAdminAndLeave',
  authController.protect,
  groupRoomController.selectNewGroupAdminAndLeave
);

router.patch(
  '/leaveGroup/:room',
  authController.protect,
  groupRoomController.leaveGroup
);
