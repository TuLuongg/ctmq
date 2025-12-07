// src/pages/ManageDriver.js
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import DriverModal from "../../components/DriverModal";
import { format as formatDateFns } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const apiDrivers = `${API}/drivers`;

// ---- allColumns ở ngoài component (bạn đã làm rồi) ----
export const allColumns = [
  { key: "stt", label: "STT" },
  { key: "name", label: "Họ tên lái xe" },
  { key: "nameZalo", label: "Tên Zalo" },
  { key: "birthYear", label: "Ngày sinh" },
  { key: "company", label: "Đơn vị" },
  { key: "bsx", label: "Biển số xe" },
  { key: "phone", label: "SĐT" },
  { key: "hometown", label: "Quê quán" },
  { key: "resHometown", label: "HKTT" },
  { key: "address", label: "Nơi ở hiện tại" },
  { key: "cccd", label: "CCCD" },
  { key: "cccdIssuedAt", label: "Ngày cấp CCCD" },
  { key: "cccdExpiryAt", label: "Ngày hết hạn CCCD" },
  { key: "licenseImageCCCD", label: "Ảnh CCCD" },
  { key: "licenseClass", label: "Hạng BL" },
  { key: "licenseIssuedAt", label: "Ngày cấp BL" },
  { key: "licenseExpiryAt", label: "Ngày hết hạn BL" },
  { key: "licenseImage", label: "Ảnh BL" },
  { key: "numberHDLD", label: "Số HĐLĐ" },
  { key: "dayStartWork", label: "Ngày vào làm" },
  { key: "dayEndWork", label: "Ngày nghỉ" },
];

// helper để dựng key trong localStorage
const prefKey = (userId) => `drivers_table_prefs_${userId || "guest"}`;

// ---------- Date formatting helper ----------
function formatDateSafe(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    const datePart = value.split("T")[0];
    const [y, m, d] = datePart.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const dObj = new Date(value);
  if (!isNaN(dObj.getTime())) {
    return formatDateFns(dObj, "dd/MM/yyyy");
  }
  return "";
}

export default function ManageDriverDV() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditDriver = permissions.includes("edit_driver");

  const isActive = (path) => location.pathname === path;
  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver-dv", {state: {user}});
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer-dv", {state: {user}});
  }

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle-dv", {state: {user}});
  };


  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(allColumns.map(c => c.key));
  const [columnWidths, setColumnWidths] = useState({});

  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // drag/resize refs
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(60);
  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, drivers]);

  // fetch drivers
  const fetch = async (search = "") => {
    try {
      const url = search ? `${apiDrivers}?q=${encodeURIComponent(search)}` : apiDrivers;
      const res = await axios.get(url, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      let data = res.data || [];
      data = data.sort((a, b) => {
        const isA = a.company?.trim().toLowerCase() === "ct minh quân";
        const isB = b.company?.trim().toLowerCase() === "ct minh quân";
        return isA === isB ? 0 : isA ? -1 : 1;
      });
      setDrivers(data);
          const w = {};
    data.forEach(d => {
      if (d.warning === true) w[d._id] = true;
    });
    setWarnings(w)
    } catch (err) {
      console.error("Lỗi lấy drivers:", err.response?.data || err.message);
      setDrivers([]);
    }
  };

  // ------------------ LOAD prefs (1 lần when userId changes) ------------------
  useEffect(() => {
    // don't attempt load if no userId yet
    if (!userId) return;

    console.log("LOAD PREFS KEY:", prefKey(userId));
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      // nothing saved — mark loaded so we can start saving later
      setPrefsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.order)) {
        // keep only valid keys and append missing columns (preserve defaults for new columns)
        const valid = parsed.order.filter(k => allColumns.some(ac => ac.key === k));
        const missing = allColumns.map(c => c.key).filter(k => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }

      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      // important: mark loaded so save-effect won't overwrite on first mount
      setPrefsLoaded(true);
    }
  }, [userId]);

  // fetch drivers once on mount
  useEffect(() => {
    fetch();
  }, []);

  // ------------------ SAVE prefs (only after prefsLoaded) ------------------
  useEffect(() => {
    if (!prefsLoaded) return; // <-- KEY: don't save until we've loaded prefs from storage
    if (!userId) return;

    const payload = { order: visibleColumns, widths: columnWidths || {} };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
      console.log("SAVE PREFS KEY:", prefKey(userId), payload);
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
    setColumnWidths(prev => ({ ...prev, [r.columnKey]: `${newWidth}px` }));
  };

  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      return;
    }

    const th = document.querySelector(`th[data-col="${colKey}"]`);
    if (!th) {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
      return;
    }

    const finalWidth = th.offsetWidth + "px";

    // update state AND persist widths immediately into localStorage (merge)
    setColumnWidths(prev => {
      const updated = { ...prev, [colKey]: finalWidth };
      try {
        const prefs = JSON.parse(localStorage.getItem(prefKey(userId))) || {};
        prefs.widths = updated;
        // keep order if exists, otherwise write current visibleColumns
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
  const formatCellValue = (cKey, value) => {
    if (!value && value !== 0) return "";
    if (cKey === "birthYear" || cKey.endsWith("At") || cKey === "dayStartWork" || cKey === "dayEndWork") {
      return formatDateSafe(value);
    }
    if (cKey === "licenseImage" || cKey === "licenseImageCCCD") {
      return value;
    }
    return value;
  };

  // ---------- action handlers (add/edit/delete/import/export) ----------
  const handleAdd = () => {
    if (!canEditDriver) return alert("Bạn chưa có quyền thêm lái xe!");
    setEditDriver(null);
    setShowModal(true);
  };

  const handleEdit = (d) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền sửa lái xe!");
    setEditDriver(d);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền xóa lái xe!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiDrivers}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setDrivers(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = (saved) => {
    setDrivers(prev => {
      const found = prev.find(p => p._id === saved._id);
      if (found) return prev.map(p => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  // import modal logic omitted here for brevity — keep your existing handlers
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
      const res = await axios.post(`${apiDrivers}/import?mode=${importMode}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
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
      setIsSubmitting(false)
      fetch()
    }
  };

  const exportExcel = () => {
    if (!drivers.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label);
    const data = drivers.map(d => {
      const row = {};
      allColumns.forEach(c => {
        if (!visibleColumns.includes(c.key)) return;
        if (c.key.endsWith("At") || c.key === "dayStartWork" || c.key === "dayEndWork" || c.key === "birthYear") {
          row[c.label] = formatDateSafe(d[c.key]) || "";
        } else if (c.key === "licenseImage" || c.key === "licenseImageCCCD") {
          row[c.label] = d[c.key] || "";
        } else if (c.key === "stt") {
          // ignore stt for export
        } else {
          row[c.label] = d[c.key] || "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `drivers_${formatDateFns(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  const [warnings, setWarnings] = useState({});
  const toggleWarning = async (driverId) => {
  try {
    const res = await axios.put(
      `${apiDrivers}/warning/${driverId}`,
      {}, // body rỗng
      {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      }
    );

    const newWarningState = res.data.warning;

    setWarnings((prev) => ({
      ...prev,
      [driverId]: newWarningState,
    }));
  } catch (err) {
    console.error("Toggle warning failed", err);
    alert("Không cập nhật được cảnh báo!");
  }
};

const [selectedRows, setSelectedRows] = useState([]);
const toggleRowHighlight = (id) => {
  setSelectedRows(prev =>
    prev.includes(id)
      ? prev.filter(x => x !== id) // bỏ ra
      : [...prev, id]               // thêm vào
  );
};

  // ---------- UI render (giữ nguyên layout của bạn) ----------
  return (
    <div className="p-4 bg-gray-50 min-h-screen text-sm">
<div className="flex gap-2 items-center mb-4">
          <button
    onClick={() => navigate("/tonghop")}
    className="px-3 py-1 rounded text-white bg-blue-500"
  >
    Tổng hợp chuyến
  </button>

  <button
    onClick={handleGoToDrivers}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver-dv") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách lái xe
  </button>

  <button
    onClick={handleGoToCustomers}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer-dv") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách khách hàng
  </button>

  <button
    onClick={handleGoToVehicles}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-vehicle-dv") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách xe
  </button>
</div>

      <div className="flex justify-between items-center mb-4 mt-2">
        <h1 className="text-xl font-bold">Quản lý Lái xe</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên, sđt, cccd..." className="border p-2 rounded" />
          <button onClick={() => fetch(q)} className="bg-blue-500 text-white px-3 py-1 rounded">Tìm</button>
          <button onClick={() => { setQ(""); fetch(); }} className="bg-gray-200 px-3 py-1 rounded">Reset</button>
          <button onClick={handleAdd} className={`bg-green-500 px-3 py-1 text-white rounded ${!canEditDriver ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!canEditDriver}>+ Thêm</button>
          <button onClick={exportExcel} className="bg-blue-600 px-3 py-1 text-white rounded">Xuất Excel</button>

          <input ref={fileInputRef} id="fileExcelInput" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} className="border p-1 rounded" />

          <button onClick={() => { if (!file) return alert("Vui lòng chọn file Excel!"); setShowImportMode(true); }} className={`bg-purple-600 text-white px-3 py-1 rounded ${!canEditDriver || importing ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!canEditDriver || importing}>
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* Choose visible columns UI */}
      <div className="mb-3 flex flex-wrap gap-2">
        {allColumns.map(c => (
          <label key={c.key} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={visibleColumns.includes(c.key)} onChange={() => setVisibleColumns(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])} />
            {c.label}
          </label>
        ))}
      </div>

{/* Table */}
{/* Table (REPLACEMENT) */}
<div
  className="overflow-auto border"
  style={{ maxHeight: "80vh", position: "relative" }} // ensure relative container
>
  <table
    // removed tailwind border-collapse to avoid collapse seams
    style={{
      tableLayout: "fixed",
      width: "max-content",
      maxWidth: "max-content",
      borderCollapse: "separate", // important: avoid collapse seams
      borderSpacing: 0,
    }}
  >
    <thead className="bg-gray-200">
      <tr>
        {/* Cột cảnh báo (sticky col 0) */}
        <th
          className="border p-1 sticky top-0 bg-gray-200 text-center"
          style={{
            width: 30,
            zIndex: 40,               // header above everything
            left: 0,
            boxSizing: "border-box",
            background: "#f3f4f6",
            transform: "translateZ(0)", // new stacking context
            WebkitTransform: "translateZ(0)",
            backgroundClip: "padding-box",
            borderRight: "1px solid #e5e7eb", // hide seam
          }}
        />
        {visibleColumns.map((cKey, index) => {
          const colMeta =
            allColumns.find((ac) => ac.key === cKey) || {
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

          // header left offset (sticky)
          const leftOffset = isFirst ? 35 : isSecond ? 35 + firstColWidth : undefined;

          return (
            <th
              key={cKey}
              data-col={cKey}
              ref={index === 0 ? firstColRef : null}
              draggable
              onDragStart={(e) => onDragStart(e, cKey)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, cKey)}
              className="border p-1 text-left align-top"
              style={{
                top: 0,
                position: "sticky",
                zIndex: isFirst || isSecond ? 40 : 20, // header above body sticky
                left: isFirst || isSecond ? leftOffset : undefined,
                background: "#f3f4f6",
                boxSizing: "border-box",
                transform: "translateZ(0)",
                WebkitTransform: "translateZ(0)",
                backgroundClip: "padding-box",
                borderRight: isFirst || isSecond ? "1px solid #e5e7eb" : undefined,
                ...widthStyle,
              }}
            >
              <div className="relative flex items-center justify-center">
                <span className="truncate">{colMeta.label}</span>
                <div
                  onMouseDown={(e) => onMouseDownResize(e, cKey)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 10,
                    cursor: "col-resize",
                    zIndex: 10,
                  }}
                  onDragStart={(ev) => ev.preventDefault()}
                />
              </div>
            </th>
          );
        })}

        <th
          className="border p-1 sticky top-0"
          style={{
            zIndex: 40,
            width: 120,
            boxSizing: "border-box",
            background: "#f3f4f6",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            backgroundClip: "padding-box",
            borderLeft: "1px solid #e5e7eb",
          }}
        >
          Hành động
        </th>
      </tr>
    </thead>

    <tbody>
      {drivers.length === 0 && (
        <tr>
          <td
            colSpan={visibleColumns.length + 2}
            className="p-4 text-center text-gray-500"
          >
            Không có dữ liệu
          </td>
        </tr>
      )}

      {drivers.map((d, idx) => {
        const isWarning = warnings[d._id];

        return (
          <tr
            key={d._id}
            onClick={() => toggleRowHighlight(d._id)}
            className={`cursor-pointer ${isWarning ? "bg-red-300" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${selectedRows.includes(d._id) ? "bg-yellow-200" : ""}`}
            style={{ height: 80 }}
          >
            {/* Cột cảnh báo (sticky left) */}
            <td
              className="border p-1 text-center"
              style={{
                position: "sticky",
                left: 0,
                zIndex: 40, // body sticky under header but above other cells
                width: 30,
                height: 80,
                boxSizing: "border-box",
                background: isWarning ? "#fca5a5" : "#fff",
                transform: "translateZ(0)",
                WebkitTransform: "translateZ(0)",
                backgroundClip: "padding-box",
                borderRight: "1px solid #e5e7eb", // prevents seam
              }}
            >
              <button
                onClick={() => toggleWarning(d._id)}
                className={`px-1 py-1 rounded text-white ${isWarning ? "bg-red-600" : "bg-gray-400"}`}
              >
                ⚠
              </button>
            </td>

            {visibleColumns.map((cKey, colIndex) => {
              const dateColumnsBlue = ["cccdExpiryAt", "licenseExpiryAt", "dayEndWork"];
              const isFirst = colIndex === 0;
              const isSecond = colIndex === 1;

              const stickyLeft = isFirst ? 35 : isSecond ? 35 + firstColWidth : undefined;
                // style text màu xanh cho cột ngày
              const textColorStyle = dateColumnsBlue.includes(cKey) ? { color: "blue", fontWeight: "bold" } : {};

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
                    left: isFirst || isSecond ? stickyLeft : undefined,
                    zIndex: isFirst || isSecond ? 40 : 20,
                    height: 80,
                    background:
                      warnings[d._id]
                        ? "#fca5a5"
                        : selectedRows.includes(d._id)
                        ? "#fde68a"
                        : idx % 2 === 0
                        ? "#ffffff"
                        : "#f9fafb",
                    transform: "translateZ(0)",
                    WebkitTransform: "translateZ(0)",
                    backgroundClip: "padding-box",
                    borderRight: isFirst || isSecond ? "1px solid #e5e7eb" : undefined,
                    ...cellWidthStyle,
                    ...textColorStyle
                  }}
                >
                  {cKey === "stt"
                    ? idx + 1
                    : cKey === "licenseImage" ||
                      cKey === "licenseImageCCCD"
                    ? d[cKey] && (
                        <a href={d[cKey]} target="_blank" rel="noreferrer">
                          <img src={d[cKey]} alt="img" className="w-16 h-16 object-cover rounded border" />
                        </a>
                      )
                    : formatCellValue(cKey, d[cKey])}
                </td>
              );
            })}

            <td
              className="border p-1 flex gap-2 justify-center"
              style={{ minWidth: 120, background: "#fff" }}
              onClick={(e) => e.stopPropagation()}
            >
              {canEditDriver ? (
                <>
                  <button onClick={() => handleEdit(d)} className="text-blue-600">Sửa</button>
                  <button onClick={() => handleDelete(d._id)} className="text-red-600">Xóa</button>
                </>
              ) : (
                <span className="text-gray-400">Không có quyền</span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>



      {showModal && <div className="z-[100]"><DriverModal initialData={editDriver} onClose={() => { setShowModal(false); setEditDriver(null); }} onSave={handleSave} apiBase={apiDrivers} /></div>}

      {showImportMode && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-5 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">Chọn chế độ Import</h2>

            <label className="flex items-center gap-2 mb-2">
              <input type="radio" name="importMode" checked={importMode === "append"} onChange={() => setImportMode("append")} />
              Thêm mới (thêm tất cả, KHÔNG kiểm tra CCCD)
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input type="radio" name="importMode" checked={importMode === "overwrite"} onChange={() => setImportMode("overwrite")} />
              Ghi đè (cập nhật nếu trùng CCCD)
            </label>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImportMode(false)} className="px-4 py-1 bg-gray-300 rounded">Hủy</button>
              <button
  onClick={handleImportConfirm}
  disabled={isSubmitting}
  className={`px-4 py-1 text-white rounded 
    ${isSubmitting ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600"}
  `}
>
  {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
</button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

