import axios from 'axios';

export const getMoreMessages = async (room, date) => {
  const res = await axios({
    method: 'GET',
    url: `/api/v1/users/getMoreMessages/${room}?date=${date}`,
  });
  return res.data.data;
};
