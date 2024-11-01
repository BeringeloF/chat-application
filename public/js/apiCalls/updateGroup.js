import axios from 'axios';

export const updateGroup = async (data, socket, room) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `/api/v1/groups/${room}`,
      data,
    });

    console.log(res);

    if (res.data.status === 'success') {
      console.log('STATUS === SUCCESS');
      console.log('ROOM:', room);
      const { maybeParticipants } = res.data.data;
      socket.emit('issueInvitations', maybeParticipants, room);
    }
  } catch (err) {
    console.error('ERROR MINE', err);
  }
};
