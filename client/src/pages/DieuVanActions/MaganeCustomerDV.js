import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import CustomerModal from "../../components/CustomerModal";
import { format as formatDateFns } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const apiCustomers = `${API}/customers`;

// columns for customers
export const allColumns = [
  { key: "code", label: "Mã KH" },
  { key: "name", label: "Tên khách hàng" },
  { key: "nameHoaDon", label: "Tên trên hóa đơn" },
  { key: "mstCCCD", label: "MST / CCCD chủ hộ" },
  { key: "address", label: "Địa chỉ" },
  { key: "accountant", label: "Kế toán phụ trách" },
  { key: "accUsername", label: "Tên đăng nhập" },
];

// helper để dựng key trong localStorage
const prefKey = (userId) => `customers_table_prefs_${userId || "guest"}`;

export default function ManageCustomerDV() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditCustomer = permissions.includes("edit_customer");

  const isActive = (path) => location.pathname === path;

  // navigation helpers (kept from original)
  const handleGoToDrivers = () => navigate("/manage-driver-dv", { state: { user } });
  const handleGoToCustomers = () => navigate("/manage-customer-dv", { state: { user } });
  const handleGoToVehicles = () => navigate("/manage-vehicle-dv", { state: { user } });

  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(allColumns.map((c) => c.key));
  const [columnWidths, setColumnWidths] = useState({});

  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // drag/resize refs
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col refs
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(60);

  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, customers]);

  // warnings state (keep same behaviour as drivers)
  const [warnings, setWarnings] = useState({});

  // selected rows highlight
  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // -------- fetch customers
const fetch = async (search = "") => {
  try {
    const url = search
      ? `${apiCustomers}?q=${encodeURIComponent(search)}`
      : apiCustomers;

    const res = await axios.get(url, {
      headers: { Authorization: token ? `Bearer ${token}` : undefined },
    });

    const data = res.data || [];

    // Sắp xếp theo mã code (string chứa số)
    const sorted = [...data].sort((a, b) => {
      const numA = Number(a.code || 0);
      const numB = Number(b.code || 0);
      return numA - numB; // tăng dần
    });

    setCustomers(sorted);

    // Cảnh báo
    const w = {};
    sorted.forEach((d) => {
      if (d.warning === true) w[d._id] = true;
    });
    setWarnings(w);

  } catch (err) {
    console.error("Lỗi lấy danh sách KH:", err.response?.data || err.message);
    setCustomers([]);
  }
};


  useEffect(() => {
    fetch();
  }, []);

  // ------------------ LOAD prefs (1 lần when userId changes) ------------------
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
        const valid = parsed.order.filter((k) => allColumns.some((ac) => ac.key === k));
        const missing = allColumns.map((c) => c.key).filter((k) => !valid.includes(k));
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

  // ------------------ SAVE prefs (only after prefsLoaded) ------------------
  useEffect(() => {
    if (!prefsLoaded) return;
    if (!userId) return;
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
    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
    dragColRef.current = null;
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
    if (!colKey) {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      return;
    }
    const th = document.querySelector(`th[data-col="${colKey}"]`);
    const finalWidth = th ? th.offsetWidth + "px" : `${60}px`;
    setColumnWidths((prev) => {
      const updated = { ...prev, [colKey]: finalWidth };
      try {
        const prefs = JSON.parse(localStorage.getItem(prefKey(userId))) || {};
        prefs.widths = updated;
        prefs.order = prefs.order || visibleColumns;
        localStorage.setItem(prefKey(userId), JSON.stringify(prefs));
      } catch (e) {
        console.warn("Failed to persist width:", e);
      }
      return updated;
    });
    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
  };

  // ---------- helpers ----------
  const formatCellValue = (cKey, value, idx) => {
    if (cKey === "name" || cKey === "nameHoaDon" || cKey === "accountant" || cKey === "code" || cKey === "accUsername" || cKey === "mstCCCD" || cKey === "address") return value;
    return value;
  };

  // ---------- action handlers (add/edit/delete/import/export) ----------
  const handleAdd = () => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền thêm khách hàng!");
    setEditCustomer(null);
    setShowModal(true);
  };

  const handleEdit = (c) => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền sửa khách hàng!");
    setEditCustomer(c);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền xóa khách hàng!");
    if (!window.confirm("Xác nhận xóa khách hàng này?")) return;
    try {
      await axios.delete(`${apiCustomers}/${id}`, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      setCustomers((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert("Không thể xoá: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = (saved) => {
    setCustomers((prev) => {
      const found = prev.find((p) => p._id === saved._id);
      if (found) return prev.map((p) => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  // import modal logic
  const [showImportMode, setShowImportMode] = useState(false);
  const [importMode, setImportMode] = useState("append");
  const importFileRef = fileInputRef;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImportConfirm = async () => {
    if (!file) return alert("Vui lòng chọn file Excel!");
    setImporting(true);
    if (isSubmitting) return;  // tránh double click ngay tức thì
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${apiCustomers}/import?mode=${importMode}`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: token ? `Bearer ${token}` : undefined },
      });
      const added = res.data.imported || 0;
      const updated = res.data.updated || 0;
      alert(`Import xong — Thêm: ${added}, Cập nhật: ${updated}`);
      if (importFileRef.current) importFileRef.current.value = "";
      setFile(null);
      fetch();
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
      setShowImportMode(false);
      setIsSubmitting(false);
      fetch()
    }
  };

  const exportExcel = () => {
    if (!customers.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label);
    const data = customers.map((d, idx) => {
      const row = {};
      allColumns.forEach((c) => {
        if (!visibleColumns.includes(c.key)) return;
        else row[c.label] = d[c.key] || "";
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `customers_${formatDateFns(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  // toggle warning per customer
  const toggleWarning = async (customerId) => {
    try {
      const res = await axios.put(`${apiCustomers}/warning/${customerId}`, {}, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      const newWarningState = res.data.warning;
      setWarnings((prev) => ({ ...prev, [customerId]: newWarningState }));
    } catch (err) {
      console.error("Toggle warning failed", err);
      alert("Không cập nhật được cảnh báo!");
    }
  };

  //In bảng kê
  const handlePrintBangKe = async (customer) => {
  const month = new Date().getMonth() + 1; // tháng hiện tại
  console.log("KH id:", customer.code, month)

  try {
    const response = await axios.get(
      `${apiCustomers}/export-trips-customer/${customer.code}/${month}`,
      {
        responseType: "blob", 
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const blob = new Blob(
      [response.data],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BANG_KE_${customer.code}_T${month}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("Không xuất được bảng kê!");
  }
};


  return (
    <div className="p-4 bg-gray-50 min-h-screen text-sm">
      <div className="flex gap-2 items-center mb-4">
        <button onClick={() => navigate("/tonghop")} className="px-3 py-1 rounded text-white bg-blue-500">Tổng hợp chuyến</button>

        <button onClick={handleGoToDrivers} className={`px-3 py-1 rounded text-white ${isActive("/manage-driver-dv") ? "bg-green-600" : "bg-blue-500"}`}>Danh sách lái xe</button>
        <button onClick={handleGoToCustomers} className={`px-3 py-1 rounded text-white ${isActive("/manage-customer-dv") ? "bg-green-600" : "bg-blue-500"}`}>Danh sách khách hàng</button>
        <button onClick={handleGoToVehicles} className={`px-3 py-1 rounded text-white ${isActive("/manage-vehicle-dv") ? "bg-green-600" : "bg-blue-500"}`}>Danh sách xe</button>
      </div>

      <div className="flex justify-between items-center mb-4 mt-2">
        <h1 className="text-xl font-bold">Quản lý Khách hàng</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên, mã KH, kế toán..." className="border p-2 rounded" />
          <button onClick={() => fetch(q)} className="bg-blue-500 text-white px-3 py-1 rounded">Tìm</button>
          <button onClick={() => { setQ(""); fetch(); }} className="bg-gray-200 px-3 py-1 rounded">Reset</button>
          <button onClick={handleAdd} className={`bg-green-500 px-3 py-1 text-white rounded ${!canEditCustomer ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!canEditCustomer}>+ Thêm KH</button>
          <button onClick={exportExcel} className="bg-blue-600 px-3 py-1 text-white rounded">Xuất Excel</button>

          <input ref={fileInputRef} id="fileExcelInput" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} className="border p-1 rounded" />

          <button onClick={() => { if (!file) return alert("Vui lòng chọn file Excel!"); setShowImportMode(true); }} className={`bg-purple-600 text-white px-3 py-1 rounded ${!canEditCustomer || importing ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!canEditCustomer || importing}>
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* Choose visible columns UI */}
      <div className="mb-3 flex flex-wrap gap-2">
        {allColumns.map((c) => (
          <label key={c.key} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={visibleColumns.includes(c.key)} onChange={() => setVisibleColumns((prev) => (prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key]))} />
            {c.label}
          </label>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-auto border" style={{ maxHeight: "80vh" }}>
        <table style={{ tableLayout: "fixet", width: "max-content", maxWidth: "max-content", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead className="bg-gray-200">
            <tr>
              {/* Cột cảnh báo */}
              <th className="border p-1 sticky top-0 bg-gray-200 text-center" style={{ width: 30, zIndex: 50, left: 0 }}></th>
              {visibleColumns.map((cKey, index) => {
                const colMeta = allColumns.find((ac) => ac.key === cKey) || { key: cKey, label: cKey };
                const widthStyle = columnWidths[cKey] ? { width: columnWidths[cKey], minWidth: columnWidths[cKey], maxWidth: columnWidths[cKey] } : {};
                const isFirst = index === 0;
                const isSecond = index === 1;
                return (
                  <th
                    key={cKey}
                    data-col={cKey}
                    ref={index === 0 ? firstColRef : null}
                    draggable
                    onDragStart={(e) => onDragStart(e, cKey)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, cKey)}
                    className="border p-1 text-left align-top bg-gray-200"
                    style={{
                      top: 0,
                      position: "sticky",
                      zIndex: isFirst || isSecond ? 40 : 20,
                      left: isFirst ? 35 : isSecond ? 35 + firstColWidth : undefined,
                      background: "#f3f4f6",
                      ...widthStyle,
                      boxSizing: "border-box",
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="truncate">{colMeta.label}</span>
                      <div
                        onMouseDown={(e) => onMouseDownResize(e, cKey)}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 10, cursor: "col-resize", zIndex: 50 }}
                        onDragStart={(ev) => ev.preventDefault()}
                      />
                    </div>
                  </th>
                );
              })}

              <th className="border p-1 sticky top-0 bg-gray-200" style={{ zIndex: 20, width: 120, boxSizing: "border-box" }}>Hành động</th>
              <th className="border p-1 sticky top-0 bg-gray-200" style={{ zIndex: 20, width: 120 }}>In bảng kê</th>

            </tr>
          </thead>

          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="p-4 text-center text-gray-500">Không có dữ liệu</td>
              </tr>
            )}

            {customers.map((c, idx) => {
              const isWarning = warnings[c._id];
              return (
                <tr key={c._id} onClick={() => toggleRowHighlight(c._id)} className={`cursor-pointer ${isWarning ? "bg-red-300" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${selectedRows.includes(c._id) ? "bg-yellow-200" : ""}`}>
                  {/* Cột cảnh báo */}
                  <td className="border p-1 text-center" style={{ position: "sticky", left: 0, zIndex: 40, height: 80, width: 30, background: isWarning ? "#fca5a5" : "#fff" }}>
                    <button onClick={() => toggleWarning(c._id)} className={`px-1 py-1 rounded text-white ${isWarning ? "bg-red-600" : "bg-gray-400"}`}>⚠</button>
                  </td>

                  {visibleColumns.map((cKey, colIndex) => {
                    const isFirst = colIndex === 0;
                    const isSecond = colIndex === 1;
                    const stickyLeft = isFirst ? 35 : isSecond ? 35 + firstColWidth : undefined;
                    const cellWidthStyle = columnWidths[cKey] ? { width: columnWidths[cKey], minWidth: columnWidths[cKey], maxWidth: columnWidths[cKey], boxSizing: "border-box" } : {};

                    return (
                      <td key={cKey} className="border p-1 align-top" style={{ position: isFirst || isSecond ? "sticky" : "relative", left: stickyLeft, zIndex: isFirst || isSecond ? 30 : 1, background: warnings[c._id] ? "#fca5a5" : selectedRows.includes(c._id) ? "#fde68a" : (idx % 2 === 0 ? "#fff" : "#f9fafb"), ...cellWidthStyle }}>
                        {formatCellValue(cKey, c[cKey], idx)}
                      </td>
                    );
                  })}

                  <td className="border p-1 flex gap-2 justify-center" style={{ minWidth: 120, background: "#fff" }}>
                    {canEditCustomer ? (
                      <>
                        <button onClick={() => handleEdit(c)} className="text-blue-600">Sửa</button>
                        <button onClick={() => handleDelete(c._id)} className="text-red-600">Xóa</button>
                      </>
                    ) : (
                      <span className="text-gray-400">Không có quyền</span>
                    )}
                  </td>
                  <td
  className="border p-1 text-center"
  style={{ minWidth: 120, background: "#fff" }}
  onClick={(e) => e.stopPropagation()}
>
<button
  onClick={() => {
    // Nếu KH không thuộc về user và không có quyền full
    if (c.accUsername !== user?.username) {
      alert("Bạn không có quyền in bảng kê của khách hàng này!");
      return;
    }

    handlePrintBangKe(c);
  }}
  className="text-green-600 underline"
>
  Tải xuống
</button>

</td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <CustomerModal initialData={editCustomer} onClose={() => { setShowModal(false); setEditCustomer(null); }} onSave={handleSave} apiBase={apiCustomers} />}

      {showImportMode && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-5 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">Chọn chế độ Import</h2>

            <label className="flex items-center gap-2 mb-2">
              <input type="radio" name="importMode" checked={importMode === "append"} onChange={() => setImportMode("append")} />
              Thêm mới (thêm, trùng mã thì không lấy)
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input type="radio" name="importMode" checked={importMode === "overwrite"} onChange={() => setImportMode("overwrite")} />
              Ghi đè (cập nhật nếu trùng mã)
            </label>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImportMode(false)} className="px-4 py-1 bg-gray-300 rounded">Hủy</button>
              <button onClick={handleImportConfirm} className="px-4 py-1 bg-purple-600 text-white rounded" disabled={isSubmitting}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
