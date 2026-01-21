import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";
import API from "../api";

const API_URL = `${API}/schedule-admin`;

/* =====================
   FIELD MAP
===================== */
const FIELD_MAP = [
  { key: "tenLaiXe", label: "Tên lái xe" },
  { key: "maKH", label: "Mã KH" },
  { key: "khachHang", label: "Tên KH" },
  { key: "dienGiai", label: "Diễn giải" },
  { key: "ngayBocHang", label: "Ngày đóng", isDate: true },
  { key: "ngayGiaoHang", label: "Ngày giao", isDate: true },
  { key: "diemXepHang", label: "Điểm đóng" },
  { key: "diemDoHang", label: "Điểm giao" },
  { key: "soDiem", label: "Số điểm" },
  { key: "themDiem", label: "Thêm điểm" },
  { key: "trongLuong", label: "Trọng lượng" },
  { key: "bienSoXe", label: "Biển số xe" },
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

  const str = String(value);

  // thay từng cụm số liên tiếp bằng số đã format
  return str.replace(/\d+/g, (match) => {
    const num = Number(match);
    if (isNaN(num)) return match;
    return num.toLocaleString("vi-VN");
  });
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
  onLoaded,
}) {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const PER_PAGE = 20;
  const token = localStorage.getItem("token");

  const fetchMyRequests = async (p = page) => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_URL}/my-requests`, {
        params: {
          page: p,
          limit: PER_PAGE,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setRequests(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || p);

      onLoaded && onLoaded(); // ✅ THÀNH CÔNG
    } catch (err) {
      console.error(
        "Lỗi lấy yêu cầu của tôi:",
        err.response?.data || err.message,
      );
      onLoaded && onLoaded(); // ✅ FAIL VẪN BÁO
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMyRequests(1);
    }
  }, [open]);

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

  const handleCancelRequest = async (req) => {
    if (req.status !== "pending") return;

    const ok = window.confirm("Bạn chắc chắn muốn huỷ yêu cầu chỉnh sửa này?");
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${API_URL}/delete-edit-request/${req._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // ✅ XOÁ DÒNG KHỎI MODAL
      setRequests((prev) => prev.filter((r) => r._id !== req._id));

      // nếu trang hiện tại bị rỗng thì lùi lại 1 trang
      setPage((p) => {
        const maxPage = Math.ceil((requests.length - 1) / PER_PAGE);
        return p > maxPage ? Math.max(maxPage, 1) : p;
      });
    } catch (err) {
      console.error("Huỷ yêu cầu thất bại:", err);
      alert(err?.response?.data?.error || "Huỷ yêu cầu chỉnh sửa thất bại");
    }
  };

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

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
              {requests.map((req) => {
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
                            <span className="font-semibold">
                              <span className="text-red-600">
                                {f.isDate
                                  ? formatDate(oldVal)
                                  : f.isMoney
                                    ? formatMoney(oldVal)
                                    : (oldVal ?? "—")}
                              </span>
                              <span className="mx-1 text-black">→</span>
                              <span className="text-green-600">
                                {f.isDate
                                  ? formatDate(newVal)
                                  : f.isMoney
                                    ? formatMoney(newVal)
                                    : (newVal ?? "—")}
                              </span>
                            </span>
                          ) : (
                            <span>
                              {f.isDate
                                ? formatDate(oldVal)
                                : f.isMoney
                                  ? formatMoney(oldVal)
                                  : (oldVal ?? "—")}
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
                      {req.status === "pending" ? (
                        <button
                          className="text-red-600 hover:underline font-semibold"
                          onClick={() => handleCancelRequest(req)}
                        >
                          Huỷ
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-3 text-sm gap-2">
            {/* PREV */}
            <button
              disabled={page === 1}
              onClick={() => fetchMyRequests(page - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
            >
              ← Trước
            </button>

            {/* SELECT PAGE */}
            <div className="flex items-center gap-2">
              <span>Trang</span>
              <select
                value={page}
                onChange={(e) => fetchMyRequests(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                {pageOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <span>/ {totalPages}</span>
            </div>

            {/* NEXT */}
            <button
              disabled={page === totalPages}
              onClick={() => fetchMyRequests(page + 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
