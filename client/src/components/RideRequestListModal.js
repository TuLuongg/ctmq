import React, { useState, useMemo } from "react";
import { format } from "date-fns";

// Danh sách các trường cho phép so sánh
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
  { key: "ngayBocHang", label: "Ngày đóng hàng", isDate: true },
  { key: "ngayGiaoHang", label: "Ngày giao hàng", isDate: true },
  { key: "diemXepHang", label: "Điểm đóng hàng" },
  { key: "diemDoHang", label: "Điểm giao hàng" },
  { key: "soDiem", label: "Số điểm" },
  { key: "trongLuong", label: "Trọng lượng" },
  { key: "bienSoXe", label: "Biển số xe" },
  { key: "cuocPhiBS", label: "Cước phí" },
  { key: "daThanhToan", label: "Đã thanh toán" },
  { key: "bocXepBS", label: "Bốc xếp" },
  { key: "veBS", label: "Vé" },
  { key: "hangVeBS", label: "Hàng về" },
  { key: "luuCaBS", label: "Lưu ca" },
  { key: "cpKhacBS", label: "Chi phí khác" },
  { key: "maChuyen", label: "Mã chuyến" },
  { key: "khachHang", label: "Khách hàng" },
  { key: "keToanPhuTrach", label: "Kế toán phụ trách" },
  { key: "maHoaDon", label: "Mã hóa đơn" },
  { key: "laiXeThuCuoc", label: "Lái xe thu cước" },
  { key: "cuocPhi", label: "Cước phí BĐ" },
  { key: "bocXep", label: "Bốc xếp BĐ" },
  { key: "ve", label: "Vé BĐ" },
  { key: "hangVe", label: "Hàng về BĐ" },
  { key: "luuCa", label: "Lưu ca BĐ" },
  { key: "luatChiPhiKhac", label: "CP khác BĐ" },
  { key: "ghiChu", label: "Ghi chú" },
];

// Format ngày dd/MM/yyyy
const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
};

// So sánh giá trị có khác nhau không
const isDifferent = (oldVal, newVal) => {
  if (oldVal == null && newVal == null) return false;
  if (oldVal === newVal) return false;

  const parseDate = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString().substring(0, 10);
  };

  const normalizedOld =
    !isNaN(Date.parse(oldVal)) ? parseDate(oldVal) : String(oldVal).trim();

  const normalizedNew =
    !isNaN(Date.parse(newVal)) ? parseDate(newVal) : String(newVal).trim();

  return normalizedOld !== normalizedNew;
};

export default function RideRequestListModal({
  open,
  onClose,
  title = "Danh sách yêu cầu chỉnh sửa",
  requests = [],
}) {
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const totalPages = Math.ceil(requests.length / PER_PAGE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return requests.slice(start, start + PER_PAGE);
  }, [page, requests]);

  if (!open) return null;

  // Render trạng thái
  const renderStatus = (status) => {
    const map = {
      pending: { text: "Đang chờ", color: "orange" },
      approved: { text: "Thành công", color: "green" },
      rejected: { text: "Từ chối", color: "red" },
    };
    return (
      <span style={{ fontWeight: 700, color: map[status]?.color || "black" }}>
        {map[status]?.text ?? status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-6xl shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded"
          >
            ✖
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-6 text-gray-600">
            Không có yêu cầu nào.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 w-32">Thời gian</th>
                <th className="border p-2">Mã chuyến</th>
                <th className="border p-2">Người yêu cầu</th>
                <th className="border p-2">Lý do</th>
                <th className="border p-2 w-24">Trạng thái</th>
                <th className="border p-2 w-12"></th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((req) => {
                const show = expanded === req._id;

                const previous = req?.rideID || {};
                const newData = req?.changes || {};

                const changed = FIELD_MAP.filter(({ key }) =>
                  isDifferent(previous[key], newData[key])
                );

                return (
                  <React.Fragment key={req._id}>
                    <tr>
                      <td className="border p-2">
                        {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}
                      </td>

                      <td className="border p-2">
                        {previous?.maChuyen || req.rideID || "—"}
                      </td>

                      <td className="border p-2">{req.requestedBy}</td>

                      <td className="border p-2">{req.reason}</td>

                      <td className="border p-2 text-center">
                        {renderStatus(req.status)}
                      </td>

                      <td className="border p-2 text-center">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() =>
                            setExpanded(show ? null : req._id)
                          }
                        >
                          {show ? "Ẩn" : "Xem"}
                        </button>
                      </td>
                    </tr>

                    {show && (
                      <tr>
                        <td colSpan={6} className="border bg-gray-50 p-3">
                          <div className="font-semibold mb-2">
                            Các thay đổi:
                          </div>

                          <table className="w-full text-sm border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-2 w-1/4">Mục</th>
                                <th className="border p-2">Giá trị gốc</th>
                                <th className="border p-2">Giá trị thay đổi</th>
                              </tr>
                            </thead>

                            <tbody>
                              {changed.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="text-center border p-3 text-gray-500"
                                  >
                                    Không có thay đổi nào.
                                  </td>
                                </tr>
                              ) : (
                                changed.map(({ key, label, isDate }) => (
                                  <tr key={key}>
                                    <td className="border p-2 font-medium">
                                      {label}
                                    </td>

                                    <td className="border p-2 text-red-600">
                                      {isDate
                                        ? formatDate(previous[key])
                                        : previous[key] ?? "—"}
                                    </td>

                                    <td className="border p-2 text-green-600">
                                      {isDate
                                        ? formatDate(newData[key])
                                        : newData[key] ?? "—"}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-40"
            >
              ← Trước
            </button>

            <span>
              Trang {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
