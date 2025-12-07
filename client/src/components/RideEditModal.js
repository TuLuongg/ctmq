import React, { useEffect, useState } from "react";

export default function RideEditModal({ ride, onSubmit, onClose }) {
  const [formData, setFormData] = useState({});

  const moneyFields = ["cuocPhi", "bocXep", "ve", "hangVe", "luuCa", "chiPhiKhac", "daThanhToan"];

  const formatMoney = (value) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    if (ride) {
      setFormData({ ...ride, reason: "" });
    }
  }, [ride]);

  if (!ride) return null;

  const handleChange = (key, value) => {
    if (moneyFields.includes(key)) {
      const raw = value.replace(/\./g, "");
      if (isNaN(raw)) return;
      setFormData((prev) => ({ ...prev, [key]: raw }));
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (value) => {
    if (!value) return "";
    return value.split("T")[0] || value;
  };

  const handleSubmit = () => {
    if (!formData.reason?.trim()) {
      alert("Vui lòng nhập lý do!");
      return;
    }
    onSubmit(formData);
  };

  /* ==========================
      CHECKBOX: CÓ tick → hiện input
     ========================== */
  const feeItems = [
    { key: "bocXep", label: "Bốc xếp" },
    { key: "hangVe", label: "Hàng về" },
    { key: "ve", label: "Vé" },
    { key: "luuCa", label: "Lưu ca" },
    { key: "luatChiPhiKhac", label: "Luật Chi phí khác", full: true },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh] w-3/4">

        <h2 className="text-xl font-bold mb-4">
          Chỉnh sửa chuyến: {ride.maChuyen || ride._id}
        </h2>

        <div className="grid grid-cols-2 gap-6">

          {/* ======================== BÊN TRÁI ========================== */}
          <div className="border rounded p-4">

            {/* LT – ONL – OFF */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="font-semibold">LT</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.ltState || ""}
                  onChange={(e) => handleChange("ltState", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">ONL</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.onlState || ""}
                  onChange={(e) => handleChange("onlState", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">OFF</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.offState || ""}
                  onChange={(e) => handleChange("offState", e.target.value)}
                />
              </div>
            </div>

            {/* Mã KH – Khách hàng (không cho sửa) */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="font-semibold">Mã KH</label>
                <input
                  className="border rounded w-full p-2 mt-1 bg-gray-200"
                  value={formData.maKH || ""}
                  readOnly
                />
              </div>

              <div className="col-span-2">
                <label className="font-semibold">Khách hàng</label>
                <input
                  className="border rounded w-full p-2 mt-1 bg-gray-200"
                  value={formData.khachHang || ""}
                  readOnly
                />
              </div>
            </div>

            {/* Điểm đóng hàng */}
            <div className="mb-3">
              <label className="font-semibold">Điểm đóng hàng</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.diemXepHang || ""}
                onChange={(e) => handleChange("diemXepHang", e.target.value)}
              />
            </div>

            {/* Điểm giao hàng */}
            <div className="mb-3">
              <label className="font-semibold">Điểm giao hàng</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.diemDoHang || ""}
                onChange={(e) => handleChange("diemDoHang", e.target.value)}
              />
            </div>

            {/* Số điểm – Trọng lượng */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Số điểm</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.soDiem || ""}
                  onChange={(e) => handleChange("soDiem", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Trọng lượng</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.trongLuong || ""}
                  onChange={(e) => handleChange("trongLuong", e.target.value)}
                />
              </div>
            </div>

            {/* Cước phí – Đã thanh toán */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Cước phí</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formatMoney(formData.cuocPhi)}
                  onChange={(e) => handleChange("cuocPhi", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Đã thanh toán</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.daThanhToan || ""}
                  onChange={(e) => handleChange("daThanhToan", e.target.value)}
                />
              </div>
            </div>

            {/* Kế toán PT – Mã hóa đơn */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Kế toán PT</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.keToanPhuTrach || ""}
                  onChange={(e) => handleChange("keToanPhuTrach", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Mã hóa đơn</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.maHoaDon || ""}
                  onChange={(e) => handleChange("maHoaDon", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========================= BÊN PHẢI ========================= */}
          <div className="border rounded p-4">
            <div className="mb-3">
              <label className="font-semibold">Tên lái xe</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.tenLaiXe || ""}
                onChange={(e) => handleChange("tenLaiXe", e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="font-semibold">Diễn giải</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.dienGiai || ""}
                onChange={(e) => handleChange("dienGiai", e.target.value)}
              />
            </div>

            {/* Ngày đóng – Ngày giao */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Ngày đóng hàng</label>
                <input
                  type="date"
                  className="border rounded w-full p-2 mt-1"
                  value={formatDate(formData.ngayBocHang)}
                  onChange={(e) => handleChange("ngayBocHang", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Ngày giao hàng</label>
                <input
                  type="date"
                  className="border rounded w-full p-2 mt-1"
                  value={formatDate(formData.ngayGiaoHang)}
                  onChange={(e) => handleChange("ngayGiaoHang", e.target.value)}
                />
              </div>
            </div>

{/* ===== CƯỚC PHÍ PHỤ ===== */}
<div className="mb-3">
  <label className="font-semibold">Cước phí phụ BĐ</label>

  {/* Dòng 1: Bốc xếp – Hàng về */}
  <div className="grid grid-cols-2 gap-3 mt-2">
    {/* BỐC XẾP */}
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!formData.bocXepEnabled}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            bocXepEnabled: e.target.checked,
            bocXep: e.target.checked
              ? prev.bocXep || ride.bocXep || ""
              : prev.bocXep, // ẩn nhưng giữ nguyên
          }))
        }
      />
      <span className="whitespace-nowrap">Bốc xếp</span>

      {formData.bocXepEnabled && (
        <input
          className="border rounded p-2 w-full"
          value={formatMoney(formData.bocXep || "")}
          onChange={(e) => handleChange("bocXep", e.target.value)}
        />
      )}
    </div>

    {/* HÀNG VỀ */}
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!formData.hangVeEnabled}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            hangVeEnabled: e.target.checked,
            hangVe: e.target.checked
              ? prev.hangVe || ride.hangVe || ""
              : prev.hangVe,
          }))
        }
      />
      <span className="whitespace-nowrap">Hàng về</span>

      {formData.hangVeEnabled && (
        <input
          className="border rounded p-2 w-full"
          value={formatMoney(formData.hangVe || "")}
          onChange={(e) => handleChange("hangVe", e.target.value)}
        />
      )}
    </div>
  </div>

  {/* Dòng 2: Vé – Lưu ca */}
  <div className="grid grid-cols-2 gap-3 mt-3">
    {/* VÉ */}
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!formData.veEnabled}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            veEnabled: e.target.checked,
            ve: e.target.checked ? prev.ve || ride.ve || "" : prev.ve,
          }))
        }
      />
      <span className="whitespace-nowrap">Vé</span>

      {formData.veEnabled && (
        <input
          className="border rounded p-2 w-full"
          value={formatMoney(formData.ve || "")}
          onChange={(e) => handleChange("ve", e.target.value)}
        />
      )}
    </div>

    {/* LƯU CA */}
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!formData.luuCaEnabled}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            luuCaEnabled: e.target.checked,
            luuCa: e.target.checked ? prev.luuCa || ride.luuCa || "" : prev.luuCa,
          }))
        }
      />
      <span className="whitespace-nowrap">Lưu ca</span>

      {formData.luuCaEnabled && (
        <input
          className="border rounded p-2 w-full"
          value={formatMoney(formData.luuCa || "")}
          onChange={(e) => handleChange("luuCa", e.target.value)}
        />
      )}
    </div>
  </div>

  {/* Dòng 3: Chi phí khác full width */}
  <div className="mt-3 flex items-center gap-3">
    <input
      type="checkbox"
      checked={!!formData.chiPhiKhacEnabled}
      onChange={(e) =>
        setFormData((prev) => ({
          ...prev,
          chiPhiKhacEnabled: e.target.checked,
          chiPhiKhac: e.target.checked
            ? prev.chiPhiKhac || ride.chiPhiKhac || ""
            : prev.chiPhiKhac,
        }))
      }
    />
    <span className="whitespace-nowrap">Chi phí khác</span>

    {formData.chiPhiKhacEnabled && (
      <input
        className="border rounded p-2 w-full"
        value={formatMoney(formData.chiPhiKhac || "")}
        onChange={(e) => handleChange("chiPhiKhac", e.target.value)}
      />
    )}
  </div>
</div>




            {/* Điều vận */}
            <div className="mb-3">
              <label className="font-semibold">Điều vận</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.dieuVan || ""}
                onChange={(e) => handleChange("dieuVan", e.target.value)}
              />
            </div>

            {/* Ngày nhập – KHÔNG CHO SỬA */}
            <div className="mb-3">
              <label className="font-semibold">Ngày nhập</label>
              <input
                type="date"
                className="border rounded w-full p-2 mt-1 bg-gray-200"
                value={formatDate(formData.ngayBoc)}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Lý do chỉnh sửa */}
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

        {/* FOOTER */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Gửi yêu cầu
          </button>
        </div>

      </div>
    </div>
  );
}
