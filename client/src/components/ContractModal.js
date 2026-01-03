import { useState, useEffect } from "react";
import axios from "axios";

function normalizeVN(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function formatNumberVN(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
}

function parseNumber(val) {
  if (!val) return "";
  return Number(val.replace(/\D/g, ""));
}

export default function ContractModal({
  initialData,
  customers,
  onClose,
  onSave,
  apiBase,
}) {
  const [formData, setFormData] = useState({
    khachHang: "",
    numberTrans: "",
    typeTrans: "",
    timeStart: "",
    timeEnd: "",
    timePay: "",
    yesOrNo: "",
    dayRequest: "",
    dayUse: "",
    price: 0,
    numberPrice: "",
    daDuyet: "",
    ghiChu: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        timeStart: initialData.timeStart
          ? new Date(initialData.timeStart).toISOString().slice(0, 10)
          : "",
        timeEnd: initialData.timeEnd
          ? new Date(initialData.timeEnd).toISOString().slice(0, 10)
          : "",
        dayRequest: initialData.dayRequest
          ? new Date(initialData.dayRequest).toISOString().slice(0, 10)
          : "",
        dayUse: initialData.dayUse
          ? new Date(initialData.dayUse).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [initialData]);

  const [showCustomerSuggest, setShowCustomerSuggest] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const customerSuggestions = Array.from(
    new Set((customers || []).map((c) => c.nameHoaDon).filter(Boolean))
  );

  function handleCustomerChange(e) {
    const value = e.target.value;

    setFormData((s) => ({ ...s, khachHang: value }));

    if (!value.trim()) {
      setFilteredCustomers([]);
      setShowCustomerSuggest(false);
      return;
    }

    const keywordRaw = value.toLowerCase();
    const keywordNorm = normalizeVN(value);

    const matched = customerSuggestions.filter((name) => {
      const raw = name.toLowerCase();
      const norm = normalizeVN(name);

      return raw.includes(keywordRaw) || norm.includes(keywordNorm);
    });

    setFilteredCustomers(matched.slice(0, 50));
    setShowCustomerSuggest(true);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      let res;
      if (initialData?._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, formData);
      } else {
        res = await axios.post(apiBase, formData);
      }
      onSave(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded p-5 shadow-lg w-[800px] max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-bold mb-4">
          {initialData ? "Sửa Hợp đồng" : "Thêm Hợp đồng"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col relative">
            Khách hàng
            <input
              name="khachHang"
              value={formData.khachHang}
              onChange={handleCustomerChange}
              onFocus={() => {
                if (filteredCustomers.length > 0) setShowCustomerSuggest(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowCustomerSuggest(false), 150);
              }}
              className="border p-1 rounded mt-1"
              placeholder="Nhập tên khách hàng..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {showCustomerSuggest && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-y-auto text-sm">
                {filteredCustomers.map((name, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => {
                      setFormData((s) => ({ ...s, khachHang: name }));
                      setShowCustomerSuggest(false);
                    }}
                    className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </label>

          <label className="flex flex-col">
            Số hợp đồng
            <input
              name="numberTrans"
              value={formData.numberTrans}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col">
            Loại hợp đồng
            <input
              name="typeTrans"
              value={formData.typeTrans}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col">
            Thời gian bắt đầu
            <input
              name="timeStart"
              type="date"
              value={formData.timeStart}
              onChange={handleChange}
              onClick={(e) => e.target.showPicker()}
              className="border p-1 rounded mt-1 cursor-pointer"
            />
          </label>

          <label className="flex flex-col">
            Thời gian kết thúc
            <input
              name="timeEnd"
              type="date"
              value={formData.timeEnd}
              onChange={handleChange}
              onClick={(e) => e.target.showPicker()}
              className="border p-1 rounded mt-1 cursor-pointer"
            />
          </label>

          <label className="flex flex-col">
            Thời hạn thanh toán
            <input
              name="timePay"
              type="text"
              value={formData.timePay}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col">
            Có báo giá (Có/Không)
            <select
              name="yesOrNo"
              value={formData.yesOrNo}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            >
              <option value="">--Chọn--</option>
              <option value="Có">Có</option>
              <option value="Không">Không</option>
            </select>
          </label>

          <label className="flex flex-col">
            Ngày yêu cầu
            <input
              name="dayRequest"
              type="date"
              value={formData.dayRequest}
              onChange={handleChange}
              onClick={(e) => e.target.showPicker()}
              className="border p-1 rounded mt-1 cursor-pointer"
            />
          </label>

          <label className="flex flex-col">
            Ngày áp dụng
            <input
              name="dayUse"
              type="date"
              value={formData.dayUse}
              onChange={handleChange}
              onClick={(e) => e.target.showPicker()}
              className="border p-1 rounded mt-1 cursor-pointer"
            />
          </label>

          <label className="flex flex-col">
            Giá dầu
            <input
              name="price"
              type="text"
              value={formatNumberVN(formData.price)}
              onChange={(e) => {
                const raw = parseNumber(e.target.value);
                setFormData((s) => ({ ...s, price: raw }));
              }}
              inputMode="numeric"
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col">
            Số báo giá
            <input
              name="numberPrice"
              value={formData.numberPrice}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col">
            Đã duyệt
            <input
              name="daDuyet"
              value={formData.daDuyet}
              onChange={handleChange}
              className="border p-1 rounded mt-1"
            />
          </label>

          <label className="flex flex-col col-span-2">
            Ghi chú
            <textarea
              name="ghiChu"
              value={formData.ghiChu}
              onChange={handleChange}
              className="border p-1 rounded mt-1 w-full"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-gray-300 rounded mt-1"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1 bg-blue-600 text-white rounded mt-1"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
