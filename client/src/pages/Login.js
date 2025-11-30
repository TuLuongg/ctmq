import { useState } from "react";
import API from "../api";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login({ setUser }) {
  const [step, setStep] = useState("question");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      console.log("✅ Login response:", res.data);

      // Lưu token
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      // Lưu user
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: res.data._id,
          username: res.data.username,
          fullname: res.data.fullname,
          role: res.data.role,
          phone: res.data.phone,
          avatar: res.data.avatar,
          permissions: res.data.permissions || [],
        })
      );

      if (setUser) setUser(res.data);

      // Điều hướng
      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "dieuVan") {
        navigate("/dieu-van");
      } else if (res.data.role === "keToan") {
        navigate("/ke-toan");
      } else {
        alert("Không xác định được vai trò người dùng!");
      }
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  // Giao diện bước hỏi
  if (step === "question") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-white shadow-xl rounded-2xl px-8 py-10 w-full max-w-sm text-center">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            🚚 Bạn có phải là lái xe không?
          </h2>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate("/driver")}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              Có
            </button>
            <button
              onClick={() => setStep("login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              Không
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Giao diện đăng nhập
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white shadow-xl rounded-2xl px-8 py-10 w-full max-w-sm">
        <h2 className="text-2xl font-semibold text-center mb-8 text-gray-700">
          🔐 Đăng nhập hệ thống
        </h2>

        <div className="flex flex-col gap-4">
          <input
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Tài khoản"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
          >
            Đăng nhập
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2025 Công ty Minh Quân. All rights reserved.
        </p>
      </div>
    </div>
  );
}
