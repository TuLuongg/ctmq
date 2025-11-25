import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaHistory } from "react-icons/fa";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

import RideEditModal from "../../components/RideEditModal";
import RideRequestListModal from "../../components/RideRequestListModal";

const API_URL = "http://localhost:4000/api/schedule-admin";
const USER_API = "http://localhost:4000/api/auth/dieu-van"; // API lấy danh sách điều vận

export default function ManageTrip({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]);
  const [today] = useState(new Date());
  const [date, setDate] = useState("");
  const [filters, setFilters] = useState({
    dieuVanID: "",
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    bienSoXe: "",
  });

  const [selectedTrips, setSelectedTrips] = useState([]); // các chuyến được chọn
  const [maHoaDonInput, setMaHoaDonInput] = useState(""); // mã hóa đơn nhập tay

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // -------------------------------------
  // CÁC CỘT CHÍNH + MỞ RỘNG → GỘP 1 LIST
  // -------------------------------------
  const allColumns = [
    { key: "ltState", label: "LT" },
    { key: "onlState", label: "ONL" },
    { key: "offState", label: "OFF" },
    { key: "dieuVan", label: "ĐIỀU VẬN" },
    { key: "createdBy", label: "NGƯỜI NHẬP" },
    { key: "ngayBoc", label: "NGÀY NHẬP" },
    { key: "tenLaiXe", label: "TÊN LÁI XE" },
    { key: "maKH", label: "MÃ KH" },
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
    { key: "khachHang", label: "KHÁCH HÀNG" },
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
  ];

  // CÁC CỘT HIỆN / ẨN
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key)
  );

  // WIDTH TỪNG CỘT (RESIZABLE)
  const [columnWidths, setColumnWidths] = useState(
    Object.fromEntries(allColumns.map((c) => [c.key, 80]))
  );

  const onResizeColumn = (key, newWidth) => {
    setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
  };


  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // 🔹 Lấy danh sách điều vận
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

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);


  // 🔹 Lấy tất cả chuyến (có filter)
  const fetchAllRides = async () => {
    try {
      const q = new URLSearchParams();
      q.append("page", page);
      q.append("limit", limit);

      if (filters.tenLaiXe) q.append("tenLaiXe", filters.tenLaiXe);
      if (filters.maChuyen) q.append("maChuyen", filters.maChuyen);
      if (filters.khachHang) q.append("khachHang", filters.khachHang);
      if (filters.bienSoXe) q.append("bienSoXe", filters.bienSoXe);
      if (filters.dieuVanID) q.append("dieuVanID", filters.dieuVanID);
      if (date) q.append("date", format(new Date(date), "yyyy-MM-dd"));

      const res = await axios.get(`${API_URL}/accountant?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRides(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
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
          maChuyenList: selectedTrips.map((id) => {
            const trip = rides.find((r) => r._id === id);
            return trip?.maChuyen;
          }).filter(Boolean),
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

  // Lọc chỉ các cột đang hiển thị
  const exportColumns = allColumns.filter(col =>
    visibleColumns.includes(col.key)
  );

  // Header hiển thị
  const headers = exportColumns.map(col => col.label);

  // Dữ liệu của từng dòng
  const data = rides.map(r => {
    const row = {};
    exportColumns.forEach(col => {
      if (col.key === "dieuVan") {
        row[col.key] = getFullName(r.dieuVanID);
      } else if (["ngayBoc", "ngayBocHang", "ngayGiaoHang"].includes(col.key)) {
        row[col.key] = formatDate(r[col.key]);
      } else {
        row[col.key] = r[col.key] ?? "";
      }
    });
    return row;
  });

  // Tạo sheet Excel
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: exportColumns.map(c => c.key),
  });

  // Thêm hàng tiêu đề lên trên
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

  // Tạo workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tổng hợp chuyến");

  // Xuất file
  saveAs(
    new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })]),
    `TongHop_${format(today, "ddMMyyyy_HHmm")}.xlsx`
  );
};


// Thêm state lưu tạm dữ liệu từ file
const [excelData, setExcelData] = useState([]);

// Khi chọn file, chỉ đọc vào state, chưa gửi lên server
const handleSelectExcel = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const updates = rows.map(row => ({
    maChuyen: row["MÃ CHUYẾN"],
    ltState: row["LT"] != null
      ? String(row["LT"])
      : "",
    onlState: row["ONL"] != null
      ? String(row["ONL"])
      : "",
    offState: row["OFF"] != null
      ? String(row["OFF"])
      : "",
    cuocPhiBS: row["CƯỚC PHÍ"] != null
      ? String(row["CƯỚC PHÍ"])
      : "0",
    daThanhToan: row["ĐÃ THANH TOÁN"] != null
      ? String(row["ĐÃ THANH TOÁN"])
      : "0",
    bocXepBS: row["BỐC XẾP"] != null
      ? String(row["BỐC XẾP"])
      : "0",
    veBS: row["VÉ"] != null
      ? String(row["VÉ"])
      : "0",
    hangVeBS: row["HÀNG VỀ"] != null
      ? String(row["HÀNG VỀ"])
      : "0",
    luuCaBS: row["LƯU CA"] != null
      ? String(row["LƯU CA"])
      : "0",
    cpKhacBS: row["LUẬT CP KHÁC"] != null
      ? String(row["LUẬT CP KHÁC"])
      : "0",
  })).filter(r => r.maChuyen);

  setExcelData(updates);
};

// Khi bấm nút "Bổ sung cước phí", gửi data lên server
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
    document.getElementById("excelInput").value = ""; // reset input file
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

    return true;    // 🔥 QUAN TRỌNG
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
    const res = await axios.get(
      `${API_URL}/my-requests`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

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



  return (
    <div className="p-4 bg-gray-50 min-h-screen">
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
      <div className="flex flex-wrap gap-2 mb-3 items-center w-full justify-start">
        <select
          value={filters.dieuVanID}
          onChange={(e) => setFilters({ ...filters, dieuVanID: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="">-- Lọc theo điều vận --</option>
          {managers.map((m) => (
            <option key={m._id} value={m._id}>{m.fullname}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tên lái xe"
          value={filters.tenLaiXe}
          onChange={(e) => setFilters({ ...filters, tenLaiXe: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Mã chuyến"
          value={filters.maChuyen}
          onChange={(e) => setFilters({ ...filters, maChuyen: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Khách hàng"
          value={filters.khachHang}
          onChange={(e) => setFilters({ ...filters, khachHang: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Biển số xe"
          value={filters.bienSoXe}
          onChange={(e) => setFilters({ ...filters, bienSoXe: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={date ? format(new Date(date), "yyyy-MM-dd") : ""}
          onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : "")}
          className="border rounded px-3 py-2"
        />
        <button
          onClick={() => {
            setFilters({
              dieuVanID: "",
              tenLaiXe: "",
              maChuyen: "",
              khachHang: "",
              bienSoXe: "",
            });
            setDate("");
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm"
        >
          Xóa lọc
        </button>

        <button
          onClick={() => navigate(-1)}
          className="ml-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          ← Quay lại
        </button>
      </div>

      {/* Nút hành động */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button
  onClick={openMyRequests}
  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
>
Yêu cầu của tôi
</button>

        <button
          onClick={exportToExcel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          Xuất Excel
        </button>

        <div className="flex gap-2 items-center">
  <input
    type="file"
    accept=".xlsx,.xls"
    id="excelInput"
    onChange={handleSelectExcel}
    className="border rounded px-3 py-2"
  />
  <button
    onClick={handleAddCuocPhiBoSung}
    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
  >
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
        <button
          onClick={updateMaHoaDon}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Cập nhật mã hóa đơn
        </button>
        <span className="text-sm text-gray-600">
          Đã chọn {selectedTrips.length} chuyến{selectedTrips.length > 0 &&
    `: ${selectedTrips
      .map((id) => rides.find((r) => r._id === id)?.maChuyen)
      .filter(Boolean)
      .join(", ")}`}
        </span>
      </div>

      {/* UI CHỌN HIỆN / ẨN CỘT */}
      <div className="flex flex-wrap gap-2 mb-3 border p-2 bg-white rounded">
        {allColumns.map((col) => (
          <label key={col.key} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.includes(col.key)}
              onChange={() =>
                setVisibleColumns((prev) =>
                  prev.includes(col.key)
                    ? prev.filter((k) => k !== col.key)
                    : [...prev, col.key]
                )
              }
            />
            {col.label}
          </label>
        ))}
      </div>

      {/* BẢNG */}
      <div className="overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <table className="border-collapse border text-sm" style={{ tableLayout: "fixed", minWidth: "max-content" }}>
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="border p-2 bg-blue-600 text-white"></th>

              {/* Checkbox chọn tất cả */}
              <th className="border p-2" style={{ width: "8px", minWidth: "8px", maxWidth: "8px" }}>
                <input
                  type="checkbox"
                  style={{ width: "100%", height: "100%" }}
                  checked={
                    selectedTrips.length === rides.length && rides.length > 0
                  }
                  onChange={(e) =>
                    setSelectedTrips(
                      e.target.checked ? rides.map((r) => r._id) : []
                    )
                  }
                />
              </th>

              {/* Render cột */}
{allColumns
      .filter((c) => visibleColumns.includes(c.key))
      .map((col) => (
        <th
          key={col.key}
          className="border p-0 relative"
          style={{
            width: columnWidths[col.key],
            maxWidth: columnWidths[col.key],
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            position: "relative",
          }}
        >
          {/* Nội dung tiêu đề */}
          <div className="p-2 bg-blue-600 text-white whitespace-nowrap select-none overflow-hidden">
            {col.label}
          </div>

          {/* Handle kéo resize */}
          <ResizableBox
            width={columnWidths[col.key]}
            height={0}
            axis="x"
            resizeHandles={["e"]}
            minConstraints={[20, 0]}
            maxConstraints={[600, 0]}
            onResize={(e, data) => onResizeColumn(col.key, data.size.width)}
            style={{
              position: "absolute",
              right: 2,
              top: 10,
              height: "100%",
              width: "6px",
              cursor: "col-resize",
              background: "transparent",
            }}
          />
        </th>
      ))}
            </tr>
          </thead>

          <tbody>
            {rides.map((r) => (
              <tr key={r._id} className="text-center">
                <td className="border p-2">
  <button
    onClick={() => openEditRide(r)}
    className="px-1 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-600"
  >
    <FaEdit />
  </button>
</td>

                {/* Checkbox chọn dòng */}
                <td className="border p-2">
                  <input
                    type="checkbox"
                    checked={selectedTrips.includes(r._id)}
                    onChange={() => toggleSelectTrip(r._id)}
                  />
                </td>

                {/* Render dữ liệu */}
                {allColumns
                  .filter((c) => visibleColumns.includes(c.key))
                  .map((col) => (
                    <td
                      key={col.key}
                      className="border p-2"
                      style={{
                        width: columnWidths[col.key],
                        maxWidth: columnWidths[col.key],
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {["ngayBocHang", "ngayGiaoHang", "ngayBoc"].includes(
                        col.key
                      )
                        ? formatDate(r[col.key])
                        : col.key === "dieuVan"
                        ? getFullName(r.dieuVanID)
                        : r[col.key] ?? ""}
                    </td>
                  ))}
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

      <div className="mt-3 text-right font-semibold text-gray-700">
        Tổng số chuyến hiển thị: {rides.length.toLocaleString()}
      </div>

{showEditModal && (
  <RideEditModal
    ride={editingRide}
    allColumns={allColumns}
    onSubmit={submitEditRequest}
    onClose={() => setShowEditModal(false)}
  />
)}

<RideRequestListModal
  open={showMyRequestModal}
  onClose={() => setShowMyRequestModal(false)}
  requests={myRequests}
  title="📌 Yêu cầu chỉnh sửa của tôi"
/>

    </div>
  );
}
