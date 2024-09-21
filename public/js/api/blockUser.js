import axios from "axios";

export const blockUser = async (room) => {
  const res = await axios({
    url: `/api/v1/users/blockUser/${room}`,
    method: "PATCH",
  });

  console.log(res);
};

export const unblockUser = async (room) => {
  const res = await axios({
    url: `/api/v1/users/unblockUser/${room}`,
    method: "PATCH",
  });

  console.log(res);
};
