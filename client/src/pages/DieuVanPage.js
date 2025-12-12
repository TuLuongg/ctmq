import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FaEdit, FaTrash, FaHistory } from "react-icons/fa";
import RideModal from "../components/RideModal";
import ProfileModal from "../components/ProfileModal";
import RideEditRequestModal from "../components/RideEditRequestModal";
import RideHistoryModal from "../components/RideHistoryModal";
import axios from "axios";
import API from "../api";

const API_URL = `${API}/schedule-admin`;
const USER_API = `${API}/auth/dieu-van`;

const removeVietnamese = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const mainColumns = [
  { key: "dieuVan", label: "ĐIỀU VẬN PHỤ TRÁCH" },
  { key: "ngayBoc", label: "NGÀY NHẬP" },
  { key: "khachHang", label: "KHÁCH HÀNG" },
  { key: "dienGiai", label: "DIỄN GIẢI" },
  { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
  { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
  { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
  { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
  { key: "bienSoXe", label: "BIỂN SỐ XE" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const extraColumns = [
  { key: "tenLaiXe", label: "TÊN LÁI XE" },
  { key: "soDiem", label: "SỐ ĐIỂM" },
  { key: "trongLuong", label: "TRỌNG LƯỢNG" },
  { key: "cuocPhi", label: "CƯỚC PHÍ" },
  { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
  { key: "bocXep", label: "BỐC XẾP" },
  { key: "ve", label: "VÉ" },
  { key: "hangVe", label: "HÀNG VỀ" },
  { key: "luuCa", label: "LƯU CA" },
  { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC" },
  { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "ghiChu", label: "GHI CHÚ" },
];

export default function DieuVanPage({ user, onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUser = user || storedUser;

  // State quản lý user hiện tại, để live update avatar/tên
  const [currentUserState, setCurrentUserState] = useState(user || storedUser);

  const [today] = useState(new Date());
  const [date, setDate] = useState(new Date());
  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(currentUser || "");
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editRide, setEditRide] = useState(null);
  const [filters, setFilters] = useState({
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    ngayBoc: "",
  });

  // 🔹 3 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  //const [vehicles, setVehicles] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, customerRes, vehicleRes] = await Promise.all([
        axios.get(`${API}/drivers/names/list`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/vehicles/names/list`),
      ]);
      setDrivers(driverRes.data);
      setCustomers(customerRes.data);
      //setVehicles(vehicleRes.data);
    };
    fetchData();
  }, []);

  // 🟢 Lấy danh sách điều vận
  const fetchManagers = async () => {
    try {
      const res = await axios.get(USER_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManagers(res.data);
    } catch (err) {
      console.error(
        "Lỗi lấy danh sách điều vận:",
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);

  const [warnings, setWarnings] = useState({});

  // 🔹 Lấy tất cả chuyến (có filter)
  const fetchRides = async (manager) => {
    try {
      const dieuVanID = manager._id || manager;
      const q = new URLSearchParams();
      q.append("page", page);
      q.append("limit", limit);

      Object.entries(filters).forEach(([key, value]) => {
        if (key === "khachHang") return; // ❗ KHÔNG GỬI KHÁCH HÀNG LÊN API
        if (value !== "" && value !== null && value !== undefined) {
          q.append(key, value);
        }
      });

      const res = await axios.get(
        `${API_URL}/dieuvan/${dieuVanID}?${q.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRides(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);

      const w = {};
      res.data.data.forEach((d) => {
        if (d.warning === true) w[d._id] = true;
      });
      setWarnings(w);
    } catch (err) {
      console.error(
        "Lỗi khi lấy tất cả chuyến:",
        err.response?.data || err.message
      );
      setRides([]);
    }
  };

  // useEffect: khi thay selectedManager / filters / date thay đổi tự động fetch
  useEffect(() => {
    if (!selectedManager) return;
    setPage(1);
    // truyền filters & date rõ ràng để tránh race condition
    fetchRides(selectedManager, filters, date, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedManager, filters, date]);

  useEffect(() => {
    if (!selectedManager) return;
    // khi page thay đổi, fetch với filters/date hiện tại
    fetchRides(selectedManager, filters, date, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 🧹 Xoá lọc
const clearFilters = () => {
  // Xóa các filter to
  setFilters({
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    ngayBoc: "",
  });

  // Reset ngày
  setDate(new Date());

  // Xóa toàn bộ filter theo từng cột
  setColumnFilters({});

  // Đóng filter cột đang mở
  setActiveFilterCol(null);

  // Fetch lại danh sách sạch hoàn toàn
  fetchRides(selectedManager, {}, new Date());
};


  const emptyForm = {
    dieuVanID: currentUser._id,
    dieuVan: currentUser.fullname,
    createdByID: currentUser._id,
    createdBy: currentUser.fullname,
    tenLaiXe: "",
    khachHang: "",
    dienGiai: "",
    ngayBocHang: format(date, "yyyy-MM-dd"),
    ngayGiaoHang: format(date, "yyyy-MM-dd"),
    diemXepHang: "",
    diemDoHang: "",
    soDiem: "",
    trongLuong: "",
    bienSoXe: "",
    cuocPhi: "",
    laiXeThuCuoc: "",
    bocXep: "",
    ve: "",
    hangVe: "",
    luuCa: "",
    luatChiPhiKhac: "",
    ghiChu: "",
    //maChuyen: "",
    ngayBoc: format(date, "yyyy-MM-dd"),
    keToanPhuTrach: "",
    accountUsername: "",
    cuocPhiBoSung: "",
  };

  const handleAdd = () => {
    setEditRide(null);
    setShowModal(true);
  };

  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestRide, setEditRequestRide] = useState(null);

  // Khi bấm chỉnh sửa chuyến → mở modal yêu cầu chỉnh sửa
  const handleEdit = (ride) => {
    setEditRequestRide(ride); // gán chuyến cần chỉnh sửa
    setShowEditRequestModal(true); // mở modal
  };

  const handleSave = async (payload) => {
    try {
      if (editRide) {
        const res = await axios.put(`${API_URL}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) =>
          prev.map((r) => (r._id === editRide ? res.data : r))
        );
      } else {
        const res = await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) => [...prev, res.data]);
        fetchRides();
      }
      setShowModal(false);
    } catch (err) {
      alert("Không lưu được: " + err.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá chuyến này?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRides((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert("Không xoá được: " + err.response?.data?.error);
    }
  };

  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

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
      console.error(
        "Lỗi lấy số lần chỉnh sửa:",
        err.response?.data || err.message
      );
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
      alert(
        "Không lấy được lịch sử: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Thêm state quản lý chiều rộng cột
  const allColumns = [...mainColumns, ...extraColumns];
  const [columnWidths, setColumnWidths] = useState(
    allColumns.reduce((acc, col) => ({ ...acc, [col.key]: 150 }), {})
  );

  // Hàm kéo cột
const handleResizeStart = (e, key) => {
  // prevent text selection
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = columnWidths[key] || 90;
  document.body.style.cursor = 'col-resize';

  const onMouseMove = (ev) => {
    const newWidth = startWidth + (ev.clientX - startX);
    setColumnWidths((prev) => ({
      ...prev,
      [key]: Math.max(newWidth, 10), // min 10px
    }));
  };

  const onMouseUp = () => {
    document.body.style.cursor = '';
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};


  const [columnOrder, setColumnOrder] = useState([
    ...mainColumns.map((c) => c.key),
    ...extraColumns.map((c) => c.key),
  ]);

const handleColumnDrag = (startIndex, endIndex) => {
  const newOrder = [...columnOrder];
  const [moved] = newOrder.splice(startIndex, 1);
  newOrder.splice(endIndex, 0, moved);
  setColumnOrder(newOrder);
};

const [openColumnMenu, setOpenColumnMenu] = useState(false);


  const formatMoney = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("vi-VN"); // 👉 Tự động thành 100.000 – 1.200.000
  };

  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  const dateColumns = ["ngayBoc", "ngayBocHang", "ngayGiaoHang"];
const moneyColumns = [
  "cuocPhi",
  "laiXeThuCuoc",
  "bocXep",
  "ve",
  "hangVe",
  "luuCa",
  "luatChiPhiKhac",
];

const filterRef = useRef(null);
useEffect(() => {
  const handleClickOutside = (e) => {
    if (filterRef.current && !filterRef.current.contains(e.target)) {
      setActiveFilterCol(null);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);


  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">QUẢN LÝ ĐIỀU CHUYẾN XE</h1>
        <div className="flex gap-4 items-center">
          <img
            src={currentUserState.avatar}
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <span>{currentUserState?.fullname || currentUserState.username}</span>
          <button
            onClick={() => setShowProfileModal(true)}
            className="bg-yellow-400 rounded-full border"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>

          <span className="font-semibold text-blue-600">
            Ngày: {format(today, "dd/MM/yyyy")}
          </span>
          <button
            onClick={onLogout || (() => navigate("/login"))}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Chọn điều vận */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {managers.map((m) => (
          <button
            key={m._id}
            onClick={() => setSelectedManager(m)}
            className={`px-3 py-2 rounded transition ${
              selectedManager?._id === m._id
                ? "bg-blue-600 text-white"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {m.fullname || m.username}
          </button>
        ))}
        <button
          onClick={() => navigate("/tonghop")}
          className="ml-auto bg-gray-300 px-3 py-1 rounded"
        >
          Tổng hợp
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="w-2/3 grid grid-cols-5 gap-1 mb-3">
        <input
          type="text"
          placeholder="Mã chuyến..."
          value={filters.maChuyen}
          onChange={(e) =>
            setFilters((f) => ({ ...f, maChuyen: e.target.value }))
          }
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Khách hàng..."
          value={filters.khachHang}
          onChange={(e) =>
            setFilters((f) => ({ ...f, khachHang: e.target.value }))
          }
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={filters.ngayBoc || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, ngayBoc: e.target.value }))
          }
          className="border p-2 rounded"
        />
        <div className="flex gap-2">
          <button
            onClick={() => fetchRides(selectedManager, filters, date)}
            className="bg-green-600 text-white rounded px-4 py-2 w-1/2"
          >
            Lọc
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-400 text-white rounded px-4 py-2 w-1/2"
          >
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Thêm / Hiển thị thêm */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          + Thêm chuyến
        </button>
      </div>

      <div className="relative inline-block">
  <button
    onClick={() => setOpenColumnMenu(!openColumnMenu)}
    className="bg-gray-600 text-white px-3 py-2 rounded"
  >
    Tuỳ chọn cột
  </button>

  {openColumnMenu && (
    <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border rounded p-2 z-50">
      <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-1">
        {allColumns.map(col => (
          <label
            key={col.key}
            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={visibleColumns[col.key] ?? true}
              onChange={() =>
  setVisibleColumns(prev => ({
    ...prev,
    [col.key]: !(prev[col.key] ?? true),
  }))
}

            />
            <span className="text-sx">{col.label}</span>
          </label>
        ))}
      </div>
    </div>
  )}
</div>


      {/* Container scroll cả ngang và dọc */}
      <div className="border rounded shadow-lg h-[600px] overflow-auto">
        <table className="border-collapse border w-max text-xs" style={{ tableLayout: "auto" }}>
          <thead className="bg-blue-600 text-white sticky top-0 z-20">
            <tr>
{columnOrder.map((key, index) => {
  const col = allColumns.find(c => c.key === key);
  if (!col) return null;
  if (visibleColumns[key] === false) return null;

  return (
<th
  key={col.key}
  draggable
  onDragStart={(e) => {
    if (e.target.closest && e.target.closest("[data-resize='true']")) return;
    e.dataTransfer.setData("colIndex", index);
  }}
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    const start = Number(e.dataTransfer.getData("colIndex"));
    handleColumnDrag(start, index);
  }}
  onClick={() =>
  setActiveFilterCol((prev) => (prev === col.key ? null : col.key))
}
  style={{
    width: columnWidths[col.key],
    minWidth: 30,
    maxWidth: columnWidths[col.key],   // ⭐ QUAN TRỌNG
    textAlign: "center",
  }}
  className="border p-2 relative select-none overflow-hidden"
>
  {/* Tiêu đề 2 DÒNG + ELLIPSIS */}
  <div
    className="w-full"
    style={{
      display: "-webkit-box",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: 2,  // ⭐ 2 dòng
      overflow: "hidden",
      textOverflow: "ellipsis",
      lineHeight: "1.2",
      fontSize: "12px",
      whiteSpace: "normal", // ⭐ Cho phép xuống dòng
    }}
  >
    {col.label}
  </div>

{activeFilterCol === col.key && (
  <div
    ref={filterRef}
    className="absolute left-0 right-0 top-full mt-1 z-30"
    onClick={(e) => e.stopPropagation()} // Không đóng khi click vào input
  >
    {dateColumns.includes(col.key) ? (
      <input
        type="date"
        autoFocus
        value={columnFilters[col.key] || ""}
        onChange={(e) =>
          setColumnFilters({
            ...columnFilters,
            [col.key]: e.target.value,
          })
        }
        className="bg-white text-black border rounded p-1 text-xs w-full"
      />
    ) : (
      <input
        autoFocus
        type="text"
        placeholder="Lọc..."
        value={columnFilters[col.key] || ""}
        onChange={(e) =>
          setColumnFilters({
            ...columnFilters,
            [col.key]: e.target.value,
          })
        }
        className="bg-white text-black border rounded p-1 text-xs w-full"
      />
    )}
  </div>
)}



  {/* Thanh kéo resize */}
  <div
    data-resize="true"
    onMouseDown={(e) => {
      e.stopPropagation();
      handleResizeStart(e, col.key);
    }}
    className="absolute top-0 right-0 h-full cursor-col-resize z-20"
    style={{ width: "8px", background: "transparent" }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#d1d5db")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  />
</th>

  );
})}

<th className="border p-2 bg-blue-600 text-white select-none" style={{ width: 120 }}>
  Hành động
</th>

            </tr>
          </thead>
          <tbody className="bg-white">
            {rides
  .filter((r) => {
     // Lọc khách hàng không dấu giữ nguyên
  if (filters.khachHang?.trim()) {
    const kw = removeVietnamese(filters.khachHang.toLowerCase());
    const name = removeVietnamese((r.khachHang || "").toLowerCase());
    if (!name.includes(kw)) return false;
  }

  // Lọc từng cột
  for (const key in columnFilters) {
    const f = columnFilters[key]?.trim();
    if (!f) continue;

    const raw = r[key];

    // 🔹 Lọc NGÀY
    if (dateColumns.includes(key)) {
      const formatted = raw ? format(new Date(raw), "yyyy-MM-dd") : "";
      if (formatted !== f) return false;
      continue;
    }

    // 🔹 Lọc SỐ TIỀN
    if (moneyColumns.includes(key)) {
      const rawNum = (raw || "").toString().replace(/\./g, "");
      const fNum = f.replace(/\./g, "");
      if (!rawNum.includes(fNum)) return false;
      continue;
    }

    // 🔹 Lọc TEXT có bỏ dấu
    const field = removeVietnamese((raw || "").toString().toLowerCase());
    const filterText = removeVietnamese(f.toLowerCase());
    
    if (!field.includes(filterText)) return false;
  }

  return true;
  })

              .map((r) => (
                <tr key={r._id} className="text-center" style={{ height: 30 }}>
    {columnOrder.map(key => {
      if (visibleColumns[key] === false) return null;
      const col = allColumns.find(c => c.key === key);
      if (!col) return null;

      const raw = ["ngayBocHang", "ngayGiaoHang", "ngayBoc"].includes(col.key)
        ? formatDate(r[col.key])
        : ["cuocPhi","laiXeThuCuoc","bocXep","ve","hangVe","luuCa","luatChiPhiKhac","cuocPhiBoSung"].includes(col.key)
          ? formatMoney(r[col.key])
          : r[col.key];

      return (
<td
  className="border px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
  style={{
    width: columnWidths[col.key],
    maxWidth: columnWidths[col.key],
  }}
>
  {raw ?? ""}
</td>

      );
    })}

                  <td className="border p-2" style={{ height: 30, width: 120 }}>
                    {/* Hành động */}
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-500 flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-500 flex items-center justify-center w-8 h-8 rounded hover:bg-red-100"
                      >
                        <FaTrash />
                      </button>
                      <div
                        onClick={() =>
                          editCounts[r._id] > 0 && handleViewHistory(r)
                        }
                        className="relative cursor-pointer w-8 h-8 flex items-center justify-center rounded hover:bg-green-100"
                      >
                        {editCounts[r._id] > 0 ? (
                          <>
                            <FaHistory className="text-green-600 w-5 h-5" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                              {editCounts[r._id]}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </td>
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

        {/* Nhập số trang muốn tới */}
        <select
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
          className="border p-1 rounded"
        >
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

      {/* Modal */}
      {/* Modal thêm/sửa chuyến */}
      {showModal && !editRide && (
        <RideModal
          key="new"
          initialData={emptyForm}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          dieuVanList={managers}
          currentUser={currentUser}
          drivers={drivers}
          customers={customers}
          //vehicles={vehicles}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          user={currentUserState}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedUser) => {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setCurrentUserState(updatedUser); // 🔄 live update avatar + tên
          }}
        />
      )}

      {/* Modal yêu cầu chỉnh sửa */}
      {/* Modal yêu cầu chỉnh sửa */}
      {showEditRequestModal && editRequestRide && (
        <RideEditRequestModal
          ride={editRequestRide} // chuyến cần chỉnh sửa
          currentUser={currentUser}
          dieuVanList={managers}
          drivers={drivers}
          customers={customers}
          //vehicles={vehicles}
          onClose={() => {
            setShowEditRequestModal(false);
            setEditRequestRide(null);
          }}
          onSubmitEdit={async (payload) => {
            try {
              const token = localStorage.getItem("token");
              await axios.post(`${API_URL}/edit-request`, payload, {
                headers: { Authorization: `Bearer ${token}` },
              });
              alert("Chuyến đã được chỉnh sửa và lưu lịch sử!");
              setShowEditRequestModal(false);
              setEditRequestRide(null);
              fetchRides(selectedManager, filters, date); // reload danh sách
            } catch (err) {
              alert(
                "Không lưu được chuyến: " +
                  (err.response?.data?.error || err.message)
              );
            }
          }}
        />
      )}
      {showHistoryModal && historyRide && (
        <RideHistoryModal
          ride={historyRide}
          historyData={rideHistory}
          onClose={() => setShowHistoryModal(false)}
          role={currentUser.role}
        />
      )}
    </div>
  );
}
