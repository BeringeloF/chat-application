import axios from "axios";

export const getUser = async (id) => {
  return (
    await axios({
      url: `/api/v1/users/${id}?redisUser=true`,
      method: "GET",
    })
  ).data.data.user;
};
