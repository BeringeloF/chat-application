import axios from "axios";

export const denyGroupInvitation = async (room) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/denyGroupInvitation",
    data: {
      room,
    },
  });

  console.log("deny invitation", res);
};