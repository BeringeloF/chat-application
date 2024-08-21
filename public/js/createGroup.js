import axios from "axios";

export const createGroup = async (data, socket) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/group",
    data,
  });

  if (res.status === "success") {
    const maybeParticipants = res.data.partipants;
    socket.emit("issueInvitations", maybeParticipants, res.room);
  }
};
