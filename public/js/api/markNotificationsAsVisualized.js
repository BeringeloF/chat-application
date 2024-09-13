import axios from "axios";

export const viewNotification = async (room, boolean) => {
  try {
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/users/notifications/${room}${
        boolean ? "?serverNotification=" + boolean : ""
      }`,
    });

    console.log(
      "notifications from the room " + room + " was marked as visualized!"
    );
  } catch (err) {
    console.error(err);
  }
};
