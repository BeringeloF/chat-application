import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    maxLength: 1500,
    required: true,
  },
  sendedAt: {
    type: Date,
    required: true,
  },
  sendedBy: {
    type: {
      name: String,
      id: String,
    },
  },
  isFromGroup: {
    type: Boolean,
    required: true,
  },
  messageIndex: {
    type: Number,
    required: true,
  },
  room: {
    type: {
      roomId: {
        type: String,
        required: true,
        refPath: "room.roomType", // Referência dinâmica
      },
      // Campo que indica o modelo referenciado
      roomType: {
        type: String,
        required: true,
        enum: ["PrivateRoom", "GroupRoom"], // Modelos permitidos
      },
    },
  },
});

const Messages = new mongoose.model("Messages", messageSchema);

export default Messages;
