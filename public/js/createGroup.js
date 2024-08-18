import axios from "axios";

export const createGroup = async (data, socket) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/group",
    data,
  });

  if (res.status === "success") {
    const participants = res.data.participants.filter((el) => !el.agreedToJoin);
    socket.emit("issueInvitations", participants, res.room);
  }
};
