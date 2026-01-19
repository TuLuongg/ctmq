import { useState, useEffect } from "react";
import axios from "axios";

const formatMoney = (value) => {
  if (value === null || value === undefined) return "";

  let str = String(value);

  // Giữ dấu - nếu có ở đầu
  const isNegative = str.trim().startsWith("-");

  // Bỏ hết ký tự không phải số
  let number = str.replace(/\D/g, "");

  if (!number) return isNegative ? "-" : "";

  number = number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return isNegative ? "-" + number : number;
};

const removeDiacritics = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const cleaned = String(value).replace(/\./g, "");
  return Number(cleaned) || 0;
};

export default function TCBModal({
  initialData,
  insertAnchor,
  canEditTCB,
  customerList,
  keToanList,
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
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

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

    if (name === "soTien") {
      setFormData((prev) => ({
        ...prev,
        soTien: formatMoney(value),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        soTien: parseMoney(formData.soTien),
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
          },
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
              className="border p-1 w-1/3 rounded ml-1 mt-1"
              required
            />
          </label>

          <label>
            Nội dung CK
            <input
              type="text"
              name="noiDungCK"
              value={formData.noiDungCK}
              onChange={handleChange}
              className="border p-1 w-full rounded mt-1"
              required
            />
          </label>

          <label>
            Số tiền
            <input
              type="text"
              name="soTien"
              value={formData.soTien}
              onChange={canEditTCB ? handleChange : undefined}
              disabled={!canEditTCB}
              className={`border p-1 w-full rounded mt-1
      ${!canEditTCB ? "bg-gray-100 cursor-not-allowed" : ""}
    `}
              required
            />
          </label>

          <label className="relative">
            Khách hàng
            <input
              type="text"
              name="khachHang"
              value={formData.khachHang}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({ ...prev, khachHang: value }));
                setActiveIndex(-1);

                if (!value.trim()) {
                  setCustomerSuggestions([]);
                  return;
                }

                const keyword = removeDiacritics(value);
                const filtered = customerList.filter((c) =>
                  removeDiacritics(c).includes(keyword),
                );

                setCustomerSuggestions(filtered.slice(0, 10));
              }}
              onKeyDown={(e) => {
                if (!customerSuggestions.length) return;

                // ⬇️
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((prev) =>
                    prev < customerSuggestions.length - 1 ? prev + 1 : 0,
                  );
                }

                // ⬆️
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((prev) =>
                    prev > 0 ? prev - 1 : customerSuggestions.length - 1,
                  );
                }

                // ⏎ Enter
                if (e.key === "Enter" && activeIndex >= 0) {
                  e.preventDefault(); // ❌ không submit form
                  const selected = customerSuggestions[activeIndex];
                  setFormData((prev) => ({ ...prev, khachHang: selected }));
                  setCustomerSuggestions([]);
                  setActiveIndex(-1);
                }

                // ❌ Esc
                if (e.key === "Escape") {
                  setCustomerSuggestions([]);
                  setActiveIndex(-1);
                }
              }}
              className="border p-1 w-full rounded mt-1"
              autoComplete="off"
            />
            {customerSuggestions.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-40 overflow-auto shadow">
                {customerSuggestions.map((c, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1 cursor-pointer ${
                      idx === activeIndex ? "bg-blue-200" : "hover:bg-blue-100"
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      // onClick sẽ bị blur trước → dùng mouseDown
                      e.preventDefault();
                      setFormData((prev) => ({ ...prev, khachHang: c }));
                      setCustomerSuggestions([]);
                      setActiveIndex(-1);
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </label>

          <label>
            Kế toán
            <select
              name="keToan"
              value={formData.keToan}
              onChange={handleChange}
              className="border p-1 w-full rounded mt-1"
            >
              <option value="">-- Chọn kế toán --</option>
              {keToanList.map((kt, idx) => (
                <option key={idx} value={kt}>
                  {kt}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ghi chú
            <input
              type="text"
              name="ghiChu"
              value={formData.ghiChu}
              onChange={handleChange}
              className="border p-1 w-full rounded mt-1"
            />
          </label>

          <label>
            Mã chuyến
            <input
              type="text"
              name="maChuyen"
              value={formData.maChuyen}
              onChange={handleChange}
              className="border p-1 w-full rounded mt-1"
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
