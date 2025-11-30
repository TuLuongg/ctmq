import React, { useEffect, useState } from "react";

export default function RideEditModal({ ride, allColumns, onSubmit, onClose }) {
  const [formData, setFormData] = useState({});

  // 🔥 Các trường là tiền (tùy bạn muốn thêm bớt)
  const moneyFields = [
    "cuocPhi", "bocXep", "ve", "hangVe", "luuCa", "luatChiPhiKhac",
    "cuocPhiBS", "bocXepBS", "veBS", "hangVeBS", "luuCaBS", "cpKhacBS",
    "daThanhToan"
  ];

  // 🔥 Format 1000000 => "1.000.000"
  const formatMoney = (value) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    if (ride) {
      setFormData({
        ...ride,
        reason: "",
      });
    }
  }, [ride]);

  if (!ride) return null;

  // 🔥 Xử lý input — hỗ trợ tự thêm dấu chấm
  const handleChange = (key, value) => {
    if (moneyFields.includes(key)) {
      const raw = value.replace(/\./g, ""); // bỏ dấu chấm khi edit

      if (isNaN(raw)) return; // chặn ký tự không phải số

      setFormData((prev) => ({
        ...prev,
        [key]: raw, // lưu vào state dạng số thô
      }));
      return;
    }

    // bình thường
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.reason?.trim()) {
      alert("Vui lòng nhập lý do chỉnh sửa!");
      return;
    }
    onSubmit(formData);
  };

  const formatDate = (value) => {
    if (!value) return "";
    try {
      return value.split("T")[0];
    } catch {
      return value;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          Chỉnh sửa chuyến: {ride.maChuyen || ride._id}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {allColumns.map((col) => {
            const value = formData[col.key];

            // Không cho sửa mã chuyến
            if (col.key === "maChuyen") {
              return (
                <div key={col.key} className="flex flex-col">
                  <label className="font-semibold">{col.label}</label>
                  <div className="border rounded w-full p-2 mt-1 bg-gray-100 text-gray-600">
                    {value}
                  </div>
                </div>
              );
            }

            const inputType =
              col.key.toLowerCase().includes("date") ||
              col.key.toLowerCase().includes("ngay")
                ? "date"
                : moneyFields.includes(col.key)
                ? "text" // tiền thì luôn là text để format
                : typeof value === "number"
                ? "number"
                : "text";

            return (
              <div key={col.key} className="flex flex-col">
                <label className="font-semibold">{col.label}</label>

                <input
                  type={inputType}
                  value={
                    moneyFields.includes(col.key)
                      ? formatMoney(value) // 🔥 hiển thị dạng tiền
                      : inputType === "date"
                      ? formatDate(value)
                      : value ?? ""
                  }
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  className="border rounded w-full p-2 mt-1"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <label className="font-semibold">Lý do chỉnh sửa</label>
          <textarea
            rows={3}
            className="w-full border rounded p-2 mt-1"
            value={formData.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder="Nhập lý do..."
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}
