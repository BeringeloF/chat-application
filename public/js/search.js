import axios from "axios";

export const search = async (data) => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/search?search=" + data,
    });
    console.log(res);
    return res.data.data.users;
  } catch (err) {
    console.error("error mine", err);
  }

  return res;
};
