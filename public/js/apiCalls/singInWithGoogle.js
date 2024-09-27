import axios from "axios";

export const singInWithGoogle = async () => {
  const res = await axios({
    method: "GET",
    url: "/api/v1/users/auth/sing-in-with-google",
  });

  if (res.data.status === "success") {
    location.assign("/");
  }
};
