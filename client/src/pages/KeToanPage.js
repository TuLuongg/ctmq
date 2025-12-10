import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import ProfileModal from "../components/ProfileModal";
import API from "../api";

const KeToanPage = () => {
  const [filterType, setFilterType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [user, setUser] = useState(null);

  const navigate = useNavigate(); // 👈 khởi tạo navigate

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  // State quản lý user hiện tại, để live update avatar/tên
  const [currentUserState, setCurrentUserState] = useState(user || storedUser);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 👉 Hàm đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

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

  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVoucher = () => {
    navigate("/voucher-list", { state: { user } });
  };

  const handleExport = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");
    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      const response = await axios.get(`${API}/schedules/export`, {
        params: { ngay: formattedDate },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const [year, month, day] = formattedDate.split("-");
      const fileName = `lichtrinh_${day}_${month}_${year}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải file Excel:", error);
      alert("Không thể tải file Excel.");
    }
  };

  const handleFilterByDate = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");
    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      const response = await axios.get(
        `${API}/schedules?ngay=${formattedDate}`
      );
      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc dữ liệu:", err);
      alert("Không thể lấy dữ liệu theo ngày.");
    }
  };

  const handleDeleteByDate = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch trình ngày này?")
    )
      return;

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      await axios.delete(`${API}/schedules?ngay=${formattedDate}`);
      alert("Đã xóa thành công!");
      setFilteredData([]);
    } catch (err) {
      console.error("Lỗi khi xóa dữ liệu:", err);
      alert("Không thể xóa dữ liệu theo ngày.");
    }
  };

  const handleFilterByRange = async () => {
    if (!startDate || !endDate)
      return alert("Vui lòng chọn đủ ngày bắt đầu và kết thúc.");
    try {
      const from = new Date(startDate).toISOString().split("T")[0];
      const to = new Date(endDate).toISOString().split("T")[0];
      const response = await axios.get(
        `${API}/schedules/range?from=${from}&to=${to}`
      );
      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc theo khoảng ngày:", err);
      alert("Không thể lấy dữ liệu theo khoảng ngày.");
    }
  };

  const handleDeleteByRange = async () => {
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa toàn bộ lịch trình trong khoảng ngày này?"
      )
    )
      return;

    try {
      const from = new Date(startDate).toISOString().split("T")[0];
      const to = new Date(endDate).toISOString().split("T")[0];
      await axios.delete(`${API}/schedules/range?from=${from}&to=${to}`);
      alert("Đã xóa thành công!");
      setFilteredData([]);
    } catch (err) {
      console.error("Lỗi khi xóa dữ liệu theo khoảng ngày:", err);
      alert("Không thể xóa dữ liệu.");
    }
  };

  const handleExportByRange = async () => {
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");
    try {
      const from = new Date(startDate).toISOString().split("T")[0];
      const to = new Date(endDate).toISOString().split("T")[0];
      const response = await axios.get(
        `https://ctmq.onrender.com/schedules/export-range`,
        {
          params: { from, to },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `lichtrinh_tu_${from}_den_${to}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải file Excel theo khoảng ngày:", error);
      alert("Không thể tải file Excel.");
    }
  };

  return (
    <div className="p-4 text-xs">
      {/* Header hiển thị user và các nút */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">TRANG QUẢN LÝ CỦA KẾ TOÁN</h1>
        {user && (
          <div className="flex items-center gap-3">
            <img
              src={currentUserState.avatar || null}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="font-medium">
              Xin chào, {currentUserState.fullname}
            </span>

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
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center mb-4 mt-10">
        <button
          onClick={handleGoToDrivers}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Danh sách lái xe
        </button>
        <button
          onClick={handleGoToCustomers}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Danh sách khách hàng
        </button>
        <button
          onClick={handleGoToVehicles}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Danh sách xe
        </button>
        <button
          onClick={handleGoToTrips}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Danh sách chuyến phụ trách
        </button>
        <button
          onClick={() => {
            if (!storedUser?.permissions?.includes("edit_trip")) {
              alert("Bạn không có quyền truy cập!");
              return;
            }
            handleGoToAllTrips();
          }}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Tất cả các chuyến
        </button>

        <button
          onClick={handleGoToAllCustomers}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToCustomer26}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Công nợ khách lẻ
        </button>
        <button
          onClick={handleGoToVoucher}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Sổ phiếu chi
        </button>
      </div>

      {/* Bộ lọc ngày */}
      <div className="mb-4 mt-2">
        <span className="font-semibold mr-4">Chọn kiểu lọc:</span>
        <label className="mr-4">
          <input
            type="radio"
            name="filter"
            value="single"
            checked={filterType === "single"}
            onChange={() => setFilterType("single")}
          />{" "}
          Theo ngày
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            value="range"
            checked={filterType === "range"}
            onChange={() => setFilterType("range")}
          />{" "}
          Theo khoảng ngày
        </label>
      </div>

      {/* Hiển thị form lọc */}
      {filterType === "single" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <input
            type="date"
            className="border px-2 py-1 rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            onClick={handleFilterByDate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lọc theo ngày
          </button>
          <button
            onClick={handleDeleteByDate}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Xóa theo ngày
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Tải Excel
          </button>
        </div>
      )}

      {filterType === "range" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div>
            <label className="mr-2">Từ:</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mr-2">Đến:</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleFilterByRange}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lọc khoảng ngày
          </button>
          <button
            onClick={handleDeleteByRange}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Xóa khoảng ngày
          </button>
          <button
            onClick={handleExportByRange}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Tải Excel khoảng ngày
          </button>
        </div>
      )}

      {/* Hiển thị dữ liệu */}
      {filteredData.length > 0 && (
        <table className="w-full border text-sm mt-4">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-1">STT</th>
              <th className="border p-1">Tên lái xe</th>
              <th className="border p-1">Ngày đi</th>
              <th className="border p-1">Tổng tiền lịch trình</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={item._id}>
                <td className="border p-1 text-center">{index + 1}</td>
                <td className="border p-1">{item.tenLaiXe}</td>
                <td className="border p-1">
                  {new Date(item.ngayDi).toLocaleDateString("vi-VN")}
                </td>
                <td className="border p-1 text-right">
                  {item.tongTienLichTrinh || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default KeToanPage;
