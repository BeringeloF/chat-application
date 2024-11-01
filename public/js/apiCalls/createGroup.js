import axios from 'axios';

export const createGroup = async (data, socket) => {
  const res = await axios({
    method: 'POST',
    url: '/api/v1/groups',
    data,
  });

  console.log(res);

  if (res.data.status === 'success') {
    console.log('STATUS === SUCCESS');
    console.log('ROOM:', res.data.room);
    const { maybeParticipants } = res.data.data;
    socket
      .timeout(4000)
      .emitWithAck('issueInvitations', maybeParticipants, res.data.room)
      .catch((err) =>
        socket.emit('issueInvitations', maybeParticipants, res.data.room)
      );
    location.assign('/');
  }
};
