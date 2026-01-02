import { useState, useEffect } from "react";
import axios from "axios";

export default function TCBModal({
  initialData,
  insertAnchor,
  onClose,
  onSave,
  apiBase,
  reload,
}) {
  const [formData, setFormData] = useState({
    timePay: "",
    noiDungCK: "",
    soTien: "",
    khachHang: "",
    keToan: "",
    ghiChu: "",
    maChuyen: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        timePay: initialData.timePay
          ? new Date(initialData.timePay).toISOString().substring(0, 10)
          : "",
        noiDungCK: initialData.noiDungCK || "",
        soTien: initialData.soTien ?? "",
        khachHang: initialData.khachHang || "",
        keToan: initialData.keToan || "",
        ghiChu: initialData.ghiChu || "",
        maChuyen: initialData.maChuyen || "",
      });
    }
  }, [initialData]);

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        soTien: Number(formData.soTien) || 0,
        timePay: formData.timePay ? new Date(formData.timePay) : null,
      };

      let res;

      /** =========================
       * 1. UPDATE
       ========================= */
      if (initialData?._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, payload, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
      } else if (insertAnchor?._id) {
        /** =========================
       * 2. INSERT (CHÈN)
       ========================= */
        // ===== CHECK CÙNG THÁNG =====
        if (!payload.timePay) {
          alert("Chèn bắt buộc phải có ngày");
          return;
        }

        const insertMonth =
          payload.timePay.getMonth() + 1 + "-" + payload.timePay.getFullYear();

        const anchorDate = new Date(insertAnchor.timePay);
        const anchorMonth =
          anchorDate.getMonth() + 1 + "-" + anchorDate.getFullYear();

        if (insertMonth !== anchorMonth) {
          alert("❌ Ngày chèn PHẢI nằm trong cùng tháng với giao dịch mốc");
          return;
        }

        res = await axios.post(
          `${apiBase}/insert-after/${insertAnchor._id}`,
          payload,
          {
            headers: { Authorization: token ? `Bearer ${token}` : undefined },
          }
        );
      } else {
        /** =========================
       * 3. CREATE (THÊM MỚI)
       ========================= */
        res = await axios.post(apiBase, payload, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
      }

      onSave?.(res.data);
      reload?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded shadow w-[500px] max-w-full">
        <h2 className="text-lg font-bold mb-4">
          {initialData
            ? "Sửa chuyển khoản"
            : insertAnchor
            ? `Chèn sau mã ${insertAnchor.maGD}`
            : "Thêm chuyển khoản"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label>
            Thời gian thanh toán:
            <input
              type="date"
              name="timePay"
              value={formData.timePay}
              onChange={handleChange}
              className="border p-1 w-1/3 rounded ml-1"
            />
          </label>

          <label>
            Nội dung CK
            <input
              type="text"
              name="noiDungCK"
              value={formData.noiDungCK}
              onChange={handleChange}
              className="border p-1 w-full rounded"
              required
            />
          </label>

          <label>
            Số tiền
            <input
              type="number"
              name="soTien"
              value={formData.soTien}
              onChange={handleChange}
              className="border p-1 w-full rounded"
              required
            />
          </label>

          <label>
            Khách hàng
            <input
              type="text"
              name="khachHang"
              value={formData.khachHang}
              onChange={handleChange}
              className="border p-1 w-full rounded"
            />
          </label>

          <label>
            Kế toán
            <input
              type="text"
              name="keToan"
              value={formData.keToan}
              onChange={handleChange}
              className="border p-1 w-full rounded"
            />
          </label>

          <label>
            Ghi chú
            <input
              type="text"
              name="ghiChu"
              value={formData.ghiChu}
              onChange={handleChange}
              className="border p-1 w-full rounded"
            />
          </label>

          <label>
            Mã chuyến
            <input
              type="text"
              name="maChuyen"
              value={formData.maChuyen}
              onChange={handleChange}
              className="border p-1 w-full rounded"
            />
          </label>

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
