import axios from "axios";

export const login = async (email, password) => {
  console.log(email);
  console.log(password);
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login",
      data: {
        email,
        password,
      },
    });
    console.log(res);
    if (res.data.status === "success") {
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    console.error(err.response.data.message);
  }
};

export const singup = async (name, email, password, passwordConfirm) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/singup",
    data: {
      name,
      email,
      password,
      passwordConfirm,
    },
  });

  console.log(res);
  if (res.data.status === "success")
    setTimeout(() => {
      location.assign("/");
    }, 4000);
};

export const logout = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/logout",
    });
    if (res.data.status === "success") {
      location.reload(true);
    }
  } catch (err) {
    console.log(err);
  }
};
