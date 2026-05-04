import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const API = "http://localhost:5000";

function App() {
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );

  const [token, setToken] = useState(localStorage.getItem("token"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projectName, setProjectName] = useState("");

  // ✅ ADDED (team members state)
  const [selectedMembers, setSelectedMembers] = useState([]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    assignedTo: "",
    projectId: "",
  });

  /* INIT */
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = token;
      fetchAll();
    }
  }, [token]);

  /* FETCH */
  const fetchAll = async () => {
    try {
      const [tasksRes, dashRes, usersRes, projectsRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/dashboard`),
        axios.get(`${API}/users`),
        axios.get(`${API}/projects`),
      ]);

      setTasks(tasksRes.data);
      setDashboard(dashRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  /* AUTH */
  const login = async () => {
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setToken(res.data.token);
      setUser(res.data.user);
    } catch {
      alert("Login failed");
    }
  };

  const register = async () => {
    try {
      await axios.post(`${API}/auth/register`, {
        name: "Admin",
        email,
        password,
      });
      alert("Registered! Now login");
    } catch {
      alert("User already exists");
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  /* PROJECT */
  const createProject = async () => {
    if (!projectName) return alert("Enter project name");

    try {
      await axios.post(`${API}/projects`, {
        name: projectName,
        members: selectedMembers,
      });

      setProjectName("");
      setSelectedMembers([]);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating project");
    }
  };

  // ✅ ADDED
  const deleteProject = async (id) => {
    try {
      await axios.delete(`${API}/projects/${id}`);
      fetchAll();
    } catch {
      alert("Delete project failed");
    }
  };

  // ✅ ADDED
  const removeMember = async (projectId, userId) => {
    try {
      await axios.put(`${API}/projects/${projectId}/remove-member`, {
        userId,
      });
      fetchAll();
    } catch {
      alert("Remove member failed");
    }
  };

  /* TASK */
  const createTask = async () => {
    if (!newTask.title) return alert("Title required");
    if (!newTask.assignedTo) return alert("Select user");

    try {
      await axios.post(`${API}/tasks`, newTask);

      setNewTask({
        title: "",
        description: "",
        deadline: "",
        assignedTo: "",
        projectId: "",
      });

      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating task");
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API}/tasks/${id}`);
      fetchAll();
    } catch {
      alert("Delete failed");
    }
  };

  const markDone = async (id) => {
    try {
      await axios.put(`${API}/tasks/${id}`, { status: "done" });
      fetchAll();
    } catch {
      alert("Update failed");
    }
  };

  /* LOGIN UI */
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="card w-80">
          <h2 className="mb-4 text-lg">Login</h2>

          <input
            placeholder="Email"
            className="input mb-3"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="input mb-3"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login} className="btn-primary w-full mb-2">
            Login
          </button>

          <button onClick={register} className="w-full bg-gray-700 p-2 rounded">
            Register
          </button>
        </div>
      </div>
    );
  }

  /* MAIN UI */
  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="flex justify-between px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Team Task Manager</h1>

        <div className="flex gap-4 items-center">
          <span className="text-gray-400">{user?.email}</span>
          <button onClick={logout} className="bg-red-600 px-3 py-1 rounded">
            Logout
          </button>
        </div>
      </div>

      <div className="p-8">

        {/* DASHBOARD */}
        {dashboard && (
          <div className="grid grid-cols-4 gap-6 mb-10">
            <Card title="Total" value={dashboard.totalTasks} />
            <Card title="Completed" value={dashboard.completedTasks} green />
            <Card title="Pending" value={dashboard.pendingTasks} yellow />
            <Card title="Overdue" value={dashboard.overdueTasks} red />
          </div>
        )}

        {/* PROJECT LIST */}
        <div className="card mb-6">
          <h2>Projects</h2>

          {projects.length === 0 ? (
            <p className="text-gray-500 mt-2">No projects yet</p>
          ) : (
            projects.map((p) => (
              <div key={p._id} className="mb-4">

                {/* Project header */}
                <div className="flex justify-between items-center">
                  <p className="text-gray-300">{p.name}</p>

                  {user?.role === "admin" && (
                    <button
                      onClick={() => deleteProject(p._id)}
                      className="bg-red-600 px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Members */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.members?.map((m) => (
                    <div
                      key={m._id}
                      className="bg-gray-700 px-2 py-1 rounded flex gap-2 items-center"
                    >
                      <span className="text-sm">{m.email}</span>

                      {user?.role === "admin" && (
                        <button
                          onClick={() => removeMember(p._id, m._id)}
                          className="text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>

        {/* CREATE PROJECT */}
        {user?.role === "admin" && (
          <div className="card mb-6">
            <h2>Create Project</h2>

            <div className="flex gap-3 mt-3">
              <input
                placeholder="Project name"
                className="input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <select
                multiple
                className="input"
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setSelectedMembers(values);
                }}
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email}
                  </option>
                ))}
              </select>

              <button onClick={createProject} className="btn-primary">
                Add
              </button>
            </div>
          </div>
        )}

        {/* CREATE TASK */}
        {user?.role === "admin" && (
          <div className="card mb-8">
            <h2>Create Task</h2>

            <div className="grid grid-cols-5 gap-4 mb-4">

              <input
                placeholder="Title"
                className="input"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />

              <input
                placeholder="Description"
                className="input"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />

              <input
                type="date"
                className="input"
                value={newTask.deadline}
                onChange={(e) =>
                  setNewTask({ ...newTask, deadline: e.target.value })
                }
              />

              <select
                className="input"
                value={newTask.assignedTo}
                onChange={(e) =>
                  setNewTask({ ...newTask, assignedTo: e.target.value })
                }
              >
                <option value="">Assign User</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={newTask.projectId}
                onChange={(e) =>
                  setNewTask({ ...newTask, projectId: e.target.value })
                }
              >
                <option value="">Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>

            </div>

            <button onClick={createTask} className="btn-primary">
              Create Task
            </button>
          </div>
        )}

        {/* TASKS */}
        <div className="card">
          <h2>Tasks</h2>

          {tasks.length === 0 ? (
            <p className="text-gray-500 mt-2">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="flex justify-between py-3 border-b border-gray-800">

                <div>
                  <p>{task.title}</p>
                  <p className="text-gray-400">{task.status}</p>
                  <p className="text-sm text-gray-500">
                    {task.assignedTo?.email || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {task.deadline?.slice(0, 10) || "No deadline"}
                  </p>
                </div>

                <div className="flex gap-2">

                  {task.status !== "done" && (
                    <button
                      onClick={() => markDone(task._id)}
                      className="bg-green-600 px-3 rounded"
                    >
                      Done
                    </button>
                  )}

                  {user?.role === "admin" && (
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="bg-red-600 px-3 rounded"
                    >
                      Delete
                    </button>
                  )}

                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}

/* CARD */
function Card({ title, value, green, yellow, red }) {
  let color = "bg-gray-800";
  if (green) color = "bg-green-600";
  if (yellow) color = "bg-yellow-600";
  if (red) color = "bg-red-600";

  return (
    <motion.div className={`${color} p-6 rounded-xl`}>
      <p>{title}</p>
      <h2 className="text-2xl">{value}</h2>
    </motion.div>
  );
}

export default App;