import React, { useEffect, useState } from "react";
import { FaUsers, FaSearch, FaUserShield, FaUser, FaCalendarAlt, FaShoppingBag } from "react-icons/fa";
import api from "../api/axios";
import Loader from "../components/Loader/Loader";
import { useToast } from "../context/ToastContext";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const { showToast } = useToast();
  const currentUserId = localStorage.getItem("id");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/get-all-users");
      setUsers(response.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleToggle = async (userId, currentRole) => {
    if (userId === currentUserId) {
      showToast("You cannot change your own admin role", "warning");
      return;
    }

    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      setUpdatingId(userId);
      const response = await api.put(`/admin/update-user-role/${userId}`, { role: newRole });
      showToast(response.data.message || `User role changed to ${newRole}`, "success");
      await fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update user role", "error");
    } finally {
      setUpdatingId("");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-zinc-100 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">User Management</h1>
          <p className="text-zinc-400 text-sm mt-1">View registered customers, their order counts, and manage administrative privileges</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700/60 flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by username, email, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
          <FaSearch className="absolute left-3.5 top-3.5 text-zinc-500 text-xs" />
        </div>
        <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-700 px-3 py-2 rounded-xl hidden md:block">
          Total Users: {users.length}
        </span>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="min-h-[40vh] bg-zinc-800/40 rounded-2xl border border-zinc-700/50 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <FaUsers className="text-4xl text-zinc-600 mb-2" />
          <p className="text-xl font-bold text-zinc-400">No Users Found</p>
          <p className="text-zinc-500 text-sm">No users match the search criteria.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/90 text-xs uppercase text-zinc-400 border-b border-zinc-700/60">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Orders Placed</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Manage Privilege</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/40">
                {filteredUsers.map((u) => {
                  const isAdminUser = u.role === "admin";
                  const isSelf = u._id === currentUserId;

                  return (
                    <tr key={u._id} className="hover:bg-zinc-900/40 transition">
                      {/* Avatar & Username */}
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={u.avatar || "https://cdn-icons-png.flaticon.com/128/3177/3177440.png"}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-zinc-700"
                        />
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {u.username}
                            {isSelf && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">You</span>}
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-[200px]">{u.address || "No address"}</p>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-4 text-zinc-300 text-xs font-mono">{u.email}</td>

                      {/* Orders Count */}
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <FaShoppingBag className="text-zinc-500" />
                          {u.orderCount || 0} orders
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="p-4 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="text-zinc-600" />
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                            isAdminUser
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-zinc-700/60 text-zinc-300 border border-zinc-600"
                          }`}
                        >
                          {isAdminUser ? <FaUserShield className="text-xs" /> : <FaUser className="text-[10px]" />}
                          {isAdminUser ? "Admin" : "User"}
                        </span>
                      </td>

                      {/* Role Toggle Button */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRoleToggle(u._id, u.role)}
                          disabled={updatingId === u._id || isSelf}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            isAdminUser
                              ? "bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-500/30"
                              : "bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {updatingId === u._id
                            ? "Updating..."
                            : isAdminUser
                            ? "Demote to User"
                            : "Make Admin"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
