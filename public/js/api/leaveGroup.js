import axios from "axios";

export const selectNewGroupAdminAndLeave = async (data) => {
  const res = await axios({
    method: "PATCH",
    url: "/api/v1/users/selectNewGroupAdminAndLeave",
    data,
  });

  console.log(res);
};

export const leaveGroup = async () => {
  const res = await axios({
    method: "PATCH",
    url: "/api/v1/users/leaveGroup",
  });

  console.log(res);
};
