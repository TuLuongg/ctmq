import { useState, useEffect } from "react";
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
    .replace(/[\u0300-\u036f]/g, "")
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
    setFilters({
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
  const handleMouseDown = (e, key) => {
    const startX = e.clientX;
    const startWidth = columnWidths[key];

    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      setColumnWidths((prev) => ({ ...prev, [key]: Math.max(newWidth, 50) }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const formatMoney = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("vi-VN"); // 👉 Tự động thành 100.000 – 1.200.000
  };

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
        <button
          onClick={() => setShowExtra(!showExtra)}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          {showExtra ? "Ẩn bớt" : "Hiển thị đầy đủ"}
        </button>
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          {showColumnSelector ? "Đóng tuỳ chọn cột" : "Tuỳ chọn cột"}
        </button>
      </div>

      {showColumnSelector && (
        <div className="mb-2 flex flex-wrap gap-2 border p-2 rounded bg-gray-100">
          {allColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
            >
              <input
                type="checkbox"
                checked={visibleColumns[col.key] ?? true}
                onChange={() =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    [col.key]: !prev[col.key],
                  }))
                }
              />
              {col.label}
            </label>
          ))}
        </div>
      )}

      {/* Container scroll cả ngang và dọc */}
      <div className="border rounded shadow-lg h-[600px] overflow-auto">
        <table className={`border-collapse border w-max text-xs`}>
          <thead className="bg-blue-600 text-white sticky top-0 z-20">
            <tr>
              {mainColumns.map((col) => (
                <th
                  key={col.key}
                  className="border p-2 text-center relative"
                  style={{ width: columnWidths[col.key] }}
                >
                  {col.label}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-10"
                  ></div>
                </th>
              ))}
              {showExtra &&
                extraColumns.map(
                  (col) =>
                    visibleColumns[col.key] !== false && (
                      <th
                        key={col.key}
                        className="border p-2 text-center relative"
                        style={{ width: columnWidths[col.key] }}
                      >
                        {col.label}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, col.key)}
                          className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-10"
                        ></div>
                      </th>
                    )
                )}
              <th className="border p-2 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rides
              .filter((r) => {
                const search = filters.khachHang?.trim();
                if (!search) return true;

                const input = removeVietnamese(search.toLowerCase());
                const data = removeVietnamese(
                  (r.khachHang || "").toLowerCase()
                );

                return data.includes(input);
              })
              .map((r) => (
                <tr key={r._id} className="text-center h-[30px]">
                  {mainColumns.map((col) => (
                    <td
                      key={col.key}
                      className="border p-2 h-[30px] overflow-hidden"
                    >
                      {["ngayBocHang", "ngayGiaoHang", "ngayBoc"].includes(
                        col.key
                      )
                        ? formatDate(r[col.key])
                        : col.key === "dieuVan"
                        ? managers.find((m) => m._id === r.dieuVanID)
                            ?.fullname ||
                          managers.find((m) => m._id === r.dieuVanID)
                            ?.username ||
                          r.dieuVan ||
                          "-"
                        : r[col.key]}
                    </td>
                  ))}
                  {showExtra &&
                    extraColumns.map(
                      (col) =>
                        visibleColumns[col.key] !== false && (
                          <td
                            key={col.key}
                            className="border p-2 h-[30px] overflow-hidden"
                          >
                            {[
                              "cuocPhi",
                              "laiXeThuCuoc",
                              "bocXep",
                              "ve",
                              "hangVe",
                              "luuCa",
                              "luatChiPhiKhac",
                              "cuocPhiBoSung",
                            ].includes(col.key)
                              ? formatMoney(r[col.key])
                              : r[col.key]}
                          </td>
                        )
                    )}
                  <td className="border p-2 h-[30px]">
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
