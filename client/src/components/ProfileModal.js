import { useState, useEffect } from "react";
import axios from "axios";

export default function ProfileModal({ onClose, onUpdate }) {
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    avatar: null,      // file thực tế hoặc "" nếu xoá avatar
    passwordOld: "",
    passwordNew: "",
  });
  const [preview, setPreview] = useState("");

  const token = localStorage.getItem("token");

  // Lấy thông tin user hiện tại từ localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setForm((f) => ({
      ...f,
      fullname: user.fullname || "",
      phone: user.phone || "",
    }));
    setPreview(user.avatar || "");
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setForm((p) => ({ ...p, avatar: file }));
    }
  };

  const handleRemoveAvatar = () => {
    setPreview("");                // Xoá preview
    setForm((p) => ({ ...p, avatar: "" })); // Gửi rỗng để xoá avatar thật
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      if (form.fullname) fd.append("fullname", form.fullname);
      if (form.phone) fd.append("phone", form.phone);
      if (form.avatar !== null) fd.append("avatar", form.avatar); // file hoặc "" để xoá
      if (form.passwordOld) fd.append("passwordOld", form.passwordOld);
      if (form.passwordNew) fd.append("passwordNew", form.passwordNew);

      const res = await axios.put(
        "http://localhost:4000/api/auth/profile",
        fd,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // 🔄 Live update avatar + tên, thêm timestamp tránh cache
      const updatedUser = res.data.user;
      const userWithTimestamp = {
        ...updatedUser,
        avatar: updatedUser.avatar
          ? updatedUser.avatar + "?t=" + new Date().getTime()
          : "",
      };

      localStorage.setItem("user", JSON.stringify(userWithTimestamp));
      setPreview(userWithTimestamp.avatar);
      if (onUpdate) onUpdate(userWithTimestamp);

      alert("Cập nhật thành công!");
      onClose();
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Không thể cập nhật thông tin!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">Cập nhật thông tin cá nhân</h2>
        {/* Avatar đầu modal, căn giữa */}
        <div className="flex flex-col items-center mb-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
              Chưa có
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFile} className="mt-2" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium">Họ tên</label>
            <input
              name="fullname"
              value={form.fullname}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Số điện thoại</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Mật khẩu cũ</label>
            <input
              type="password"
              name="passwordOld"
              value={form.passwordOld}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Mật khẩu mới</label>
            <input
              type="password"
              name="passwordNew"
              value={form.passwordNew}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
