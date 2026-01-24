import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";
import API from "../api";

const API_URL = `${API}/schedule-admin`;

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

const formatDate = (v) => {
  if (!v) return "—";
  try {
    return format(new Date(v), "dd/MM/yyyy");
  } catch {
    return v;
  }
};

const sameDate = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;

  try {
    return (
      format(new Date(a), "yyyy-MM-dd") === format(new Date(b), "yyyy-MM-dd")
    );
  } catch {
    return false;
  }
};

const isDifferent = (oldVal, newVal, field) => {
  if (field.isDate) {
    return !sameDate(oldVal, newVal);
  }

  if (field.isMoney) {
    const o = Number(String(oldVal ?? "").replace(/[^\d-]/g, ""));
    const n = Number(String(newVal ?? "").replace(/[^\d-]/g, ""));
    return o !== n;
  }

  return String(oldVal ?? "").trim() !== String(newVal ?? "").trim();
};

const getApprovedChange = (req, field) => {
  const cf = req.changedFields?.[field.key];
  if (!cf) return null;

  const { old, new: newVal } = cf;

  // dùng lại logic so sánh cũ
  if (!isDifferent(old, newVal, field)) return null;

  return { old, newVal };
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

export default function RideAllRequestModal({ open, onClose, onLoaded }) {
  const [noteMap, setNoteMap] = useState({}); // note theo requestID
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const PER_PAGE = 20;
  const token = localStorage.getItem("token");

  const tableRef = React.useRef(null);

  const useResizableColumns = () => {
    const startResize = (e, colIndex, tableRef) => {
      e.preventDefault();
      const table = tableRef.current;
      if (!table) return;

      const startX = e.clientX;
      const th = table.querySelectorAll("th")[colIndex];
      if (!th) return;

      const startWidth = th.offsetWidth;

      const onMouseMove = (ev) => {
        const newWidth = Math.max(60, startWidth + ev.clientX - startX);

        table.querySelectorAll("tr").forEach((row) => {
          const cell = row.children[colIndex];
          if (cell) {
            cell.style.width = `${newWidth}px`;
            cell.style.minWidth = `${newWidth}px`;
            cell.style.maxWidth = `${newWidth}px`;
          }
        });
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return { startResize };
  };

  const { startResize } = useResizableColumns();

  const fetchRequests = async (p = page) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/all-requests`, {
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

      onLoaded && onLoaded();
    } catch (err) {
      console.error("Lỗi lấy danh sách yêu cầu:", err);
      onLoaded && onLoaded();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequests(1);
    }
  }, [open]);

  if (!open) return null;

  const handleProcess = async (req, action) => {
    if (processingId) return; // chặn double click

    try {
      setProcessingId(req._id);

      await axios.post(
        `${API_URL}/edit-process`,
        {
          requestID: req._id,
          action,
          note: noteMap[req._id] || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ reload lại danh sách
      await fetchRequests(page);
    } catch (e) {
      alert("Lỗi xử lý");
    } finally {
      setProcessingId(null);
    }
  };

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center text-xs">
      <div className="bg-white w-[95vw] max-h-[90vh] rounded shadow-lg p-4 flex flex-col">
        <div className="flex justify-between mb-3">
          <h2 className="font-bold text-lg">Danh sách yêu cầu chỉnh sửa</h2>
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">
            ✖
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 z-40 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3"></div>
            <div className="text-sm text-gray-700 font-semibold">
              Đang tải dữ liệu, vui lòng chờ...
            </div>
          </div>
        )}

        {/* TABLE SCROLL */}
        <div className="relative h-[600px] overflow-y-auto">
          <table
            ref={tableRef}
            className="text-xs border-separate border-spacing-0"
          >
            <thead className="bg-gray-200">
              <tr>
                {[
                  "Thời gian",
                  "Mã chuyến",
                  "Người YC",
                  "Lý do",
                  ...FIELD_MAP.map((f) => f.label),
                  "Xử lý",
                ].map((label, index) => {
                  const isMaChuyen = index === 1;
                  const isActionCol = index === FIELD_MAP.length + 4;

                  return (
                    <th
                      key={index}
                      className={`border p-2 relative whitespace-nowrap sticky top-0 bg-gray-200
    ${isMaChuyen ? "left-0 z-40" : ""}
    ${isActionCol ? "right-0 z-40" : ""}
  `}
                    >
                      <div className="truncate pr-2">{label}</div>

                      <div
                        onMouseDown={(e) => startResize(e, index, tableRef)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-500"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {requests.map((req) => {
                const oldData = req.rideID || {};
                const newData = req.changes || {};

                return (
                  <tr key={req._id} className="hover:bg-gray-50">
                    {/* Thời gian */}
                    <td className="border p-2 overflow-hidden">
                      <div className="truncate">
                        {format(new Date(req.createdAt), "dd/MM HH:mm")}
                      </div>
                    </td>

                    {/* MÃ CHUYẾN – STICKY */}
                    <td className="border p-2 sticky left-0 bg-white z-30 font-semibold overflow-hidden">
                      <div className="truncate">{oldData.maChuyen || "—"}</div>
                    </td>

                    {/* Người YC */}
                    <td className="border p-2 overflow-hidden">
                      <div className="truncate">{req.requestedBy}</div>
                    </td>

                    {/* Lý do */}
                    <td className="border p-2 overflow-hidden text-blue-600">
                      <div className="truncate">{req.reason || "—"}</div>
                    </td>

                    {/* FIELD MAP */}
                    {FIELD_MAP.map((f) => {
                      let oldVal, newVal;
                      let changed = false;

                      if (req.status === "pending") {
                        oldVal = oldData[f.key];
                        newVal = newData[f.key];
                        changed = isDifferent(oldVal, newVal, f);
                      }

                      if (req.status === "approved") {
                        const approvedChange = getApprovedChange(req, f);
                        if (approvedChange) {
                          oldVal = approvedChange.old;
                          newVal = approvedChange.newVal;
                          changed = true;
                        } else {
                          oldVal = oldData[f.key];
                        }
                      }

                      return (
                        <td key={f.key} className="border p-2 overflow-hidden">
                          <div className="truncate">
                            {changed ? (
                              <span className="font-semibold">
                                {/* GIÁ TRỊ CŨ – ĐỎ */}
                                <span className="text-red-600">
                                  {f.isDate
                                    ? formatDate(oldVal)
                                    : f.isMoney
                                    ? formatMoney(oldVal)
                                    : oldVal ?? "—"}
                                </span>

                                {/* MŨI TÊN – ĐEN */}
                                <span className="mx-1 text-black">→</span>

                                {/* GIÁ TRỊ MỚI – XANH */}
                                <span className="text-green-600">
                                  {f.isDate
                                    ? formatDate(newVal)
                                    : f.isMoney
                                    ? formatMoney(newVal)
                                    : newVal ?? "—"}
                                </span>
                              </span>
                            ) : f.isDate ? (
                              formatDate(oldVal)
                            ) : f.isMoney ? (
                              formatMoney(oldVal)
                            ) : (
                              oldVal ?? "—"
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* ACTION – STICKY RIGHT */}
                    <td className="border p-2 sticky right-0 bg-white z-30 min-w-[130px]">
                      {req.status !== "pending" ? (
                        <div className="text-center font-semibold">
                          {req.status === "approved" && (
                            <span className="text-green-600">Đã duyệt</span>
                          )}
                          {req.status === "rejected" && (
                            <span className="text-red-600">Từ chối</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <button
                            disabled={processingId === req._id}
                            className="flex-1 bg-green-600 text-white px-1 py-1 rounded disabled:opacity-50"
                            onClick={() => handleProcess(req, "approve")}
                          >
                            {processingId === req._id
                              ? "Đang xử lý..."
                              : "Duyệt"}
                          </button>

                          <button
                            disabled={processingId === req._id}
                            className="flex-1 bg-red-600 text-white px-1 py-1 rounded disabled:opacity-50"
                            onClick={() => handleProcess(req, "reject")}
                          >
                            {processingId === req._id
                              ? "Đang xử lý..."
                              : "Từ chối"}
                          </button>
                        </div>
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
              onClick={() => fetchRequests(page - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
            >
              ← Trước
            </button>

            {/* SELECT PAGE */}
            <div className="flex items-center gap-2">
              <span>Trang</span>
              <select
                value={page}
                onChange={(e) => fetchRequests(Number(e.target.value))}
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
              onClick={() => fetchRequests(page + 1)}
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
