import catchAsync from '../helpers/catchAsync.js';
import { getUserObj, getRoomObj } from '../helpers/getObjFromRedis.js';
import util from 'util';

export const getHomePage = catchAsync(async (req, res) => {
  const userObj = await getUserObj(req.user._id);
  const contactsPromises = userObj.rooms.map(async (room) => {
    const arr = room.split('-');
    if (arr.includes('CHAT')) {
      arr.splice(0, 1);
      const contact = arr.find((el) => el !== req.user._id.toString());
      return { userData: await getUserObj(contact), room };
    }
  });

  const groupsPromises = userObj.rooms.map(async (room) => {
    try {
      if (room.includes('GROUP')) {
        return { groupData: await getRoomObj(room), room };
      }
    } catch (err) {
      throw err;
    }
  });
  const contacts = await Promise.all(contactsPromises);
  const groups = await Promise.all(groupsPromises);
  res.status(200).render('chat-page', {
    users: contacts.filter((el) => el !== undefined),
    groups: groups.filter((el) => el !== undefined),
  });
});

export const getLoginForm = (req, res) => {
  res.status(200).render('login');
};

export const getSingUpForm = (req, res) => {
  res.status(200).render('singup.pug');
};
