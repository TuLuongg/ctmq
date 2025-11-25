import React, { useState, useEffect } from "react";

export default function RideEditTripModal({
  initialData,
  onSubmit,
  onClose,
  currentUser,
}) {
  const [formData, setFormData] = useState({});

  // 🔹 Các cột hiển thị
  const allColumns = [
    { key: "ltState", label: "LT" },
    { key: "onlState", label: "ONL" },
    { key: "offState", label: "OFF" },
    { key: "dieuVan", label: "ĐIỀU VẬN" },
    { key: "createdBy", label: "NGƯỜI NHẬP" },
    { key: "tenLaiXe", label: "TÊN LÁI XE" },
    { key: "maKH", label: "MÃ KH" },
    { key: "dienGiai", label: "DIỄN GIẢI" },
    { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
    { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
    { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
    { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
    { key: "soDiem", label: "SỐ ĐIỂM" },
    { key: "trongLuong", label: "TRỌNG LƯỢNG" },
    { key: "bienSoXe", label: "BIỂN SỐ XE" },
    { key: "cuocPhiBS", label: "CƯỚC PHÍ (BỔ SUNG)" },
    { key: "daThanhToan", label: "ĐÃ THANH TOÁN" },
    { key: "bocXepBS", label: "BỐC XẾP (BỔ SUNG)" },
    { key: "veBS", label: "VÉ (BỔ SUNG)" },
    { key: "hangVeBS", label: "HÀNG VỀ (BỔ SUNG)" },
    { key: "luuCaBS", label: "LƯU CA (BỔ SUNG)" },
    { key: "cpKhacBS", label: "LUẬT CP KHÁC (BỔ SUNG)" },
    { key: "maChuyen", label: "MÃ CHUYẾN" },
    { key: "khachHang", label: "KHÁCH HÀNG" },
    { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
    { key: "maHoaDon", label: "MÃ HOÁ ĐƠN" },

    // REGION: extra columns 
    { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
    { key: "cuocPhi", label: "CƯỚC PHÍ BĐ" },
    { key: "bocXep", label: "BỐC XẾP BĐ" },
    { key: "ve", label: "VÉ BĐ" },
    { key: "hangVe", label: "HÀNG VỀ BĐ" },
    { key: "luuCa", label: "LƯU CA BĐ" },
    { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC BĐ" },
    { key: "ghiChu", label: "GHI CHÚ (BẮT BUỘC)" },
  ];

  // 🔹 Các trường tài chính
  const financialColumns = [
    "maHoaDon",
    "cuocPhiBS",
    "daThanhToan",
    "bocXepBS",
    "veBS",
    "hangVeBS",
    "luuCaBS",
    "cpKhacBS",
  ];

  // 🔹 User có quyền full hay không
  const canEditFinancial =
    currentUser?.permissions?.includes("edit_trip_full");

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        ghiChu: initialData.ghiChu || "",
      });
    }
  }, [initialData]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.ghiChu?.trim()) {
      alert("Vui lòng nhập ghi chú!");
      return;
    }

    onSubmit(formData);
  };

  // Format ngày yyyy-mm-dd
  const formatDate = (value) => {
    if (!value) return "";
    try {
      return value.split("T")[0];
    } catch {
      return value;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-5xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          Chỉnh sửa chuyến: {initialData?.maChuyen || initialData?._id}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {allColumns.map(({ key, label }) => {
            // Không cho sửa mã chuyến
            const isReadOnly = key === "maChuyen";

            // Nếu không có quyền → ẩn các trường tài chính
            if (!canEditFinancial && financialColumns.includes(key)) {
              return null;
            }

            const value = formData[key];
            const inputType =
              key.toLowerCase().includes("ngay") ||
              key.toLowerCase().includes("date")
                ? "date"
                : typeof value === "number"
                ? "number"
                : "text";

            return (
              <div key={key} className="flex flex-col">
                <label className="font-semibold">{label}</label>

                {isReadOnly ? (
                  <div className="p-2 mt-1 border rounded bg-gray-100 text-gray-600">
                    {value}
                  </div>
                ) : (
                  <input
                    type={inputType}
                    className="border rounded w-full p-2 mt-1"
                    value={inputType === "date" ? formatDate(value) : value || ""}
                    onChange={(e) =>
                      handleChange(
                        key,
                        inputType === "number"
                          ? Number(e.target.value)
                          : e.target.value
                      )
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
}
