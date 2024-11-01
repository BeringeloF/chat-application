import mongoose from "mongoose";

const groupRoomSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    maybeParticipants: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "UserFromChatApp",
        },
      ],
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "UserFromChatApp",
        },
      ],
    },
    doNotShowMessagesBeforeDateToThisUsers: {
      type: [
        {
          date: {
            type: Date,
            required: true,
          },
          user: {
            type: mongoose.Schema.ObjectId,
            ref: "UserFromChatApp",
            required: true,
          },
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "UserFromChatApp",
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    admin: {
      type: mongoose.Schema.ObjectId,
      ref: "UserFromChatApp",
    },
    roomType: {
      type: String,
      default: "GroupRoom",
    },
  },
  { _id: false }
);

const GroupRoom = new mongoose.model("GroupRoom", groupRoomSchema);

export default GroupRoom;
