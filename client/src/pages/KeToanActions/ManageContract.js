import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import ContractModal from "../../components/ContractModal"; // tương tự VehicleModal
import { format as formatDateFns } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const apiContracts = `${API}/transportation-contract`;

const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatPrice = (val) => {
  if (val == null) return "";
  return new Intl.NumberFormat("vi-VN").format(val);
};

// columns for contracts (first two columns sticky)
export const allColumns = [
  { key: "khachHang", label: "TÊN KHÁCH HÀNG", stickyIndex: 0 },
  { key: "numberTrans", label: "SỐ HỢP ĐỒNG VẬN CHUYỂN", stickyIndex: 1 },
  { key: "typeTrans", label: "LOẠI HỢP ĐỒNG" },
  { key: "timeStart", label: "THỜI GIAN BẮT ĐẦU" },
  { key: "timeEnd", label: "THỜI GIAN KẾT THÚC" },
  { key: "timePay", label: "THỜI HẠN THANH TOÁN" },
  { key: "yesOrNo", label: "CÓ BÁO GIÁ" },
  { key: "dayRequest", label: "NGÀY YÊU CẦU" },
  { key: "dayUse", label: "NGÀY ÁP DỤNG" },
  { key: "price", label: "GIÁ DẦU" },
  { key: "numberPrice", label: "SỐ BÁO GIÁ" },
  { key: "daDuyet", label: "ĐÃ DUYỆT" },
  { key: "ghiChu", label: "GHI CHÚ" },
];

const prefKey = (userId) => `contracts_table_prefs_${userId || "guest"}`;

export default function ManageContract() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [contracts, setContracts] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditContract = permissions.includes("edit_contract");

  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key)
  );
  const [columnWidths, setColumnWidths] = useState({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(120);
  const isActive = (path) => location.pathname === path;
  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", { state: { user } });
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", { state: { user } });
  };

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", { state: { user } });
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", { state: { user } });
  };

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", { state: { user } });
  };

  const handleGoToSumAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToSumKH26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () => {
    navigate("/voucher-list", { state: { user } });
  };

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, contracts]);

  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    const fetchCustomers = async () => {
      const res = await axios.get(`${API}/customers`);
      setCustomers(res.data);
    };
    fetchCustomers();
  }, []);

  // -------- fetch contracts
  const fetch = async (search = "") => {
    try {
      const url = search
        ? `${apiContracts}?khachHangArr=${encodeURIComponent(
            JSON.stringify([search])
          )}`
        : apiContracts;
      const res = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setContracts(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy contracts:", err.response?.data || err.message);
      setContracts([]);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  // ------------------ LOAD prefs
  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.order)) {
        const valid = parsed.order.filter((k) =>
          allColumns.some((ac) => ac.key === k)
        );
        const missing = allColumns
          .map((c) => c.key)
          .filter((k) => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }
      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [userId]);

  // ------------------ SAVE prefs
  useEffect(() => {
    if (!prefsLoaded || !userId) return;
    const payload = { order: visibleColumns, widths: columnWidths || {} };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save prefs:", e);
    }
  }, [visibleColumns, columnWidths, userId, prefsLoaded]);

  // ---------- Drag & drop ----------
  const onDragStart = (e, colKey) => {
    dragColRef.current = colKey;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    const src = dragColRef.current;
    if (!src || src === targetKey) return;
    const idxSrc = visibleColumns.indexOf(src);
    const idxTarget = visibleColumns.indexOf(targetKey);
    if (idxSrc === -1 || idxTarget === -1) return;

    const locked = allColumns
      .filter((c) => c.stickyIndex === 0 || c.stickyIndex === 1)
      .map((c) => c.key);
    if (locked.includes(src) || locked.includes(targetKey)) return;

    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
  };

  // ---------- Resizable columns ----------
  const onMouseDownResize = (e, colKey) => {
    e.preventDefault();
    const th = e.target.closest("th");
    const startWidth = th ? th.offsetWidth : 120;
    resizingRef.current = { columnKey: colKey, startX: e.clientX, startWidth };
    window.addEventListener("mousemove", onMouseMoveResize);
    window.addEventListener("mouseup", onMouseUpResize);
  };
  const onMouseMoveResize = (e) => {
    const r = resizingRef.current;
    if (!r.columnKey) return;
    const delta = e.clientX - r.startX;
    let newWidth = r.startWidth + delta;
    if (newWidth < 60) newWidth = 60;
    setColumnWidths((prev) => ({ ...prev, [r.columnKey]: `${newWidth}px` }));
  };
  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) return;
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
  };

  const handleAdd = () => {
    if (!canEditContract) return alert("Bạn chưa có quyền!");
    setEditContract(null);
    setShowModal(true);
  };

  const handleEdit = (v) => {
    if (!canEditContract) return alert("Bạn chưa có quyền!");
    setEditContract(v);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditContract) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiContracts}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setContracts((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAll = async () => {
    if (!canEditContract) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa tất cả hợp đồng?")) return;
    try {
      await axios.delete(`${apiContracts}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      alert("Đã xóa tất cả!");
      setContracts([]);
    } catch (err) {
      console.error("Xóa tất cả thất bại:", err);
      alert(
        "Không thể xóa tất cả: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const handleToggleLock = async (contract) => {
    if (!canEditContract) {
      alert("Bạn chưa có quyền!");
      return;
    }

    const confirmMsg = contract.isLocked
      ? "Mở khoá hợp đồng này?"
      : "Khoá hợp đồng này?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.patch(
        `${apiContracts}/${contract._id}/toggle-lock`,
        {},
        {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        }
      );

      // cập nhật lại row trong bảng
      setContracts((prev) =>
        prev.map((c) =>
          c._id === contract._id ? { ...c, isLocked: res.data.isLocked } : c
        )
      );

      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Không đổi được trạng thái");
    }
  };

  const handleSave = (saved) => {
    setContracts((prev) => {
      const found = prev.find((p) => p._id === saved._id);
      if (found) return prev.map((p) => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  const handleImportConfirm = async () => {
    if (!file) return alert("Vui lòng chọn file Excel!");
    setImporting(true);

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${apiContracts}/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      alert(`Import xong — Thêm: ${res.data.inserted}`);
      setFile(null);
      fetch();
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
    }
  };

  const exportExcel = () => {
    if (!contracts.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns
      .filter((c) => visibleColumns.includes(c.key))
      .map((c) => c.label);
    const data = contracts.map((d) => {
      const row = {};
      allColumns.forEach((c) => {
        if (!visibleColumns.includes(c.key)) return;
        row[c.label] = d[c.key] || "";
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contracts");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `contracts_${formatDateFns(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    );
  };

  const isResizingRef = useRef(false);

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
      <div className="flex gap-2 items-center mb-4">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white bg-blue-500"
        >
          Trang chính
        </button>

        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách lái xe
        </button>

        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách khách hàng
        </button>

        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách xe
        </button>

        <button
          onClick={handleGoToTrips}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách chuyến phụ trách
        </button>

        <button
          onClick={() => {
            if (!user?.permissions?.includes("edit_trip")) {
              alert("Bạn không có quyền truy cập!");
              return;
            }
            handleGoToAllTrips();
          }}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Tất cả các chuyến
        </button>

        <button
          onClick={handleGoToSumAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToSumKH26}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt-26") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ khách lẻ
        </button>
        <button
          onClick={handleGoToVouchers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/voucher-list") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Sổ phiếu chi
        </button>
        <button
          onClick={handleGoToContract}
          className={`px-3 py-1 rounded text-white ${
            isActive("/contract") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className={`px-3 py-1 rounded text-white ${
            isActive("/tcb-person") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          TCB cá nhân
        </button>
      </div>
      <h1 className="text-xl font-bold">HỢP ĐỒNG VẬN CHUYỂN</h1>
      <div className="flex justify-end items-center mb-4 mt-2">
        <div className="flex gap-2 items-center flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên khách hàng..."
            className="border p-2 rounded"
          />
          <button
            onClick={() => fetch(q)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Tìm
          </button>
          <button
            onClick={() => {
              setQ("");
              fetch();
            }}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            Reset
          </button>
          <button
            onClick={handleAdd}
            className="bg-green-500 px-3 py-1 text-white rounded"
          >
            + Thêm
          </button>
          <button
            onClick={exportExcel}
            className="bg-blue-600 px-3 py-1 text-white rounded"
          >
            Xuất Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-1 rounded"
          />
          <button
            onClick={handleImportConfirm}
            className="bg-purple-600 text-white px-3 py-1 rounded"
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-auto border"
        style={{ maxHeight: "80vh", position: "relative" }}
      >
        <table
          style={{
            tableLayout: "fixed",
            width: "max-content",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-200">
            <tr>
              {/* Warning column */}
              <th
                className="border p-1 sticky top-0 text-center"
                style={{
                  width: 30,
                  minWidth: 30,
                  left: 0,
                  zIndex: 50,
                  background: "#f3f4f6",
                  boxSizing: "border-box",
                }}
              >
                STT
              </th>

              {visibleColumns.map((cKey, index) => {
                const colMeta = allColumns.find((c) => c.key === cKey) || {
                  key: cKey,
                  label: cKey,
                };
                const widthStyle = columnWidths[cKey]
                  ? {
                      width: columnWidths[cKey],
                      minWidth: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                    }
                  : {};
                const isFirst = index === 0;
                const isSecond = index === 1;
                const leftOffset = isSecond
                  ? 30 + firstColWidth
                  : isFirst
                  ? 30
                  : undefined;

                return (
                  <th
                    key={cKey}
                    data-col={cKey}
                    ref={isFirst ? firstColRef : null}
                    draggable={!isResizingRef.current}
                    onDragStart={(e) => {
                      if (!isResizingRef.current) onDragStart(e, cKey);
                      else e.preventDefault();
                    }}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, cKey)}
                    className="border p-0 text-center bg-gray-200 relative select-none"
                    style={{
                      position: "sticky",
                      top: 0,
                      left: leftOffset,
                      zIndex: leftOffset !== undefined ? 40 : 20,
                      background: "#f3f4f6",
                      overflow: "visible",
                      boxSizing: "border-box",
                      ...widthStyle,
                    }}
                  >
                    <div className="p-2 text-xs truncate">{colMeta.label}</div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => {
                        isResizingRef.current = true;
                        e.preventDefault();
                        e.stopPropagation();
                        onMouseDownResize(e, cKey);
                      }}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        cursor: "col-resize",
                        zIndex: 200,
                        userSelect: "none",
                      }}
                    />
                  </th>
                );
              })}

              <th
                className="border p-1 sticky top-0 text-center bg-gray-200"
                style={{ width: 120, minWidth: 120, zIndex: 40 }}
              >
                Hành động
              </th>
            </tr>
          </thead>

          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}

            {contracts.map((v, idx) => (
              <tr
                key={v._id}
                onClick={() => toggleRowHighlight(v._id)}
                className={`cursor-pointer ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                } ${selectedRows.includes(v._id) ? "bg-yellow-200" : ""}`}
              >
                {/* Warning cell */}
                <td
                  className="border p-1 text-center"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 20,
                    width: 30,
                    background: "#fff",
                  }}
                >
                  {idx + 1}
                </td>

                {visibleColumns.map((cKey, colIndex) => {
                  const isFirst = colIndex === 0;
                  const isSecond = colIndex === 1;
                  const stickyLeft = isFirst
                    ? 30
                    : isSecond
                    ? 30 + firstColWidth
                    : undefined;
                  const cellWidthStyle = columnWidths[cKey]
                    ? {
                        width: columnWidths[cKey],
                        minWidth: columnWidths[cKey],
                        maxWidth: columnWidths[cKey],
                        boxSizing: "border-box",
                      }
                    : {};

                  return (
                    <td
                      key={cKey}
                      className="border p-1 align-top"
                      style={{
                        position: isFirst || isSecond ? "sticky" : "relative",
                        left: stickyLeft,
                        height: 20,
                        lineHeight: "20px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        zIndex: isFirst || isSecond ? 20 : 1,
                        background: selectedRows.includes(v._id)
                          ? "#fde68a"
                          : idx % 2 === 0
                          ? "#fff"
                          : "#f9fafb",
                        ...cellWidthStyle,
                      }}
                    >
                      {cKey === "price"
                        ? formatPrice(v[cKey])
                        : [
                            "timeStart",
                            "timeEnd",
                            "dayRequest",
                            "dayUse",
                          ].includes(cKey)
                        ? formatDate(v[cKey])
                        : v[cKey]}
                    </td>
                  );
                })}

                <td
                  className="border p-1 h-[30px] flex gap-2 justify-center"
                  style={{ minWidth: 120, background: "#fff" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleToggleLock(v)}
                    className={`${
                      v.isLocked
                        ? "text-red-600 font-semibold"
                        : "text-green-600 font-semibold"
                    }`}
                  >
                    {v.isLocked ? "Mở khoá hợp đồng" : "Khoá HĐ"}
                  </button>
                  {/* Chỉ hiện SỬA + XOÁ khi CHƯA khoá */}
                  {!v.isLocked && (
                    <>
                      <button
                        onClick={() => handleEdit(v)}
                        className="text-blue-600"
                      >
                        Sửa
                      </button>

                      <button
                        onClick={() => handleDelete(v._id)}
                        className="text-red-600"
                      >
                        Xóa
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteAll}
          className={`px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 
      ${!canEditContract ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Xóa tất cả
        </button>
      </div>

      {showModal && (
        <ContractModal
          initialData={editContract}
          customers={customers}
          onClose={() => {
            setShowModal(false);
            setEditContract(null);
          }}
          onSave={handleSave}
          apiBase={apiContracts}
        />
      )}
    </div>
  );
}
