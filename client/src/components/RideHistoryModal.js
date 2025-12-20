import React from "react";

// Nhập các cột giống DieuVanPage
const mainColumns = [
  { key: "dieuVan", label: "ĐIỀU VẬN PHỤ TRÁCH" },
  { key: "createdBy", label: "NGƯỜI NHẬP" },
  { key: "ngayBoc", label: "NGÀY NHẬP" },
  { key: "tenLaiXe", label: "TÊN LÁI XE" },
  { key: "khachHang", label: "KHÁCH HÀNG" },
  { key: "ngayBocHang", label: "NGÀY BỐC HÀNG" },
  { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
  { key: "bienSoXe", label: "BIỂN SỐ XE" },
  { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const extraColumns = [
  { key: "dienGiai", label: "DIỄN GIẢI" },
  { key: "diemXepHang", label: "ĐIỂM XẾP HÀNG" },
  { key: "diemDoHang", label: "ĐIỂM DỠ HÀNG" },
  { key: "soDiem", label: "SỐ ĐIỂM" },
  { key: "trongLuong", label: "TRỌNG LƯỢNG" },
  { key: "cuocPhi", label: "CƯỚC PHÍ" },
  { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
  { key: "bocXep", label: "BỐC XẾP" },
  { key: "ve", label: "VÉ" },
  { key: "hangVe", label: "HÀNG VỀ" },
  { key: "luuCa", label: "LƯU CA" },
  { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC" },
  { key: "ghiChu", label: "GHI CHÚ" },
];


// Tạo map key -> label
const columnLabels = [...mainColumns, ...extraColumns].reduce((acc, col) => {
  acc[col.key] = col.label;
  return acc;
}, {});


export default function RideHistoryModal({ ride, historyData, onClose, role }) {
  if (!ride) return null;

  // Danh sách key cho phép xem nếu là điều vận
  const allowedKeys = [
    ...mainColumns.map(c => c.key),
    ...extraColumns.map(c => c.key)
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-5xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          Lịch sử chỉnh sửa chuyến {ride.maChuyen || ride._id}
        </h2>

        <div className="overflow-x-auto">
          <table className="border-collapse border w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-left">Thời gian</th>
                <th className="border p-2 text-left">Người chỉnh sửa</th>
                <th className="border p-2 text-left">Lý do</th>
                <th className="border p-2 text-left">Các trường thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((h, idx) => (
                <tr key={idx} className="hover:bg-gray-100">
                  <td className="border p-2">{new Date(h.createdAt).toLocaleString()}</td>
                  <td className="border p-2">{h.editedBy}</td>
                  <td className="border p-2">{h.reason || "-"}</td>
                  
                  <td className="border p-2 space-y-1 text-left">
                    {Object.keys(h.newData).map((key) => {
                      if (key === "updatedAt") return null;
                      // Nếu role là điều vận → chỉ cho xem trong main + extra
                      if (role === "dieuVan" && !allowedKeys.includes(key)) {
                        return null; 
                      }

                      const oldVal = h.previousData[key];
                      const newVal = h.newData[key];
                      if (oldVal !== newVal) {
                        return (
                          <div key={key}>
                            <span className="font-semibold">{columnLabels[key] || key}:</span>{" "}
                            <span className="text-red-500">{oldVal || "0"}</span> →{" "}
                            <span className="text-green-600">{newVal || "0"}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

