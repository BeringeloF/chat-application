import axios from "axios";

export const createGroup = async (data, socket) => {
  const res = await axios({
    method: "POST",
    url: "/api/v1/users/group",
    data,
  });

  console.log(res);

  if (res.data.status === "success") {
    console.log("STATUS === SUCCESS");
    console.log("ROOM:", res.data.room);
    const { maybeParticipants } = res.data.data;
    socket.emit("issueInvitations", maybeParticipants, res.data.room);
  }
};
