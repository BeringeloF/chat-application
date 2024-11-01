import axios from 'axios';

export const deleteMessages = async (room) => {
  try {
    const res = await axios({
      method: 'DELETE',
      url: `/api/v1/users/deleteMessages/${room}`,
    });

    console.log(res);
  } catch (err) {
    console.error(err);
  }
};
