import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from "../api";

export default function AdminPage({ onLogout }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("dieuVan");
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      alert("Lỗi tải danh sách người dùng");
    }
  };

  const handleCreate = async () => {
    if (!username || !password || !fullname)
      return alert("Vui lòng nhập đầy đủ: tên đăng nhập, mật khẩu và tên người dùng");

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/auth/register`,
        { username, password, role, fullname },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Tạo tài khoản thành công!");
      setUsername("");
      setPassword("");
      setFullname("");
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi tạo tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa tài khoản này?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchUsers();
    } catch {
      alert("Lỗi khi xóa");
    }
  };

  const togglePermission = async (userId, permission, checked) => {
    try {
      const user = users.find((u) => u._id === userId);
      if (!user) return;

      const updatedPermissions = checked
        ? [...(user.permissions || []), permission]
        : (user.permissions || []).filter((p) => p !== permission);

      const token = localStorage.getItem("token");

      await axios.put(
        `${API}/auth/users/${userId}/permissions`,
        { permissions: updatedPermissions },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, permissions: updatedPermissions } : u))
      );
    } catch {
      alert("Không cập nhật được quyền");
    }
  };

  const getRoleName = (r) => {
    switch (r) {
      case "admin":
        return "Giám đốc";
      case "dieuVan":
        return "Điều vận";
      case "keToan":
        return "Kế toán";
      default:
        return r;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto mt-20 bg-gray-200 shadow-lg rounded-2xl p-8 flex gap-6">
      
      {/* 🟩 Cột bên trái: Menu quản lý */}
      <div className="w-1/5 bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-semibold text-lg mb-4">THAO TÁC QUẢN LÝ</h3>
        <ul className="space-y-2">
          <li>
            <button
              className="text-left w-full hover:text-blue-600"
              onClick={() => navigate("/manage-trip-admin")}
            >
              1. Quản lý danh sách chuyến
            </button>
          </li>
          <li>
            <button
              className="text-left w-full hover:text-blue-600"
              onClick={() => navigate("/manage-customers")}
            >
              2. Quản lý khách hàng
            </button>
          </li>
          <li>
            <button
              className="text-left w-full hover:text-blue-600"
              onClick={() => navigate("/manage-drivers")}
            >
              3. Quản lý lái xe
            </button>
          </li>
          <li>
            <button
              className="text-left w-full hover:text-blue-600"
              onClick={() => navigate("/manage-vehicles")}
            >
              4. Quản lý xe
            </button>
          </li>
        </ul>
      </div>

      {/* 🟦 Cột bên phải: Quản lý tài khoản */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow-sm">
        <div className="relative mb-10">
          <h2 className="text-2xl font-semibold text-gray-700 text-center">👑 Quản lý tài khoản</h2>
          <button
            onClick={onLogout || (() => navigate("/login"))}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
          >
            Đăng xuất
          </button>
        </div>

        {/* Form tạo tài khoản */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Tên người dùng"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="dieuVan">Điều vận</option>
            <option value="keToan">Kế toán</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </div>

        {/* Bảng danh sách tài khoản */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm rounded-lg overflow-hidden">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 border-b text-left">Tên đăng nhập</th>
                <th className="px-4 py-2 border-b text-left">Tên người dùng</th>
                <th className="px-4 py-2 border-b text-left">Chức vụ</th>
                <th className="px-4 py-2 border-b text-center">Quản lý lái xe</th>
                <th className="px-4 py-2 border-b text-center">Quản lý khách hàng</th>
                <th className="px-4 py-2 border-b text-center">Quản lý xe</th>
                <th className="px-4 py-2 border-b text-center">Quản lý chuyến gốc</th>
                <th className="px-4 py-2 border-b text-center">Quản lý toàn bộ cước phí BS</th>
                <th className="px-4 py-2 border-b text-center">Quản lý phiếu chi</th>
                <th className="px-4 py-2 border-b text-center">Duyệt phiếu chi</th>
                <th className="px-4 py-2 border-b text-center">Công nợ KH 26</th>
                <th className="px-4 py-2 border-b text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr
                  key={u._id}
                  className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                >
                  <td className="px-4 py-2 border-b">{u.username}</td>
                  <td className="px-4 py-2 border-b">{u.fullname || "—"}</td>
                  <td className="px-4 py-2 border-b capitalize">{getRoleName(u.role)}</td>

                  {["edit_driver", "edit_customer", "edit_vehicle", "edit_trip", "edit_trip_full", "edit_voucher", "approve_voucher", "cong_no_26"].map((perm) => (
                    <td key={perm} className="px-4 py-2 border-b text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions?.includes(perm)}
                        disabled={u.role === "admin"}
                        onChange={(e) => togglePermission(u._id, perm, e.target.checked)}
                      />
                    </td>
                  ))}

                  <td className="px-4 py-2 border-b text-center">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
