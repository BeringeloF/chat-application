import mongoose from "mongoose";

const userToUserRoomSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    doNotShowMessagesBeforeDateToThisUsers: {
      type: [
        {
          date: Date,
          user: {
            type: mongoose.Schema.ObjectId,
            ref: "UserFromChatApp",
            required: true,
          },
        },
      ],
    },
    roomType: {
      type: String,
      default: "PrivateRoom",
    },
    participants: {
      type: [
        {
          user: {
            type: mongoose.Schema.ObjectId,
            ref: "UserFromChatApp",
            required: true,
          },
          image: {
            type: String,
            required: true,
          },
        },
      ],
      default: undefined,
    },

    chatBlockedBy: {
      type: [String],
    },
  },
  { _id: false }
);

const PrivateRoom = new mongoose.model("PrivateRoom", userToUserRoomSchema);

export default PrivateRoom;
