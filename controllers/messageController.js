import Messages from "../db/messagesModel.js";

export const createMessage = async (data) => {
  const message = await Messages.create(data);
  console.log("message saved on  the dataBase");
};
