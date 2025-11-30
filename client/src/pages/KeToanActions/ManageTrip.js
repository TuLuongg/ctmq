import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEdit, FaHistory, FaExclamationTriangle } from "react-icons/fa";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import RideEditModal from "../../components/RideEditModal";
import RideRequestListModal from "../../components/RideRequestListModal";
import RideHistoryModal from "../../components/RideHistoryModal";
import API from "../../api";

const API_URL = `${API}/schedule-admin`;
const USER_API = `${API}/auth/dieu-van`; // API lấy danh sách điều vận

// helper để dựng key trong localStorage (theo user)
const prefKey = (userId) => `trips_table_prefs_${userId || "guest"}`;

export default function ManageTrip({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]);
  const [today] = useState(new Date());
  const [date, setDate] = useState("");

  const [selectedTrips, setSelectedTrips] = useState([]); // các chuyến được chọn
  const [maHoaDonInput, setMaHoaDonInput] = useState(""); // mã hóa đơn nhập tay

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser?._id || "guest";

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

    // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", {state: {user}});
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", {state: {user}});
  }

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", {state: {user}});
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", {state: {user}});
  }

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", {state: {user}});
  }


  // -------------------------------------
  // CÁC CỘT CHÍNH + MỞ RỘNG → GỘP 1 LIST
  // -------------------------------------
  const allColumns = [
    { key: "ltState", label: "LT" },
    { key: "onlState", label: "ONL" },
    { key: "offState", label: "OFF" },
    { key: "tenLaiXe", label: "TÊN LÁI XE" },
    { key: "maKH", label: "MÃ KH" },
    { key: "khachHang", label: "KHÁCH HÀNG" },
    { key: "dienGiai", label: "DIỄN GIẢI" },
    { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
    { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
    { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
    { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
    { key: "soDiem", label: "SỐ ĐIỂM" },
    { key: "trongLuong", label: "TRỌNG LƯỢNG" },
    { key: "bienSoXe", label: "BIỂN SỐ XE" },
    { key: "cuocPhiBS", label: "CƯỚC PHÍ" },
    { key: "daThanhToan", label: "ĐÃ THANH TOÁN" },
    { key: "bocXepBS", label: "BỐC XẾP" },
    { key: "veBS", label: "VÉ" },
    { key: "hangVeBS", label: "HÀNG VỀ" },
    { key: "luuCaBS", label: "LƯU CA" },
    { key: "cpKhacBS", label: "LUẬT CP KHÁC" },
    { key: "maChuyen", label: "MÃ CHUYẾN" },
    { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
    { key: "maHoaDon", label: "MÃ HOÁ ĐƠN" },

    // REGION: extra columns
    { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
    { key: "cuocPhi", label: "CƯỚC PHÍ BĐ" },
    { key: "bocXep", label: "BỐC XẾP BĐ" },
    { key: "ve", label: "VÉ BĐ" },
    { key: "hangVe", label: "HÀNG VỀ BĐ" },
    { key: "luuCa", label: "LƯU CA BĐ" },
    { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC BĐ" },
    { key: "ghiChu", label: "GHI CHÚ" },
    { key: "dieuVan", label: "ĐIỀU VẬN" },
    { key: "createdBy", label: "NGƯỜI NHẬP" },
    { key: "ngayBoc", label: "NGÀY NHẬP" },
  ];

  // ---------------- prefs (order + widths) ----------------
  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(allColumns.map((c) => c.key));
  const [hiddenColumns, setHiddenColumns] = useState([]);

  // columnWidths dùng định dạng '120px'
  const [columnWidths, setColumnWidths] = useState(
  Object.fromEntries(
    allColumns.map((c) => [
      c.key,
      ["ltState", "offState", "onlState"].includes(c.key) ? 50 : 80,
    ])
  )
);


  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // load prefs once when userId changes
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
        const valid = parsed.order.filter((k) => allColumns.some((ac) => ac.key === k));
        const missing = allColumns.map((c) => c.key).filter((k) => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }
      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
      // <<<<<<<<<<<<  THÊM DÒNG NÀY  >>>>>>>>>>>>
      if (Array.isArray(parsed.hiddenColumns)) {
        setHiddenColumns(parsed.hiddenColumns);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [userId]);

  // save prefs when order or widths change (but only after initial load to avoid overwrite)
  useEffect(() => {
    if (!prefsLoaded) return;
    if (!userId) return;
    const payload = { order: visibleColumns, widths: columnWidths || {}, hiddenColumns: hiddenColumns || [] };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save prefs:", e);
    }
  }, [visibleColumns, columnWidths, hiddenColumns, userId, prefsLoaded]);

  // ---------------- drag & resize refs ----------------
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col width
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(60);
  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, hiddenColumns, rides.length]);

  // ---------------- helpers & fetch ----------------
  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // 🔹 Lấy danh sách điều vận
  const fetchManagers = async () => {
    try {
      const res = await axios.get(USER_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManagers(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách điều vận:", err.response?.data || err.message);
    }
  };

  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);

  const filterFields = allColumns
  .filter((col) => !["ltState", "onlState", "offState"].includes(col.key)) // bỏ icon
  .map((col) => {
    const type = col.key.toLowerCase().includes("ngay") ? "date" : "text";
    return { ...col, type };
  });

  const [filters, setFilters] = useState(
  Object.fromEntries(filterFields.map((f) => [f.key, ""]))
);


  // 🔹 Lấy tất cả chuyến (có filter)
const fetchAllRides = async () => {
  try {
    const q = new URLSearchParams();
    q.append("page", page);
    q.append("limit", limit);

    // 🔥 Lặp qua toàn bộ filters (tự động thêm)
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        q.append(key, value);
      }
    });

    // 🔥 Filter ngày riêng (nếu có)
    if (date) {
      q.append("date", format(new Date(date), "yyyy-MM-dd"));
    }

    const res = await axios.get(`${API_URL}/accountant?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setRides(res.data.data || []);
    setTotalPages(res.data.totalPages || 1);
    const w = {};
    res.data.data.forEach(d => {
      if (d.warning === true) w[d._id] = true;
    });
    setWarnings(w)
  } catch (err) {
    console.error("Lỗi khi lấy tất cả chuyến:", err.response?.data || err.message);
    setRides([]);
  }
};


  useEffect(() => {
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchAllRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, date, page]);

  // 🔹 Lấy fullname từ id
  const getFullName = (id) => {
    const found = managers.find((m) => m._id === id);
    return found ? found.fullname : id;
  };

  // 🔹 Checkbox chọn chuyến
  const toggleSelectTrip = (id) => {
    setSelectedTrips((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 🔹 Cập nhật mã hóa đơn cho các chuyến đã chọn
  const updateMaHoaDon = async () => {
    if (!maHoaDonInput.trim()) return alert("Vui lòng nhập mã hóa đơn!");
    if (!selectedTrips.length) return alert("Vui lòng chọn ít nhất 1 chuyến!");

    try {
      const res = await axios.post(
        `${API_URL}/add-hoa-don`,
        {
          maHoaDon: maHoaDonInput.trim(),
          maChuyenList: selectedTrips
            .map((id) => rides.find((r) => r._id === id)?.maChuyen)
            .filter(Boolean),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setMaHoaDonInput("");
      setSelectedTrips([]);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật mã hóa đơn");
    }
  };

  // 🔹 Xuất Excel chỉ các cột đang hiển thị
  const exportToExcel = () => {
    if (!rides.length) return alert("Không có dữ liệu để xuất Excel!");

    const exportColumns = allColumns.filter((col) =>
      visibleColumns.includes(col.key)
    );
    const headers = exportColumns.map((col) => col.label);

      // 🟦 Danh sách các cột là số
  const data = rides.map((r) => {
    const row = {};

    exportColumns.forEach((col) => {
      const key = col.key;

      if (key === "dieuVan") {
        row[key] = getFullName(r.dieuVanID);
      }

      else if (["ngayBoc", "ngayBocHang", "ngayGiaoHang"].includes(key)) {
        row[key] = formatDate(r[key]);
      }

      // 🟧 Convert string -> number khi xuất Excel
      else if (numberColumns.includes(key)) {

        const raw = r[key] ?? "";

        // Chuyển "1.000.000" → 1000000
        const numeric = Number(
          raw.toString().replace(/\./g, "").replace(/,/g, "")
        );

        row[key] = isNaN(numeric) ? 0 : numeric;
      }

      else {
        row[key] = r[key] ?? "";
      }
    });

    return row;
  });

    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: exportColumns.map((c) => c.key),
    });

    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tổng hợp chuyến");

    saveAs(
      new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })]),
      `TongHop_${format(today, "ddMMyyyy_HHmm")}.xlsx`
    );
  };

  // ---- Excel bổ sung
  const [excelData, setExcelData] = useState([]);

  const handleSelectExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const updates = rows
      .map((row) => ({
        maChuyen: row["MÃ CHUYẾN"],
        ltState: row["LT"] != null ? String(row["LT"]) : "",
        onlState: row["ONL"] != null ? String(row["ONL"]) : "",
        offState: row["OFF"] != null ? String(row["OFF"]) : "",
        cuocPhiBS: row["CƯỚC PHÍ"] != null ? String(row["CƯỚC PHÍ"]) : "0",
        daThanhToan:
          row["ĐÃ THANH TOÁN"] != null ? String(row["ĐÃ THANH TOÁN"]) : "0",
        bocXepBS: row["BỐC XẾP"] != null ? String(row["BỐC XẾP"]) : "0",
        veBS: row["VÉ"] != null ? String(row["VÉ"]) : "0",
        hangVeBS: row["HÀNG VỀ"] != null ? String(row["HÀNG VỀ"]) : "0",
        luuCaBS: row["LƯU CA"] != null ? String(row["LƯU CA"]) : "0",
        cpKhacBS:
          row["LUẬT CP KHÁC"] != null ? String(row["LUẬT CP KHÁC"]) : "0",
      }))
      .filter((r) => r.maChuyen);

    setExcelData(updates);
  };

  const handleAddCuocPhiBoSung = async () => {
    if (!excelData.length) return alert("Vui lòng chọn file Excel trước!");

    try {
      await axios.post(
        `${API_URL}/add-bo-sung`,
        { updates: excelData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Cập nhật cước phí bổ sung thành công!");
      setExcelData([]); // reset data
      const input = document.getElementById("excelInput");
      if (input) input.value = "";
      fetchAllRides();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật cước phí bổ sung");
    }
  };

  //Yêu cầu sửa chuyến
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRide, setEditingRide] = useState(null);
  const [editForm, setEditForm] = useState({});

  const openEditRide = (ride) => {
    setEditingRide(ride);
    setEditForm({ ...ride });
    setShowEditModal(true);
  };

  const submitEditRequest = async (formData) => {
    if (!formData?.reason?.trim()) {
      alert("Vui lòng nhập lý do!");
      return false;
    }

    try {
      await axios.post(
        `${API_URL}/edit-request-ke-toan`,
        {
          rideID: formData._id,
          editorID: currentUser?._id,
          editorName: currentUser?.fullname,
          reason: formData.reason,
          newData: { ...formData },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Đã gửi yêu cầu chỉnh sửa!");
      fetchAllRides();
      setShowEditModal(false);

      return true; // important
    } catch (err) {
      console.error(err);
      alert("Gửi yêu cầu thất bại!");
      return false;
    }
  };

  //Danh sách yêu cầu của tôi
  const [showMyRequestModal, setShowMyRequestModal] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  const fetchMyRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyRequests(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy yêu cầu của tôi:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const openMyRequests = () => {
    fetchMyRequests();
    setShowMyRequestModal(true);
  };

  // ---------- Drag & Drop for columns (native) ----------
  const onDragStart = (e, colKey) => {
    dragColRef.current = colKey;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", colKey);
    } catch (err) {
      // some browsers may throw on setData; ignore
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    const src = dragColRef.current || e.dataTransfer.getData("text/plain");
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

  // ---------- Resizable columns (mouse handlers) ----------
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
    const finalWidth = th ? th.offsetWidth + "px" : columnWidths[colKey] || "80px";

    // update state AND persist widths immediately into localStorage (merge)
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

  const [showColumnBox, setShowColumnBox] = useState(false);
  const boxRef = useRef(null);

// tắt dropdown khi click ra ngoài
useEffect(() => {
  const handleClickOutside = (e) => {
    if (boxRef.current && !boxRef.current.contains(e.target)) {
      setShowColumnBox(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


  // Lịch sử chỉnh sửa
const [rideHistory, setRideHistory] = useState([]); // dữ liệu lịch sử của chuyến
const [showHistoryModal, setShowHistoryModal] = useState(false); // hiển thị modal
const [historyRide, setHistoryRide] = useState(null); // chuyến đang xem
const [editCounts, setEditCounts] = useState({}); // { rideID: số lần chỉnh sửa }

const fetchEditCounts = async () => {
  try {
    const counts = {};
    await Promise.all(
      rides.map(async (r) => {
        const res = await axios.get(`${API_URL}/history-count/${r._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        counts[r._id] = res.data.editCount;
      })
    );
    setEditCounts(counts);
  } catch (err) {
    console.error("Lỗi lấy số lần chỉnh sửa:", err.response?.data || err.message);
  }
};

// Gọi sau khi fetchRides xong
useEffect(() => {
  if (rides.length) fetchEditCounts();
}, [rides]);

const handleViewHistory = async (ride) => {
  try {
    const res = await axios.get(`${API_URL}/history/${ride._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRideHistory(res.data);
    setHistoryRide(ride);
    setShowHistoryModal(true);
  } catch (err) {
    alert("Không lấy được lịch sử: " + (err.response?.data?.error || err.message));
  }
};

// Bật tắt cảnh báo
const [warnings, setWarnings] = useState({});

const toggleWarning = async (rideId) => {
  try {
    const res = await axios.put(
      `${API_URL}/warning/${rideId}`,
      {}, // body rỗng
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const newWarningState = res.data.warning;

    setWarnings((prev) => ({
      ...prev,
      [rideId]: newWarningState,
    }));
  } catch (err) {
    console.error("Toggle warning failed ", err);
  }
};

  const numberColumns = [
    "cuocPhi",
    "cuocPhiBS",
    "bocXep",
    "bocXepBS",
    "ve",
    "veBS",
    "hangVe",
    "hangVeBS",
    "luuCa",
    "luuCaBS",
    "cpKhacBS",
    "khoangCach",
    "laiXeThuCuoc",
    "daThanhToan"
  ];


const formatNumber = (n) => {
  if (n == null || n === "") return "";
  const num = Number(n.toString().replace(/\./g, "").replace(/,/g, ""));
  if (isNaN(num)) return n;
  return num.toLocaleString("vi-VN"); // vì VN: 1.234.567
};

const [openFilter, setOpenFilter] = useState(null);

useEffect(() => {
  const close = (e) => {
    const th = e.target.closest("th[data-col]");
    if (!th) setOpenFilter(null);
  };
  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
}, []);

const [selectedRows, setSelectedRows] = useState([]);
const toggleRowHighlight = (id) => {
  setSelectedRows(prev =>
    prev.includes(id)
      ? prev.filter(x => x !== id) // bỏ ra
      : [...prev, id]               // thêm vào
  );
};


  // ---------- Render ----------
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
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
      if(!currentUser?.permissions?.includes("edit_trip")) {
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

</div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">DANH SÁCH CHUYẾN PHỤ TRÁCH</h1>
        <div className="flex gap-4 items-center">
          <span>Kế toán: {currentUser?.fullname || currentUser?.username}</span>
          <span className="font-semibold text-blue-600">
            Hôm nay: {format(today, "dd/MM/yyyy")}
          </span>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-2 mb-3 items-center w-full">

  {/* Filter điều vận riêng */}
  <select
    value={filters.dieuVanID}
    onChange={(e) =>
      setFilters((prev) => ({ ...prev, dieuVanID: e.target.value }))
    }
    className="border rounded px-3 py-2"
  >
    <option value="">-- Lọc theo điều vận --</option>
    {managers.map((m) => (
      <option key={m._id} value={m._id}>{m.fullname}</option>
    ))}
  </select>
</div>


      {/* Nút hành động */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button onClick={openMyRequests} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
          Yêu cầu của tôi
        </button>

        <button onClick={exportToExcel} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm">
          Xuất Excel
        </button>

        <div className="flex gap-2 items-center">
          <input type="file" accept=".xlsx,.xls" id="excelInput" onChange={handleSelectExcel} className="border rounded px-3 py-2" />
          <button onClick={handleAddCuocPhiBoSung} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
            Bổ sung chi phí
          </button>
        </div>
      </div>

      {/* Ô nhập mã hóa đơn */}
      <div className="flex gap-2 mb-3 items-center">
        <input
          type="text"
          placeholder="Nhập mã hóa đơn"
          value={maHoaDonInput}
          onChange={(e) => setMaHoaDonInput(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
        <button onClick={updateMaHoaDon} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
          Cập nhật mã hóa đơn
        </button>
        <span className="text-sm text-gray-600">
          Đã chọn {selectedTrips.length} chuyến
          {selectedTrips.length > 0 &&
            `: ${selectedTrips
              .map((id) => rides.find((r) => r._id === id)?.maChuyen)
              .filter(Boolean)
              .join(", ")}`}
        </span>
      </div>

{/* UI CHỌN HIỆN / ẨN CỘT */}
<div className="w-full flex items-center justify-between mb-2">

  {/* BÊN TRÁI: Hiện / Ẩn cột */}
  <div className="relative inline-block" ref={boxRef}>
    <button
      onClick={() => setShowColumnBox(!showColumnBox)}
      className="px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
    >
      Hiện / Ẩn cột
    </button>

    {showColumnBox && (
      <div className="absolute left-0 mt-2 w-64 bg-white border rounded-lg shadow-xl p-3 z-[1000]">

        {/* Nút chọn tất cả + bỏ tất cả */}
        <div className="flex gap-2 mb-3">
          <button
            className="flex-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => setHiddenColumns([])}
          >
            Chọn tất cả
          </button>

          <button
            className="flex-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => setHiddenColumns(allColumns.map(c => c.key))}
          >
            Bỏ tất cả
          </button>
        </div>

        {/* Danh sách cột */}
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
          {allColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
            >
              <input
                type="checkbox"
                checked={!hiddenColumns.includes(col.key)}
                onChange={() => {
                  setHiddenColumns((prev) =>
                    prev.includes(col.key)
                      ? prev.filter((k) => k !== col.key)
                      : [...prev, col.key]
                  );
                }}
              />
              {col.label}
            </label>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* BÊN PHẢI: Xóa lọc sát mép phải */}
  <button
    onClick={() =>
      setFilters(Object.fromEntries(filterFields.map((f) => [f.key, ""])))
    }
    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow"
  >
    Xóa lọc
  </button>
</div>


      {/* BẢNG */}
<div className="overflow-auto border" style={{ maxHeight: "80vh"}}>
  <table
    className="border-collapse"
    style={{ tableLayout: "fixed", width: "max-content", maxWidth: "max-content", }}
  >
    <thead className="bg-blue-600 text-white">
      <tr>

        {/* CỘT 1: SỬA */}
        <th
          className="border bg-blue-600 text-white"
          style={{
            position: "sticky",
            top: 0,
            left: 0,
            zIndex: 60,
            width: 90,
            minWidth: 90,
            maxWidth: 90,
            textAlign: "center",
            background: "#2563eb",
          }}
        ></th>

        {/* CỘT 2: CHECKBOX HEADER */}
        <th
          className="border bg-blue-600 text-white"
          style={{
            position: "sticky",
            top: 0,
            left: 90,
            zIndex: 60,
            width: 40,
            minWidth: 40,
            maxWidth: 40,
            textAlign: "center",
            background: "#2563eb",
          }}
        >
          <input
            type="checkbox"
            style={{ width: "100%", height: "100%" }}
            checked={selectedTrips.length === rides.length && rides.length > 0}
            onChange={(e) =>
              setSelectedTrips(e.target.checked ? rides.map((r) => r._id) : [])
            }
          />
        </th>

        {/* RENDER CÁC CỘT KHÁC */}
        {visibleColumns.map((colKey, index) => {
          if (hiddenColumns.includes(colKey)) return null;
  const col = allColumns.find((c) => c.key === colKey) || { key: colKey, label: colKey };
  const width = columnWidths[col.key] || 120;
  const fieldType = filterFields.find(f => f.key === col.key)?.type || "text";
  const dateFields = ["ngayBoc", "ngayBocHang", "ngayGiaoHang"];


  // LEFT OFFSET CHO 2 CỘT CỐ ĐỊNH TIẾP THEO
  let leftOffset = null;
  if (index === 0) leftOffset = 130;
  if (index === 1) leftOffset = 130 + width;

  const stickyColumns = ["tenLaiXe", "maKH"];
  const stickyIndex = stickyColumns.indexOf(col.key);
  if (stickyIndex >= 0) {
    leftOffset = 130;
    for (let i = 0; i < stickyIndex; i++) {
      const key = stickyColumns[i];
      leftOffset += parseInt(columnWidths[key] || 120);
    }
  }

  return (
<th
  key={col.key}
  data-col={col.key}
  className="border p-0 bg-blue-600 text-white relative select-none"
  style={{
    position: "sticky",
    top: 0,
    left: stickyIndex >= 0 ? leftOffset : undefined,
    zIndex: stickyIndex >= 0 ? 60 : 50,
    background: "#2563eb",
    width,
    minWidth: width,
    maxWidth: width,
    overflow: "visible"
  }}
>
  {/* CLICK VÀO PHẦN LABEL ĐỂ MỞ FILTER */}
  <div
    className="p-2 flex items-center justify-between"
    onClick={(e) => {
      e.stopPropagation();
      setOpenFilter(col.key);
    }}
    style={{ cursor: "pointer" }}
  >
    <span className="truncate">{col.label}</span>
  </div>

  {/* THANH RESIZE (KÉO ĐỂ ĐỔI ĐỘ RỘNG) */}
  <div
    onMouseDown={(e) => onMouseDownResize(e, col.key)}
    onClick={(e) => e.stopPropagation()}
    style={{
      width: 10,
      cursor: "col-resize",
      height: "100%",
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 80,
    }}
  />

  {/* FILTER POPUP */}
  {openFilter === col.key && (
    <div
      className="absolute bg-white border rounded shadow p-2 z-50"
      style={{
        top: "100%",
        left: 0,
        width: "200px",
        zIndex:9999
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {
  dateFields.includes(col.key) ? (
    <input
      type="date"
      className="w-full border px-2 py-1 rounded text-black"
      value={filters[col.key] || ""}
      onChange={(e) =>
        setFilters((p) => ({ ...p, [col.key]: e.target.value }))
      }
    />
  ) : (
    <input
      type="text"
      className="w-full border px-2 py-1 rounded text-black"
      placeholder={`${col.label}...`}
      value={filters[col.key] || ""}
      onChange={(e) =>
        setFilters((p) => ({ ...p, [col.key]: e.target.value }))
      }
    />
  )
}


      <div className="flex gap-1 mt-1">
        <button
          className="flex-1 bg-gray-200 px-2 py-1 rounded"
          onClick={() =>
            setFilters((p) => ({ ...p, [col.key]: "" }))
          }
        >
          Xóa
        </button>
      </div>
    </div>
  )}
</th>


  );
})}

      </tr>
    </thead>

    <tbody>
      {rides.length === 0 && (
        <tr>
          <td
            colSpan={visibleColumns.length + 2}
            className="p-20 text-center text-gray-500"
          >
            Không có dữ liệu :33
          </td>
        </tr>
      )}

      {rides.map((r) => (
        <tr
  key={r._id}
  className={`text-center cursor-pointer ${
    selectedRows.includes(r._id)
      ? "bg-yellow-400"   // 🔥 chữ vàng + đậm
      : "text-black"
  } hover:bg-gray-100`}
  onClick={() => toggleRowHighlight(r._id)}
>


          {/* CỘT 1: HÀNH ĐỘNG */}
<td
  className="border p-2 bg-white"
  style={{
    position: "sticky",
    left: 0,
    zIndex: 50,
    width: 90,
    minWidth: 90,
    background: "#fff",
  }}
  onClick={(e) => e.stopPropagation()}
>
  <div className="flex items-center gap-2">

    {/* Nút sửa */}
    <button
      onClick={() => openEditRide(r)}
      className="p-1.5 bg-yellow-400 text-white rounded-lg shadow-sm hover:bg-yellow-500 hover:shadow-md transition"
      title="Sửa chuyến"
    >
      <FaEdit className="w-4 h-4" />
    </button>

    {/* Nút cảnh báo */}
    <button
      onClick={() => toggleWarning(r._id)}
      className={`p-1.5 rounded-lg shadow-sm transition ${
        warnings[r._id]
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
      title="Đánh dấu cảnh báo"
    >
      <FaExclamationTriangle className="w-4 h-4" />
    </button>

    {/* Lịch sử chỉnh sửa */}
    {editCounts[r._id] > 0 && (
      <button
        onClick={() => handleViewHistory(r)}
        className="relative p-1.5 bg-green-50 rounded-lg shadow-sm hover:bg-green-100 transition"
        title="Lịch sử chỉnh sửa"
      >
        <FaHistory className="text-green-600 w-4 h-4" />

        {/* Badge số lần */}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow">
          {editCounts[r._id]}
        </span>
      </button>
    )}

  </div>
</td>


          {/* CỘT 2: CHECKBOX */}
          <td
            className="border p-2 bg-white"
            style={{
              position: "sticky",
              left: 90,
              zIndex: 50,
              width: 40,
              minWidth: 40,
              background: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selectedTrips.includes(r._id)}
              onChange={() => toggleSelectTrip(r._id)}
              onClick={(e) => e.stopPropagation()}
            />
          </td>

          {/* RENDER DATA */}
          {visibleColumns.map((colKey, colIndex) => {
            if (hiddenColumns.includes(colKey)) return null;
            const col = allColumns.find((c) => c.key === colKey) || {
              key: colKey,
              label: colKey,
            };

            const width = columnWidths[col.key] || 120;


            const cellValue =
              ["ngayBocHang", "ngayGiaoHang", "ngayBoc"].includes(col.key)
                ? formatDate(r[col.key])
                : col.key === "dieuVan"
                ? getFullName(r.dieuVanID)
                : r[col.key] ?? "";

            let leftOffset = null;
            if (colIndex === 0) leftOffset =130;
            if (colIndex === 1) leftOffset = 130 + width;

                      const stickyColumns = ["tenLaiXe", "maKH"];
          const stickyIndex = stickyColumns.indexOf(col.key);

if (stickyIndex >= 0) {
  leftOffset = 130; // 90 sửa + 40 checkbox
  for (let i = 0; i < stickyIndex; i++) {
    const key = stickyColumns[i];
    leftOffset += parseInt(columnWidths[key] || 120);
  }
}

            return (
              <td
                key={col.key}
                className="border p-2"
                style={{
                  position: leftOffset !== null ? "sticky" : "static",
                  left: stickyIndex >= 0 ? leftOffset : undefined,
                  zIndex: stickyIndex >= 0 ? 45 : 1,
                  background: warnings[r._id]
  ? "#fecaca"
  : selectedRows.includes(r._id)
  ? "#fef08a"      // màu vàng nhạt
  : "#fff",

                  textAlign: "left",
                  width,
                  minWidth: width,
                  maxWidth: width,
                }}
              >
                
                <div className="truncate"><div className="truncate">
  { numberColumns.includes(col.key)
      ? formatNumber(cellValue)
      : cellValue
  }
</div>
</div>
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>


      <div className="flex justify-center items-center gap-3 mt-4">
        {/* Trang trước */}
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          ← Trang trước
        </button>

        {/* Hiển thị số trang */}
        <span className="font-semibold">
          {page} / {totalPages}
        </span>

        <select value={page} onChange={(e) => setPage(Number(e.target.value))} className="border p-1 rounded">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Trang sau */}
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Trang sau →
        </button>
      </div>

      <div className="mt-3 text-right font-semibold text-gray-700">
        Tổng số chuyến hiển thị: {rides.length.toLocaleString()}
      </div>

      {showEditModal && (
        <div className="fixed z-[99999]">
        <RideEditModal
          ride={editingRide}
          allColumns={allColumns}
          onSubmit={submitEditRequest}
          onClose={() => setShowEditModal(false)}
        />
        </div>
      )}

      <div className="fixed z-[99999]">
        <RideRequestListModal
        open={showMyRequestModal}
        onClose={() => setShowMyRequestModal(false)}
        requests={myRequests}
        title="📌 Yêu cầu chỉnh sửa của tôi"
      />
      </div>

{showHistoryModal && historyRide && (
  <div className="fixed z-[99999]">
  <RideHistoryModal
    ride={historyRide}
    historyData={rideHistory}
    onClose={() => setShowHistoryModal(false)}
  />
  </div>
      )}

    </div>
  );
}
