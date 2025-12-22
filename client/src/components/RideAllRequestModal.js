import React, { useState, useMemo } from "react";
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

const formatDate = (v) => {
  if (!v) return "—";
  try {
    return format(new Date(v), "dd/MM/yyyy");
  } catch {
    return v;
  }
};

const isDifferent = (oldVal, newVal) => {
  if (oldVal == null && newVal == null) return false;
  return String(oldVal ?? "").trim() !== String(newVal ?? "").trim();
};

const formatMoney = (value) => {
  if (value == null || value === "") return "—";

  const num = Number(String(value).replace(/[^\d-]/g, ""));
  if (isNaN(num)) return value;

  return num.toLocaleString("vi-VN");
};

export default function RideAllRequestModal({
  open,
  onClose,
  requests = [],
  reload,
}) {
  const token = localStorage.getItem("token");
  const [noteMap, setNoteMap] = useState({}); // note theo requestID
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(requests.length / PER_PAGE);

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return requests.slice(start, start + PER_PAGE);
  }, [page, requests]);

  if (!open) return null;

  const handleProcess = async (req, action) => {
    if (action === "reject" && !noteMap[req._id]?.trim()) {
      return alert("Nhập lý do từ chối");
    }

    try {
      await axios.post(
        `${API_URL}/edit-process`,
        {
          requestID: req._id,
          action,
          note: noteMap[req._id] || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      reload && reload();
    } catch (e) {
      alert("Lỗi xử lý");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center text-xs">
      <div className="bg-white w-[95vw] max-h-[90vh] rounded shadow-lg p-4 flex flex-col">
        <div className="flex justify-between mb-3">
          <h2 className="font-bold text-lg">Danh sách yêu cầu chỉnh sửa</h2>
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">
            ✖
          </button>
        </div>

        {/* TABLE SCROLL */}
        <div className="overflow-auto border">
          <table className="min-w-[2400px] border-collapse text-xs">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr>
                <th className="border p-2">Thời gian</th>
                <th className="border p-2 sticky left-[0px] bg-gray-200 z-20">
                  Mã chuyến
                </th>
                <th className="border p-2">Người yêu cầu</th>
                <th className="border p-2">Lý do chỉnh sửa</th>

                {FIELD_MAP.map((f) => (
                  <th key={f.key} className="border p-2 whitespace-nowrap">
                    {f.label}
                  </th>
                ))}

                <th className="border p-2 sticky right-0 bg-gray-200">Xử lý</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRequests.map((req) => {
                const oldData = req.rideID || {};
                const newData = req.changes || {};

                return (
                  <tr key={req._id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      {format(new Date(req.createdAt), "dd/MM HH:mm")}
                    </td>

                    <td className="border p-2 sticky left-[0px] bg-white z-10 font-semibold">
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

                    {/* ACTION */}
                    <td className="border p-2 sticky right-0 bg-white min-w-[160px]">
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
                        <>
                          <div className="flex gap-1 justify-center">
                            <button
                              className="flex-1 bg-green-600 text-white px-2 py-1 rounded"
                              onClick={() => handleProcess(req, "approve")}
                            >
                              Duyệt
                            </button>
                            <button
                              className="flex-1 bg-red-600 text-white px-2 py-1 rounded"
                              onClick={() => handleProcess(req, "reject")}
                            >
                              Từ chối
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-3 text-sm">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
              >
                ← Trước
              </button>

              <span>
                Trang <b>{page}</b> / {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
