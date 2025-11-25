import { useState, useEffect } from "react";
import axios from "axios";

export default function CustomerModal({ initialData = null, onClose, onSave, apiBase = "https://ctmq.onrender.com/api/customers" }) {
  const [form, setForm] = useState({
    name: "",
    accountant: "",
    code: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        accountant: initialData.accountant || "",
        code: initialData.code || "",
      });
    } else {
      setForm({ name: "", accountant: "", code: "" });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      // Gửi JSON trực tiếp
      let res;
      if (initialData && initialData._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, form);
      } else {
        res = await axios.post(apiBase, form);
      }

      onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu khách hàng:", err.response?.data || err.message);
      alert("Không lưu được: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">{initialData ? "Sửa khách hàng" : "Thêm khách hàng"}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <label className="block text-sm font-medium">Tên KH</label>
            <input name="name" value={form.name} onChange={handleChange} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-medium">Tên kế toán phụ trách</label>
            <input name="accountant" value={form.accountant} onChange={handleChange} className="border p-2 w-full rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">Mã KH</label>
            <input name="code" value={form.code} onChange={handleChange} className="border p-2 w-full rounded" />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{initialData ? "Cập nhật" : "Lưu"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
