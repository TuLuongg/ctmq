import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaEdit, FaTrash, FaHistory } from "react-icons/fa";
import RideModal from "../../components/RideModal";
import RideHistoryModal from "../../components/RideHistoryModal"

const API_URL = "https://ctmq.onrender.com/api/schedule-admin";
const USER_API = "https://ctmq.onrender.com/api/auth/dieu-van";
const API = "https://ctmq.onrender.com/api";

export default function ManageTripAdmin({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");

  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]);
  const [filters, setFilters] = useState({
    dieuVanID: "",
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    bienSoXe: "",
  });   
  const [date, setDate] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editRide, setEditRide] = useState(null);
  const [today] = useState(new Date());

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

  const mainColumns = [
    { key: "dieuVan", label: "ĐIỀU VẬN" },
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

  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // Fetch managers
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

  // Fetch all rides
  const fetchAllRides = async () => {
    try {
      const q = new URLSearchParams();
      if (filters.tenLaiXe) q.append("tenLaiXe", filters.tenLaiXe);
      if (filters.maChuyen) q.append("maChuyen", filters.maChuyen);
      if (filters.khachHang) q.append("khachHang", filters.khachHang);
      if (filters.bienSoXe) q.append("bienSoXe", filters.bienSoXe);
      if (filters.dieuVanID) q.append("dieuVanID", filters.dieuVanID);
      if (date) q.append("date", format(new Date(date), "yyyy-MM-dd"));

      const res = await axios.get(`${API_URL}/all?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRides(res.data || []);
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
  }, [filters, date]);

  const getFullName = (id) => {
    const found = managers.find((m) => m._id === id);
    return found ? found.fullname : id;
  };

  const clearFilters = () => {
    setFilters({
      dieuVanID: "",
      tenLaiXe: "",
      maChuyen: "",
      khachHang: "",
      bienSoXe: "",
    });
    setDate("");
  };

  const emptyForm = {
    dieuVanID: currentUser._id,
    createdBy: currentUser.fullname,
    tenLaiXe: "",
    khachHang: "",
    dienGiai: "",
    ngayBocHang: format(today, "yyyy-MM-dd"),
    ngayGiaoHang: format(today, "yyyy-MM-dd"),
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
    ngayBoc: format(today, "yyyy-MM-dd"),
    keToanPhuTrach: "",
  };

  const handleAdd = () => {
    setEditRide(null);
    setShowModal(true);
  };

  const handleEdit = (ride) => {
    setEditRide(ride._id);
    setShowModal(true);
  };

  const handleSave = async (payload) => {
    try {
      if (editRide) {
        const res = await axios.put(`${API_URL}/${editRide}`, payload, {
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

const exportToExcel = () => {
  if (!rides.length) return alert("Không có dữ liệu để xuất Excel!");

  // 1️⃣ Tạo danh sách tất cả cột dựa trên showExtra
  const allColumns = [...mainColumns, ...(showExtra ? extraColumns : [])];

  // 2️⃣ Tạo header hiển thị (label)
  const headers = allColumns.map(c => c.label);

  // 3️⃣ Tạo dữ liệu
  const data = rides.map(r => {
    const row = {};
    allColumns.forEach(col => {
      // Xử lý các trường đặc biệt
      if (col.key === "dieuVan") row[col.key] = getFullName(r.dieuVanID);
      else if (["ngayBoc", "ngayBocHang", "ngayGiaoHang"].includes(col.key)) row[col.key] = formatDate(r[col.key]);
      else row[col.key] = r[col.key] || "";
    });
    return row;
  });

  // 4️⃣ Chuyển JSON → Sheet
  const worksheet = XLSX.utils.json_to_sheet(data, { header: allColumns.map(c => c.key) });

  // 5️⃣ Gắn header (label) lên đầu sheet
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

  // 6️⃣ Tạo workbook và append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tổng hợp chuyến");

  // 7️⃣ Lưu file
  saveAs(
    new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })]),
    `TongHop_${format(today, "ddMMyyyy_HHmm")}.xlsx`
  );
};

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
        <h1 className="text-xl font-bold">TỔNG HỢP TẤT CẢ CÁC CHUYẾN</h1>
        <div className="flex gap-4 items-center">
          <span>Giám đốc: {currentUser.fullname || currentUser.username}</span>
          <span className="font-semibold text-blue-600">Hôm nay: {format(today,"dd/MM/yyyy")}</span>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-2 mb-3 items-center w-full justify-start">
        <select
          value={filters.dieuVanID}
          onChange={(e) => setFilters({ ...filters, dieuVanID: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="">-- Lọc theo điều vận --</option>
          {managers.map((m) => <option key={m._id} value={m._id}>{m.fullname}</option>)}
        </select>

        <input type="text" placeholder="Tên lái xe" value={filters.tenLaiXe} onChange={(e)=>setFilters({...filters, tenLaiXe:e.target.value})} className="border rounded px-3 py-2" />
        <input type="text" placeholder="Mã chuyến" value={filters.maChuyen} onChange={(e)=>setFilters({...filters, maChuyen:e.target.value})} className="border rounded px-3 py-2" />
        <input type="text" placeholder="Khách hàng" value={filters.khachHang} onChange={(e)=>setFilters({...filters, khachHang:e.target.value})} className="border rounded px-3 py-2" />
        <input type="text" placeholder="Biển số xe" value={filters.bienSoXe} onChange={(e)=>setFilters({...filters, bienSoXe:e.target.value})} className="border rounded px-3 py-2" />
        <input type="date" value={date ? format(new Date(date),"yyyy-MM-dd"):""} onChange={(e)=>setDate(e.target.value?new Date(e.target.value):"")} className="border rounded px-3 py-2" />

        <button onClick={clearFilters} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm">Xóa lọc</button>
        <button onClick={()=>navigate(-1)} className="ml-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">← Quay lại</button>
      </div>

      {/* Nút thêm / hiển thị đầy đủ */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button onClick={handleAdd} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">+ Thêm chuyến</button>
        <button onClick={()=>setShowExtra(s=>!s)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg">{showExtra ? "Ẩn bớt" : "Hiển thị đầy đủ"}</button>
        <button onClick={exportToExcel} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm">📥 Xuất Excel</button>
      </div>

      {/* Bảng */}
      <div className="overflow-x-auto">
        <table className={`border-collapse border w-full text-sm ${showExtra?"min-w-[2400px]":"min-w-[1200px]"}`}>
          <thead className="bg-blue-600 text-white">
            <tr>
              {mainColumns.map((col)=><th key={col.key} className="border p-2">{col.label}</th>)}
              {showExtra && extraColumns.map((col)=><th key={col.key} className="border p-2">{col.label}</th>)}
              <th className="border p-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r)=>(
              <tr key={r._id} className="text-center">
                {mainColumns.map((col)=>(
                  <td key={col.key} className="border p-2">
                    {["ngayBocHang","ngayGiaoHang","ngayBoc"].includes(col.key)?formatDate(r[col.key])
                    : col.key==="dieuVan"?getFullName(r.dieuVanID)
                    : r[col.key]||"-"}
                  </td>
                ))}
                {showExtra && extraColumns.map((col)=><td key={col.key} className="border p-2">{r[col.key]||""}</td>)}
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

      {/* Modal thêm/sửa */}
      {showModal && (
        <RideModal
          key={editRide || "new"}
          initialData={editRide ? rides.find(r=>r._id===editRide) : emptyForm}
          onClose={()=>{setShowModal(false); setEditRide(null);}}
          onSave={handleSave}
          dieuVanList={managers}
          currentUser={currentUser}
          drivers = {drivers}
          customers = {customers}
          vehicles = {vehicles}
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
