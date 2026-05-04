const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

/* ================= DB ================= */
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task-manager")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("Mongo Error ❌", err.message));

/* ================= MODELS ================= */
const User = require("./models/User");
const Task = require("./models/Task");
const Project = require("./models/Project");

/* ================= AUTH ================= */

// REGISTER
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
    });

    res.json(user);
  } catch {
    res.status(400).json({ message: "User already exists" });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "SECRET123",
    { expiresIn: "1d" }
  );

  res.json({ token, user });
});

/* ================= MIDDLEWARE ================= */

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "SECRET123"
    );
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= USERS ================= */

app.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("_id email role");
    res.json(users);
  } catch {
    res.status(500).json({ message: "Error fetching users" });
  }
});

/* ================= PROJECTS ================= */

// CREATE PROJECT
app.post("/projects", authMiddleware, async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      createdBy: req.user.id,
      members: req.body.members || [],
    });

    res.json(project);
  } catch {
    res.status(500).json({ message: "Error creating project" });
  }
});

// GET PROJECTS
app.get("/projects", authMiddleware, async (req, res) => {
  const projects = await Project.find().populate("members", "email");
  res.json(projects);
});

// ADD MEMBER
app.put("/projects/:id/add-member", authMiddleware, async (req, res) => {
  const { userId } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { members: userId } },
    { new: true }
  ).populate("members", "email");

  res.json(project);
});

// REMOVE MEMBER (ADDED)
app.put("/projects/:id/remove-member", authMiddleware, async (req, res) => {
  const { userId } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $pull: { members: userId } },
    { new: true }
  ).populate("members", "email");

  res.json(project);
});

// DELETE PROJECT (ADDED)
app.delete("/projects/:id", authMiddleware, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ message: "Project deleted" });
});

/* ================= TASK ROUTES ================= */

// CREATE TASK
app.post("/tasks", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can create tasks" });
    }

    if (!req.body.assignedTo) {
      return res.status(400).json({ message: "Assign user required" });
    }

    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      deadline: req.body.deadline,
      status: "todo",
      assignedTo: req.body.assignedTo,
      projectId: req.body.projectId || null,
      createdBy: req.user.id,
    });

    res.json(task);
  } catch {
    res.status(500).json({ message: "Error creating task" });
  }
});

// GET TASKS
app.get("/tasks", authMiddleware, async (req, res) => {
  let tasks;

  if (req.user.role === "admin") {
    tasks = await Task.find()
      .populate("assignedTo", "email")
      .sort({ createdAt: -1 });
  } else {
    tasks = await Task.find({ assignedTo: req.user.id })
      .populate("assignedTo", "email");
  }

  res.json(tasks);
});

// UPDATE
app.put("/tasks/:id", authMiddleware, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (
    req.user.role !== "admin" &&
    task.assignedTo.toString() !== req.user.id
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(updated);
});

// DELETE
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can delete" });
  }

  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// DASHBOARD
app.get("/dashboard", authMiddleware, async (req, res) => {
  let tasks;

  if (req.user.role === "admin") {
    tasks = await Task.find();
  } else {
    tasks = await Task.find({ assignedTo: req.user.id });
  }

  // REMOVE MEMBER
app.put("/projects/:id/remove-member", authMiddleware, async (req, res) => {
  const { userId } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $pull: { members: userId } },
    { new: true }
  ).populate("members", "email");

  res.json(project);
});

  res.json({
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === "done").length,
    pendingTasks: tasks.filter(t => t.status !== "done").length,
    overdueTasks: tasks.filter(
      t => new Date(t.deadline) < new Date() && t.status !== "done"
    ).length,
  });
});

/* ================= START ================= */
app.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);