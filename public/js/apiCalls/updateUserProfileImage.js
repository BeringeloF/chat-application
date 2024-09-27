import axios from "axios";

export const updateUserProfileImage = async (data) => {
  const res = await axios({
    method: "PATCH",
    url: "/api/v1/users/updateUserProfileImage",
    data,
  });

  console.log(res);

  if (res.data.status === "success") location.assign("/");
};
