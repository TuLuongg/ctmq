import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import VehicleModal from "../../components/VehicleModal";
import { format as formatDateFns } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const apiVehicles = `${API}/vehicles`;

// columns for vehicles (first two columns are locked/sticky)
export const allColumns = [
  { key: "plateNumber", label: "BSX", stickyIndex: 0 },
  { key: "company", label: "Đơn vị vận tải", stickyIndex: 1 },
  { key: "vehicleType", label: "Loại xe" },
  { key: "length", label: "Dài" },
  { key: "width", label: "Rộng" },
  { key: "height", label: "Cao" },
  { key: "norm", label: "Định mức" },
  { key: "registrationImage", label: "Ảnh đăng ký" },
  { key: "resDay", label: "Ngày đăng ký" },
  { key: "resExpDay", label: "Ngày hết hạn đăng ký" },
  { key: "inspectionImage", label: "Ảnh đăng kiểm" },
  { key: "insDay", label: "Ngày đăng kiểm" },
  { key: "insExpDay", label: "Ngày hết hạn đăng kiểm" },
  { key: "dayTravel", label: "Giấy đi đường" },
  { key: "ghiChu", label: "Ghi chú" },
  { key: "bhTNDS", label: "Bảo hiểm TNDS" },
  { key: "bhVC", label: "Bảo hiểm VC" },
];

// helper để dựng key trong localStorage
const prefKey = (userId) => `vehicles_table_prefs_${userId || "guest"}`;

export default function ManageVehicle() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditVehicle = permissions.includes("edit_vehicle");

  const isActive = (path) => location.pathname === path;

  // navigation helpers (mirrors ManageCustomer)
  const handleGoToDrivers = () =>
    navigate("/manage-driver", { state: { user } });
  const handleGoToCustomers = () =>
    navigate("/manage-customer", { state: { user } });
  const handleGoToVehicles = () =>
    navigate("/manage-vehicle", { state: { user } });
  const handleGoToTrips = () => navigate("/manage-trip", { state: { user } });
  const handleGoToAllTrips = () =>
    navigate("/manage-all-trip", { state: { user } });
  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key)
  );
  const [columnWidths, setColumnWidths] = useState({});

  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // drag/resize refs
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col refs (we keep first sticky width measured)
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(120);
  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, vehicles]);

  // warnings state
  const [warnings, setWarnings] = useState({});

  // selected rows highlight
  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // -------- fetch vehicles (with plateNumber numeric sort asc)
  const fetch = async (search = "") => {
    try {
      setLoadingVehicles(true); // 🐱 bắt đầu loading

      const url = search
        ? `${apiVehicles}?q=${encodeURIComponent(search)}`
        : apiVehicles;

      const res = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });

      const data = res.data || [];

      // sort plateNumber as numeric if possible (strings of digits)
      const sorted = [...data].sort((a, b) => {
        const numA = Number((a.plateNumber || "").replace(/\D/g, "") || 0);
        const numB = Number((b.plateNumber || "").replace(/\D/g, "") || 0);

        if (numA !== numB) return numA - numB;

        // tiebreaker: Minh Quân first
        if (
          (a.company || "").trim() === "Minh Quân" &&
          (b.company || "").trim() !== "Minh Quân"
        )
          return -1;

        if (
          (a.company || "").trim() !== "Minh Quân" &&
          (b.company || "").trim() === "Minh Quân"
        )
          return 1;

        return 0;
      });

      setVehicles(sorted);

      // set warnings map
      const w = {};
      sorted.forEach((d) => {
        if (d.warning === true) w[d._id] = true;
      });
      setWarnings(w);
    } catch (err) {
      console.error(
        "Lỗi lấy vehicles:",
        err.response?.data || err.message || err
      );
      setVehicles([]);
      setWarnings({});
    } finally {
      setLoadingVehicles(false); // 🐱 kết thúc loading
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
        // keep only valid keys and append missing columns
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

    // ensure locked/sticky two columns remain at start: if either src/target is locked, do nothing
    const locked = allColumns
      .filter((c) => c.stickyIndex === 0 || c.stickyIndex === 1)
      .map((c) => c.key);
    if (locked.includes(src) || locked.includes(targetKey)) {
      dragColRef.current = null;
      return;
    }

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

  const isResizingRef = useRef(false);

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
    isResizingRef.current = false;
    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
  };

  // ---------- helpers ----------
  const formatCellValue = (cKey, value) => {
    if (!value && value !== 0) return "";

    // giữ nguyên phần hình ảnh
    if (cKey === "registrationImage" || cKey === "inspectionImage") {
      return value;
    }

    // các cột liên quan tới ngày
    const dateFields = [
      "resDay",
      "resExpDay",
      "insDay",
      "insExpDay",
      "dayTravel",
      "bhTNDS",
      "bhVC"
    ];

    if (dateFields.includes(cKey)) {
      const d = new Date(value);
      if (isNaN(d)) return value;

      const formatted = d.toLocaleDateString("vi-VN");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // kiểm tra hết hạn
      if (cKey === "resExpDay" || cKey === "insExpDay") {
        const isExpired = d < today;
        return (
          <span
            className={
              isExpired ? "text-red-600 font-bold" : "text-blue-600 font-bold"
            }
          >
            {formatted}
          </span>
        );
      }

      // dayTravel: báo đỏ nếu sắp hết hạn 5 ngày
      if (cKey === "dayTravel") {
        const fiveDaysLater = new Date(today);
        fiveDaysLater.setDate(today.getDate() + 5);
        const isNearExpire = d < fiveDaysLater;
        return (
          <span
            className={
              isNearExpire
                ? "text-red-600 font-bold"
                : "text-blue-600 font-bold"
            }
          >
            {formatted}
          </span>
        );
      }

      // các ngày khác để nguyên
      return formatted;
    }

    return value;
  };

  // ---------- action handlers (add/edit/delete/import/export) ----------
  const handleAdd = () => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền thêm xe!");
    setEditVehicle(null);
    setShowModal(true);
  };

  const handleEdit = (v) => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền sửa xe!");
    setEditVehicle(v);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền xóa xe!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiVehicles}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setVehicles((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAll = async () => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền xóa xe!");
    if (!window.confirm("Xác nhận xóa tất cả xe?")) return;
    try {
      await axios.delete(`${apiVehicles}/all`, {
        data: {},
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      alert("Đã xóa tất cả xe!");
      setVehicles([]);
    } catch (err) {
      console.error("Xóa tất cả thất bại:", err);
      alert(
        "Không thể xóa tất cả: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const handleSave = (saved) => {
    setVehicles((prev) => {
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

    if (isSubmitting) return; // tránh double click ngay tức thì
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(
        `${apiVehicles}/import?mode=${importMode}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
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
      fetch();
    }
  };

  const exportExcel = () => {
    if (!vehicles.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns
      .filter((c) => visibleColumns.includes(c.key))
      .map((c) => c.label);
    const data = vehicles.map((d) => {
      const row = {};
      allColumns.forEach((c) => {
        if (!visibleColumns.includes(c.key)) return;
        if (c.key === "registrationImage" || c.key === "inspectionImage") {
          row[c.label] = d[c.key] ? `${window.location.origin}${d[c.key]}` : "";
        } else {
          row[c.label] = d[c.key] || "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `vehicles_${formatDateFns(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    );
  };

  // toggle warning per vehicle
  const toggleWarning = async (vehicleId) => {
    try {
      const res = await axios.put(
        `${apiVehicles}/warning/${vehicleId}`,
        {},
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
      );
      const newWarningState = res.data.warning;
      setWarnings((prev) => ({ ...prev, [vehicleId]: newWarningState }));
    } catch (err) {
      console.error("Toggle warning failed", err);
      alert("Không cập nhật được cảnh báo!");
    }
  };

  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const columnFilterRef = useRef();
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        columnFilterRef.current &&
        !columnFilterRef.current.contains(e.target)
      ) {
        setShowColumnFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách lái xe
        </button>
        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách khách hàng
        </button>
        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách xe
        </button>
        <button
          onClick={handleGoToTrips}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"
          }`}
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
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Tất cả các chuyến
        </button>
        <button
          onClick={handleGoToAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToCustomer26}
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

      <div className="flex justify-between items-center mb-4 mt-2">
        <h1 className="text-xl font-bold">Quản lý Xe</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm biển số, đơn vị, loại..."
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
            className={`bg-green-500 px-3 py-1 text-white rounded ${
              !canEditVehicle ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canEditVehicle}
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
            id="fileExcelInput"
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-1 rounded"
          />

          <button
            onClick={() => {
              if (!file) return alert("Vui lòng chọn file Excel!");
              setShowImportMode(true);
            }}
            className={`bg-purple-600 text-white px-3 py-1 rounded ${
              !canEditVehicle || importing
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={!canEditVehicle || importing}
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* Choose visible columns UI */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowColumnFilter((prev) => !prev)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
        >
          Ẩn/Hiện cột
        </button>

        {showColumnFilter && (
          <div
            ref={columnFilterRef}
            className="absolute mt-1 w-64 bg-white border rounded shadow p-2 text-sm z-[99]"
          >
            {allColumns.map((c) => (
              <label key={c.key} className="flex items-center gap-1 mb-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(c.key)}
                  disabled={c.stickyIndex === 0 || c.stickyIndex === 1} // lock 2 cột đầu
                  onChange={() =>
                    setVisibleColumns((prev) =>
                      prev.includes(c.key)
                        ? prev.filter((k) => k !== c.key)
                        : [...prev, c.key]
                    )
                  }
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
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
            maxWidth: "max-content",
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
              />

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
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
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
            {/* Đang load */}
            {loadingVehicles && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-6 text-center"
                >
                  <div className="flex items-center justify-center gap-3 text-blue-500">
                    <span className="text-3xl animate-pulse">🐈💨</span>
                    <span className="italic">Mèo đang chạy lấy dữ liệu…</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Load xong nhưng rỗng */}
            {!loadingVehicles && vehicles.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}

            {vehicles.map((v, idx) => {
              const isWarning = warnings[v._id];
              return (
                <tr
                  key={v._id}
                  onClick={() => toggleRowHighlight(v._id)}
                  className={`cursor-pointer ${
                    isWarning
                      ? "bg-red-300"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50"
                  } ${selectedRows.includes(v._id) ? "bg-yellow-200" : ""}`}
                >
                  {/* Warning cell */}
                  <td
                    className="border text-center"
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                      width: 30,
                      background: isWarning ? "#fca5a5" : "#fff",
                    }}
                  >
                    <button
                      onClick={() => toggleWarning(v._id)}
                      className={`px-1 py-1 rounded text-white ${
                        isWarning ? "bg-red-600" : "bg-gray-400"
                      }`}
                    >
                      ⚠
                    </button>
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
                          lineHeight: "20px", // ⭐ canh giữa theo chiều dọc
                          whiteSpace: "nowrap", // ⭐ không xuống dòng
                          overflow: "hidden", // ⭐ ẩn phần vượt quá
                          textOverflow: "ellipsis",
                          zIndex: isFirst || isSecond ? 20 : 1,
                          background: isWarning
                            ? "#fca5a5"
                            : selectedRows.includes(v._id)
                            ? "#fde68a"
                            : idx % 2 === 0
                            ? "#fff"
                            : "#f9fafb",
                          ...cellWidthStyle,
                        }}
                      >
                        {cKey === "registrationImage" ||
                        cKey === "inspectionImage" ? (
                          v[cKey] && v[cKey].length > 0 ? (
                            <div className="flex gap-1">
                              {v[cKey].map((url, idx) => (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  key={idx}
                                >
                                  <img
                                    src={url}
                                    alt={
                                      cKey === "registrationImage"
                                        ? "reg"
                                        : "insp"
                                    }
                                    className="w-[42px] h-[28px] object-cover rounded border"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            ""
                          )
                        ) : (
                          formatCellValue(cKey, v[cKey])
                        )}
                      </td>
                    );
                  })}

                  <td
                    className="border p-1 flex gap-2 justify-center"
                    style={{ minWidth: 120, background: "#fff" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canEditVehicle ? (
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

      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteAll}
          className={`px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 
      ${!canEditVehicle ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!canEditVehicle}
        >
          Xóa tất cả
        </button>
      </div>

      {showModal && (
        <VehicleModal
          initialData={editVehicle}
          onClose={() => {
            setShowModal(false);
            setEditVehicle(null);
          }}
          onSave={handleSave}
          apiBase={apiVehicles}
        />
      )}

      {showImportMode && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-5 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">Chọn chế độ Import</h2>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
              />
              Thêm mới (thêm, trùng biển thì không lấy)
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "overwrite"}
                onChange={() => setImportMode("overwrite")}
              />
              Ghi đè (cập nhật nếu trùng biển)
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportMode(false)}
                className="px-4 py-1 bg-gray-300 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-4 py-1 bg-purple-600 text-white rounded"
                disabled={isSubmitting}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
