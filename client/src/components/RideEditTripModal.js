import React, { useEffect, useState } from "react";

export default function RideEditTripModal({
  initialData,
  onSubmit,
  onClose,
  currentUser,
}) {
  const [formData, setFormData] = useState({});

  const canEditFinancial = currentUser?.permissions?.includes("edit_trip_full");

  const moneyFields = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
    "cuocPhiBS",
    "bocXepBS",
    "veBS",
    "hangVeBS",
    "luuCaBS",
    "cpKhacBS",
    "daThanhToan",
  ];

  const formatMoney = (value) =>
    value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

  const formatDate = (v) => (v ? v.split("T")[0] : "");

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, ghiChu: initialData.ghiChu || "" });
    }
  }, [initialData]);

  const handleChange = (key, value) => {
    if (moneyFields.includes(key)) {
      const raw = value.replace(/\./g, "");
      if (isNaN(raw)) return;
      setFormData((p) => ({ ...p, [key]: raw }));
      return;
    }
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Chỉnh sửa chuyến: {formData.maChuyen || formData._id}
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {/* ================== TRÁI ================== */}
          <div className="border rounded p-4">
            {/* LT – ONL – OFF */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {["ltState", "onlState", "offState"].map((k) => (
                <div key={k}>
                  <label className="font-semibold">{k.toUpperCase()}</label>
                  <input
                    className="border rounded w-full p-2 mt-1"
                    value={formData[k] || ""}
                    onChange={(e) => handleChange(k, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* KH */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="font-semibold">Mã KH</label>
                <input
                  className="border rounded p-2 bg-gray-200 w-full"
                  readOnly
                  value={formData.maKH || ""}
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold">Khách hàng</label>
                <input
                  className="border rounded p-2 bg-gray-200 w-full"
                  readOnly
                  value={formData.khachHang || ""}
                />
              </div>
            </div>

            <label className="font-semibold">Điểm đóng hàng</label>
            <input
              className="border rounded p-2 w-full mb-3"
              value={formData.diemXepHang || ""}
              onChange={(e) => handleChange("diemXepHang", e.target.value)}
            />

            <label className="font-semibold">Điểm giao hàng</label>
            <input
              className="border rounded p-2 w-full mb-3"
              value={formData.diemDoHang || ""}
              onChange={(e) => handleChange("diemDoHang", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border rounded p-2"
                placeholder="Số điểm"
                value={formData.soDiem || ""}
                onChange={(e) => handleChange("soDiem", e.target.value)}
              />
              <input
                className="border rounded p-2"
                placeholder="Trọng lượng"
                value={formData.trongLuong || ""}
                onChange={(e) => handleChange("trongLuong", e.target.value)}
              />
            </div>

            {canEditFinancial && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="border rounded p-2"
                  placeholder="Cước phí"
                  value={formatMoney(formData.cuocPhi)}
                  onChange={(e) => handleChange("cuocPhi", e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="Đã thanh toán"
                  value={formatMoney(formData.daThanhToan)}
                  onChange={(e) => handleChange("daThanhToan", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* ================== PHẢI ================== */}
          <div className="border rounded p-4">
            <label className="font-semibold">Tên lái xe</label>
            <input
              className="border rounded p-2 w-full mb-3"
              value={formData.tenLaiXe || ""}
              onChange={(e) => handleChange("tenLaiXe", e.target.value)}
            />

            <label className="font-semibold">Diễn giải</label>
            <input
              className="border rounded p-2 w-full mb-3"
              value={formData.dienGiai || ""}
              onChange={(e) => handleChange("dienGiai", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="date"
                className="border rounded p-2"
                value={formatDate(formData.ngayBocHang)}
                onChange={(e) => handleChange("ngayBocHang", e.target.value)}
              />
              <input
                type="date"
                className="border rounded p-2"
                value={formatDate(formData.ngayGiaoHang)}
                onChange={(e) => handleChange("ngayGiaoHang", e.target.value)}
              />
            </div>

            {/* ===== CƯỚC PHÍ PHỤ GỐC (BĐ) ===== */}
            {canEditFinancial && (
              <div className="mb-4">
                <label className="font-semibold">Cước phí phụ (BĐ)</label>

                {/* Dòng 1 */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-sm">Bốc xếp</label>
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.bocXep)}
                      onChange={(e) => handleChange("bocXep", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm">Hàng về</label>
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.hangVe)}
                      onChange={(e) => handleChange("hangVe", e.target.value)}
                    />
                  </div>
                </div>

                {/* Dòng 2 */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-sm">Vé</label>
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.ve)}
                      onChange={(e) => handleChange("ve", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm">Lưu ca</label>
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.luuCa)}
                      onChange={(e) => handleChange("luuCa", e.target.value)}
                    />
                  </div>
                </div>

                {/* Dòng 3 – full width */}
                <div className="mt-3">
                  <label className="text-sm">Luật chi phí khác</label>
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.luatChiPhiKhac)}
                    onChange={(e) =>
                      handleChange("luatChiPhiKhac", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GHI CHÚ */}
        <div className="mt-4">
          <label className="font-semibold">Ghi chú (bắt buộc)</label>
          <textarea
            rows={3}
            className="border rounded w-full p-2 mt-1"
            value={formData.ghiChu}
            onChange={(e) => handleChange("ghiChu", e.target.value)}
          />
        </div>

        {/* ACTION */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
}
