import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function CustomerModal({
  initialData = null,
  onClose,
  onSave,
  apiBase = `${API}/customers`,
}) {
  const [form, setForm] = useState({
    name: "",
    nameHoaDon: "",
    mstCCCD: "",
    address: "",
    accountant: "",
    code: "",
    accUsername: "",
    percentHH: "",
    createdBy: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        nameHoaDon: initialData.nameHoaDon || "",
        mstCCCD: initialData.mstCCCD || "",
        address: initialData.address || "",
        accountant: initialData.accountant || "",
        code: initialData.code || "",
        accUsername: initialData.accUsername || "",
        percentHH: initialData.percentHH || "",
        createdBy: initialData.createdBy || "",
        warning: initialData.warning || false,
      });
    } else {
      setForm({
        name: "",
        nameHoaDon: "",
        mstCCCD: "",
        address: "",
        accountant: "",
        code: "",
        accUsername: "",
        percentHH: "",
        createdBy: "",
        warning: false,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    // 🔒 chặn double click
    if (isSubmitting) return;

    if (!form.accUsername.trim()) {
      alert("Vui lòng nhập Tên đăng nhập!");
      return;
    }

    try {
      setIsSubmitting(true); // 🔒 khóa nút

      let res;
      if (initialData && initialData._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, {
          ...form,
          percentHH: Number(form.percentHH) || 0, // ⚠️ ép số
        });
      } else {
        res = await axios.post(apiBase, {
          ...form,
          percentHH: Number(form.percentHH) || 0,
        });
      }

      onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu khách hàng:", err.response?.data || err.message);
      alert("Không lưu được: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false); // 🔓 mở lại nếu lỗi
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Sửa khách hàng" : "Thêm khách hàng"}
        </h2>

        <form onSubmit={submit} className="grid gap-3">
          {/* Tên khách hàng */}
          <div>
            <label className="block text-sm font-medium">Tên KH</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />
          </div>

          {/* Tên trên hóa đơn */}
          <div>
            <label className="block text-sm font-medium">
              Tên trên hóa đơn
            </label>
            <input
              name="nameHoaDon"
              value={form.nameHoaDon}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* MST / CCCD */}
          <div>
            <label className="block text-sm font-medium">MST / CCCD</label>
            <input
              name="mstCCCD"
              value={form.mstCCCD}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-sm font-medium">Địa chỉ</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Kế toán phụ trách */}
          <div>
            <label className="block text-sm font-medium">Ghi chú</label>
            <input
              name="accountant"
              value={form.accountant}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Mã KH */}
          <div>
            <label className="block text-sm font-medium">Mã KH</label>
            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Mã KH */}
          <div>
            <label className="block text-sm font-medium">
              %HH (nhập số phần trăm là được)
            </label>
            <input
              name="percentHH"
              value={form.percentHH}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Tên đăng nhập */}
          <div>
            <label className="block text-sm font-medium">
              Tên đăng nhập của kế toán
            </label>
            <input
              name="accUsername"
              value={form.accUsername}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />
          </div>

          {/* createdBy (ẩn) */}
          <input type="hidden" name="createdBy" value={form.createdBy} />

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded text-white ${
                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"
              }`}
            >
              {isSubmitting ? "Đang lưu..." : initialData ? "Cập nhật" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
