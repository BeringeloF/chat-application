import axios from "axios";

export const viewNotification = async (id) => {
  try {
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/users/notifications/${id}`,
    });

    console.log("notifications from user " + id + " was marked as visualized!");
  } catch (err) {
    console.error(err);
  }
};
