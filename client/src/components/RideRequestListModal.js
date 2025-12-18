import React, { useState, useMemo } from "react";
import { format } from "date-fns";

/* =====================
   FIELD MAP
===================== */
const FIELD_MAP = [
  { key: "ltState", label: "LT" },
  { key: "onlState", label: "ONL" },
  { key: "offState", label: "OFF" },
  { key: "dieuVan", label: "Điều vận" },
  { key: "createdBy", label: "Người nhập" },
  { key: "ngayBoc", label: "Ngày nhập", isDate: true },
  { key: "tenLaiXe", label: "Tên lái xe" },
  { key: "maKH", label: "Mã KH" },
  { key: "dienGiai", label: "Diễn giải" },
  { key: "ngayBocHang", label: "Ngày đóng", isDate: true },
  { key: "ngayGiaoHang", label: "Ngày giao", isDate: true },
  { key: "diemXepHang", label: "Điểm đóng" },
  { key: "diemDoHang", label: "Điểm giao" },
  { key: "soDiem", label: "Số điểm" },

  { key: "cuocPhi", label: "Cước phí BĐ", isMoney: true },
  { key: "bocXep", label: "Bốc xếp BĐ", isMoney: true },
  { key: "ve", label: "Vé BĐ", isMoney: true },
  { key: "hangVe", label: "Hàng về BĐ", isMoney: true },
  { key: "luuCa", label: "Lưu ca BĐ", isMoney: true },
  { key: "luatChiPhiKhac", label: "CP khác BĐ", isMoney: true },

  { key: "ghiChu", label: "Ghi chú" },
];

/* =====================
   HELPERS
===================== */
const formatDate = (v) => {
  if (!v) return "—";
  try {
    return format(new Date(v), "dd/MM/yyyy");
  } catch {
    return v;
  }
};

const formatMoney = (value) => {
  if (value == null || value === "") return "—";
  const num = Number(String(value).replace(/[^\d-]/g, ""));
  if (isNaN(num)) return value;
  return num.toLocaleString("vi-VN");
};

const isDifferent = (oldVal, newVal) => {
  if (oldVal == null && newVal == null) return false;
  return String(oldVal ?? "").trim() !== String(newVal ?? "").trim();
};

/* =====================
   COMPONENT
===================== */
export default function RideRequestListModal({
  open,
  onClose,
  title = "Danh sách yêu cầu chỉnh sửa",
  requests = [],
}) {
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(requests.length / PER_PAGE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return requests.slice(start, start + PER_PAGE);
  }, [page, requests]);

  if (!open) return null;

  const renderStatus = (status) => {
    const map = {
      pending: { text: "Đang chờ", color: "orange" },
      approved: { text: "Thành công", color: "green" },
      rejected: { text: "Từ chối", color: "red" },
    };
    return (
      <span style={{ fontWeight: 700, color: map[status]?.color }}>
        {map[status]?.text || status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white w-[95vw] max-h-[90vh] rounded shadow-lg p-4 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between mb-3">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">
            ✖
          </button>
        </div>

        <div className="overflow-auto border">
          <table className="min-w-[2400px] border-collapse text-xs">
            <thead className="sticky top-0 bg-gray-200 z-20">
              <tr>
                <th className="border p-2">Thời gian</th>

                {/* STICKY LEFT */}
                <th className="border p-2 sticky left-0 bg-gray-200 z-30">
                  Mã chuyến
                </th>

                <th className="border p-2">Người yêu cầu</th>
                <th className="border p-2">Lý do chỉnh sửa</th>

                {FIELD_MAP.map((f) => (
                  <th key={f.key} className="border p-2 whitespace-nowrap">
                    {f.label}
                  </th>
                ))}

                <th
                  className="border p-2 sticky bg-gray-200 z-40"
                  style={{ right: 80, minWidth: 80 }}
                >
                  Trạng thái
                </th>

                <th
                  className="border p-2 sticky bg-gray-200 z-40"
                  style={{ right: 0, minWidth: 80 }}
                >
                  Huỷ
                </th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((req) => {
                const oldData = req.rideID || {};
                const newData = req.changes || {};

                return (
                  <tr key={req._id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      {format(new Date(req.createdAt), "dd/MM HH:mm")}
                    </td>

                    {/* STICKY LEFT CELL */}
                    <td className="border p-2 sticky left-0 bg-white z-20 font-semibold">
                      {oldData.maChuyen || "—"}
                    </td>

                    <td className="border p-2">{req.requestedBy}</td>

                    <td className="border p-2">{req.reason || "—"}</td>

                    {FIELD_MAP.map((f) => {
                      const oldVal = oldData[f.key];
                      const newVal = newData[f.key];
                      const changed = isDifferent(oldVal, newVal);

                      return (
                        <td key={f.key} className="border p-2">
                          {changed ? (
                            <span className="text-red-600 font-semibold">
                              {f.isDate
                                ? formatDate(oldVal)
                                : f.isMoney
                                ? formatMoney(oldVal)
                                : oldVal ?? "—"}
                              {" → "}
                              {f.isDate
                                ? formatDate(newVal)
                                : f.isMoney
                                ? formatMoney(newVal)
                                : newVal ?? "—"}
                            </span>
                          ) : (
                            <span>
                              {f.isDate
                                ? formatDate(oldVal)
                                : f.isMoney
                                ? formatMoney(oldVal)
                                : oldVal ?? "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* STICKY RIGHT CELLS */}
                    <td className="border p-2 sticky right-[80px] bg-white z-20 text-center">
                      {renderStatus(req.status)}
                    </td>

                    <td className="border p-2 sticky right-0 bg-white z-20 text-center">
                      <button
                        className="text-red-600 hover:underline font-semibold"
                        onClick={() => {
                          // TODO: bạn gắn API huỷ ở đây
                          console.log("Cancel request:", req._id);
                        }}
                      >
                        Huỷ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-gray-300 rounded disabled:opacity-40"
            >
              ← Trước
            </button>

            <span>
              Trang {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-300 rounded disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
