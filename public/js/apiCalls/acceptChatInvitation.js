import axios from 'axios';

export const acceptChatInvitation = async (id) => {
  try {
    let res = await axios({
      method: 'POST',
      url: '/api/v1/chats',
      data: { id },
    });
    console.log(res);
    return res.data.room;
  } catch (err) {
    console.error('error mine', err);
  }
};
