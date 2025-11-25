import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FaEdit, FaTrash, FaHistory } from "react-icons/fa";
import RideModal from "../components/RideModal";
import ProfileModal from "../components/ProfileModal";
import RideEditRequestModal from "../components/RideEditRequestModal";
import RideHistoryModal from "../components/RideHistoryModal"
import axios from "axios";

const API_URL = "http://localhost:4000/api/schedule-admin";
const USER_API = "http://localhost:4000/api/auth/dieu-van";
const API = "http://localhost:4000/api";

const mainColumns = [
  { key: "dieuVan", label: "ĐIỀU VẬN PHỤ TRÁCH" },
  { key: "createdBy", label: "NGƯỜI NHẬP" },
  { key: "ngayBoc", label: "NGÀY NHẬP" },
  { key: "tenLaiXe", label: "TÊN LÁI XE" },
  { key: "khachHang", label: "KHÁCH HÀNG" },
  { key: "ngayBocHang", label: "NGÀY BỐC HÀNG" },
  { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
  { key: "bienSoXe", label: "BIỂN SỐ XE" },
  { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const extraColumns = [
  { key: "dienGiai", label: "DIỄN GIẢI" },
  { key: "diemXepHang", label: "ĐIỂM XẾP HÀNG" },
  { key: "diemDoHang", label: "ĐIỂM DỠ HÀNG" },
  { key: "soDiem", label: "SỐ ĐIỂM" },
  { key: "trongLuong", label: "TRỌNG LƯỢNG" },
  { key: "cuocPhi", label: "CƯỚC PHÍ" },
  { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
  { key: "bocXep", label: "BỐC XẾP" },
  { key: "ve", label: "VÉ" },
  { key: "hangVe", label: "HÀNG VỀ" },
  { key: "luuCa", label: "LƯU CA" },
  { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC" },
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
  const [selectedManager, setSelectedManager] = useState(currentUser.username || "");
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editRide, setEditRide] = useState(null);
  const [showExtra, setShowExtra] = useState(false);
  const [filters, setFilters] = useState({
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    ngayBoc: "",
  });

      // 🔹 3 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

    // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, customerRes, vehicleRes] = await Promise.all([
        axios.get(`${API}/drivers/names/list`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/vehicles/names/list`)
      ]);
      setDrivers(driverRes.data);
      setCustomers(customerRes.data);
      setVehicles(vehicleRes.data);
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
      console.error("Lỗi lấy danh sách điều vận:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  // 🟢 Lấy chuyến theo điều vận + bộ lọc
  const fetchRides = async (manager, filters = {}, date, pageNumber = page) => {
  try {
    let dieuVanId = manager?._id || manager;
    if (!dieuVanId) return;

    const query = new URLSearchParams();
    query.append("page", pageNumber);
    query.append("limit", 20); // mỗi trang 20 items

    if (filters.tenLaiXe) query.append("tenLaiXe", filters.tenLaiXe);
    if (filters.maChuyen) query.append("maChuyen", filters.maChuyen);
    if (filters.khachHang) query.append("khachHang", filters.khachHang);
    if (filters.ngayBoc)
      query.append("ngayBoc", format(new Date(filters.ngayBoc), "yyyy-MM-dd"));
    if (date) query.append("date", format(date, "yyyy-MM-dd"));

    const url = `${API_URL}/dieuvan/${dieuVanId}?${query.toString()}`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setRides(res.data.data);       // lấy danh sách
    setTotalPages(res.data.totalPages || 1);

  } catch (err) {
    console.error("Lỗi lấy chuyến:", err.response?.data || err.message);
    setRides([]);
  }
};


useEffect(() => {
  if (selectedManager) {
    setPage(1);
    fetchRides(selectedManager, filters, date, 1);
  }
}, [selectedManager, filters, date]);

useEffect(() => {
  if (selectedManager) fetchRides(selectedManager, filters, date, page);
}, [page]);


  // 🧹 Xoá lọc
  const clearFilters = () => {
    setFilters({
      tenLaiXe: "",
      maChuyen: "",
      khachHang: "",
      ngayBoc: "",
    });
    setDate(new Date());
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
  accountUsername:"",
  cuocPhiBoSung:""
};


  const handleAdd = () => {
    setEditRide(null);
    setShowModal(true);
  };

const [showEditRequestModal, setShowEditRequestModal] = useState(false);
const [editRequestRide, setEditRequestRide] = useState(null);

// Khi bấm chỉnh sửa chuyến → mở modal yêu cầu chỉnh sửa
const handleEdit = (ride) => {
  setEditRequestRide(ride);      // gán chuyến cần chỉnh sửa
  setShowEditRequestModal(true); // mở modal
};


  const handleSave = async (payload) => {
    try {
      if (editRide) {
        const res = await axios.put(`${API_URL}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) => prev.map((r) => (r._id === editRide ? res.data : r)));
      } else {
        const res = await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) => [...prev, res.data]);
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


  return (
    <div className="p-4 bg-gray-50 min-h-screen">
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
  className="bg-yellow-400 text-white px-3 py-1 rounded"
>
  Chỉnh sửa hồ sơ
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
          placeholder="Tên lái xe..."
          value={filters.tenLaiXe}
          onChange={(e) => setFilters((f) => ({ ...f, tenLaiXe: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Mã chuyến..."
          value={filters.maChuyen}
          onChange={(e) => setFilters((f) => ({ ...f, maChuyen: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Khách hàng..."
          value={filters.khachHang}
          onChange={(e) => setFilters((f) => ({ ...f, khachHang: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={filters.ngayBoc || ""}
          onChange={(e) => setFilters((f) => ({ ...f, ngayBoc: e.target.value }))}
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
        <button
          onClick={() => setShowExtra(!showExtra)}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          {showExtra ? "Ẩn bớt" : "Hiển thị đầy đủ"}
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table
          className={`border-collapse border w-full text-sm ${
            showExtra ? "min-w-[2400px]" : "min-w-[1200px]"
          }`}
        >
          <thead className="bg-blue-600 text-white">
            <tr>
              {mainColumns.map((col) => (
                <th key={col.key} className="border p-2">
                  {col.label}
                </th>
              ))}
              {showExtra &&
                extraColumns.map((col) => (
                  <th key={col.key} className="border p-2">
                    {col.label}
                  </th>
                ))}
              <th className="border p-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r) => (
              <tr key={r._id} className="text-center">
                {mainColumns.map((col) => (
                  <td key={col.key} className="border p-2">
  {["ngayBocHang", "ngayGiaoHang", "ngayBoc"].includes(col.key)
    ? formatDate(r[col.key])
    : col.key === "dieuVan"
    ? // Nếu r.dieuVan là ID, thì tìm tên trong danh sách managers
      managers.find((m) => m._id === r.dieuVanID)?.fullname ||
      managers.find((m) => m._id === r.dieuVanID)?.username ||
      r.dieuVan ||
      "-"
    : col.key === "createdBy"
    ? r.createdBy || "-"
    : r[col.key]}
</td>

                ))}
                {showExtra &&
                  extraColumns.map((col) => (
                    <td key={col.key} className="border p-2">
                      {r[col.key]}
                    </td>
                  ))}
                <td className="border p-2">
  <div className="flex justify-center items-center gap-2">
    {/* Sửa */}
    <button
      onClick={() => handleEdit(r)}
      className="text-blue-500 flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100"
      title="Chỉnh sửa"
    >
      <FaEdit />
    </button>

    {/* Xoá */}
    <button
      onClick={() => handleDelete(r._id)}
      className="text-red-500 flex items-center justify-center w-8 h-8 rounded hover:bg-red-100"
      title="Xoá"
    >
      <FaTrash />
    </button>

    {/* Lịch sử */}
    {editCounts[r._id] > 0 && (
      <div
        onClick={() => handleViewHistory(r)}
        className="relative cursor-pointer w-8 h-8 flex items-center justify-center rounded hover:bg-green-100"
        title="Lịch sử chỉnh sửa"
      >
        <FaHistory className="text-green-600 w-5 h-5" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
          {editCounts[r._id]}
        </span>
      </div>
    )}
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
    <option key={p} value={p}>{p}</option>
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
    vehicles={vehicles}
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
  ride={editRequestRide}          // chuyến cần chỉnh sửa
  currentUser={currentUser}
  dieuVanList={managers}
  drivers={drivers}
  customers={customers}
  vehicles={vehicles}
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
      alert("Không lưu được chuyến: " + (err.response?.data?.error || err.message));
    }
  }}
/>
      )}
      {showHistoryModal && historyRide && (
  <RideHistoryModal
    ride={historyRide}
    historyData={rideHistory}
    onClose={() => setShowHistoryModal(false)}
  />
      )}

    </div>
  );
}
