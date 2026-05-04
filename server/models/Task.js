const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["todo", "in progress", "done"],
      default: "todo",
    },

    deadline: Date,
    projectId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);