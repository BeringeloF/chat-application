import axios from "axios";

export const createGroup = async (data) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/group",
    data,
  });
};
