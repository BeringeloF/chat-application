import axios from "axios";

export const deleteMessages = async (room) => {
  const res = await axios({
    method: "DELETE",
    url: `/api/v1/users/deleteMessages/${room}`,
  });

  console.log(res);
};
