import axios from "axios";

export const addToContacts = async (id) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/chat",
      data: { id },
    });

    if (res.status === "success") {
      location.assign("/");
    }
  } catch (err) {
    console.error("error mine", err);
  }
};
