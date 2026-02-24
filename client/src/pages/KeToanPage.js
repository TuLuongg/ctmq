import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import ProfileModal from "../components/ProfileModal";
import API from "../api";

const normalizeText = (str = "") =>
  str
    .toString()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const KeToanPage = () => {
  const [filterType, setFilterType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [user, setUser] = useState(null);
  const [activeRows, setActiveRows] = useState([]);
  const [searchDriver, setSearchDriver] = useState("");
  const [dateMode, setDateMode] = useState("ngayDi");
  // "ngayDi" | "createdAt"

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

  const handleGoToCostManagement = () => {
    navigate("/cost-management", { state: { user } });
  };

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };
  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  const handleGoToAddress = () => {
    navigate("/address", { state: { user } });
  };

  const handleGoToCustomer2 = () => {
    navigate("/customer2", { state: { user } });
  };

  const handleExport = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const url =
        dateMode === "createdAt"
          ? `${API}/schedules/export-by-created-date`
          : `${API}/schedules/export`;

      const response = await axios.get(url, {
        params: { ngay: formattedDate },
        responseType: "blob",
      });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = urlBlob;

      const [year, month, day] = formattedDate.split("-");
      const fileName =
        dateMode === "createdAt"
          ? `lichtrinh_ngaytao_${day}_${month}_${year}.xlsx`
          : `lichtrinh_${day}_${month}_${year}.xlsx`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải Excel:", error);
      alert("Không thể tải file Excel.");
    }
  };

  const handleFilterByDate = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const url =
        dateMode === "createdAt"
          ? `${API}/schedules/by-created-date`
          : `${API}/schedules`;

      const response = await axios.get(url, {
        params: { ngay: formattedDate },
      });

      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc dữ liệu:", err);
      alert("Không thể lấy dữ liệu.");
    }
  };

  const handleDeleteByDate = async () => {
    if (dateMode === "createdAt") {
      alert("Chỉ xoá được khi lọc theo Ngày đi.");
      return;
    }
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
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");

    try {
      let from, to;

      if (dateMode === "createdAt") {
        from = startDate; // có cả giờ
        to = endDate;
      } else {
        from = new Date(startDate).toISOString().split("T")[0];
        to = new Date(endDate).toISOString().split("T")[0];
      }

      const url =
        dateMode === "createdAt"
          ? `${API}/schedules/by-created-range`
          : `${API}/schedules/range`;

      const response = await axios.get(url, {
        params: { from, to },
      });

      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc theo khoảng ngày:", err);
      alert("Không thể lấy dữ liệu.");
    }
  };

  const handleDeleteByRange = async () => {
    if (dateMode === "createdAt") {
      alert("Chỉ xoá được khi lọc theo Ngày đi.");
      return;
    }
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa toàn bộ lịch trình trong khoảng ngày này?",
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
      let from, to;

      if (dateMode === "createdAt") {
        from = startDate; // có cả giờ
        to = endDate;
      } else {
        from = new Date(startDate).toISOString().split("T")[0];
        to = new Date(endDate).toISOString().split("T")[0];
      }

      const url =
        dateMode === "createdAt"
          ? `${API}/schedules/export-by-created-range`
          : `${API}/schedules/export-range`;

      const response = await axios.get(url, {
        params: { from, to },
        responseType: "blob",
      });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = urlBlob;

      const fileName =
        dateMode === "createdAt"
          ? `lichtrinh_ngaytao_tu_${from}_den_${to}.xlsx`
          : `lichtrinh_tu_${from}_den_${to}.xlsx`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải Excel theo khoảng ngày:", error);
      alert("Không thể tải file Excel.");
    }
  };

  const isActiveRow = (scheduleId, rowIndex) =>
    activeRows.some(
      (r) => r.scheduleId === scheduleId && r.rowIndex === rowIndex,
    );

  const isActiveSchedule = (scheduleId) =>
    activeRows.some((r) => r.scheduleId === scheduleId);

  const keyword = normalizeText(searchDriver);

  const displayedData = filteredData.filter((schedule) => {
    if (!keyword) return true;

    // 1️⃣ match theo tên lái xe
    const matchDriver = normalizeText(schedule.tenLaiXe).includes(keyword);

    // 2️⃣ match theo mã lịch trình (duyệt từng row)
    const matchMaLT = schedule.rows?.some((row) =>
      normalizeText(row.maLichTrinh).includes(keyword),
    );

    return matchDriver || matchMaLT;
  });

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
        <button
          onClick={handleGoToContract}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          TCB cá nhân
        </button>
        <button
          onClick={handleGoToAddress}
          className="bg-purple-500 text-white px-3 py-1 rounded"
        >
          Địa chỉ
        </button>
        <button
          onClick={handleGoToCustomer2}
          className="bg-purple-500 text-white px-3 py-1 rounded"
        >
          KH điểm giao
        </button>

        <button
          onClick={handleGoToCostManagement}
          className="ml-auto bg-blue-500 text-white px-3 py-1 rounded"
        >
          Các mục chi phí
        </button>
      </div>

      {/* Bộ lọc ngày */}
      <div className="flex flex-wrap items-center gap-6 mb-4 mt-2">
        {/* Chọn kiểu lọc ngày */}
        <div className="flex items-center gap-2">
          <span className="font-semibold">Lọc theo:</span>
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="ngayDi">Ngày đi</option>
            <option value="createdAt">Ngày tạo</option>
          </select>
        </div>

        {/* Kiểu lọc */}
        <div className="flex items-center gap-4">
          <span className="font-semibold">Kiểu:</span>

          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="filter"
              value="single"
              checked={filterType === "single"}
              onChange={() => setFilterType("single")}
            />
            Theo ngày
          </label>

          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="filter"
              value="range"
              checked={filterType === "range"}
              onChange={() => setFilterType("range")}
            />
            Theo khoảng
          </label>
        </div>
      </div>

      {/* Hiển thị form lọc */}
      {filterType === "single" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <input
            type="date"
            className="border px-2 py-1 rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClick={(e) => e.target.showPicker()}
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
              type={dateMode === "createdAt" ? "datetime-local" : "date"}
              className="border px-2 py-1 rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => e.target.showPicker()}
            />
          </div>
          <div>
            <label className="mr-2">Đến:</label>
            <input
              type={dateMode === "createdAt" ? "datetime-local" : "date"}
              className="border px-2 py-1 rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => e.target.showPicker()}
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

      <div className="mb-3 flex items-center gap-2">
        <span className="font-semibold">Lọc:</span>
        <input
          type="text"
          value={searchDriver}
          onChange={(e) => setSearchDriver(e.target.value)}
          placeholder="Nhập tên lái xe hoặc mã lịch trình..."
          className="border px-2 py-1 rounded w-64"
        />
      </div>

      {/* Hiển thị dữ liệu */}
      {filteredData.length > 0 && (
        <div className="max-h-[700px] overflow-y-auto border">
          <table className="w-full border text-xs border-separate border-spacing-0">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  STT
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Tên lái xe
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Ngày đi
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Ngày về
                </th>

                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Biển số
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Khách hàng
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Giấy tờ
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Nơi đi
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Nơi đến
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  TL hàng
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Số điểm
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  2 chiều + lưu ca
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">Ăn</th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Tăng ca
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Bốc xếp
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">Vé</th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Tiền chuyến
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Chi phí khác
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  LX thu KH
                </th>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Phương án
                </th>

                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Tổng tiền LT
                </th>

                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  Mã LT
                </th>
              </tr>
            </thead>

            <tbody>
              {displayedData.map((schedule, scheduleIndex) =>
                schedule.rows.map((row, rowIndex) => (
                  <tr
                    key={`${schedule._id}-${rowIndex}`}
                    onClick={() =>
                      setActiveRows((prev) => {
                        const existed = prev.some(
                          (r) =>
                            r.scheduleId === schedule._id &&
                            r.rowIndex === rowIndex,
                        );

                        if (existed) {
                          // ❌ đã tồn tại → bỏ highlight
                          return prev.filter(
                            (r) =>
                              !(
                                r.scheduleId === schedule._id &&
                                r.rowIndex === rowIndex
                              ),
                          );
                        }

                        // ✅ chưa có → thêm
                        return [
                          ...prev,
                          { scheduleId: schedule._id, rowIndex },
                        ];
                      })
                    }
                    className={`cursor-pointer ${
                      isActiveRow(schedule._id, rowIndex)
                        ? "bg-yellow-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {/* STT + field chung – chỉ render 1 lần */}
                    {rowIndex === 0 && (
                      <>
                        <td
                          className={`border p-1 text-center ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {scheduleIndex + 1}
                        </td>
                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.tenLaiXe}
                        </td>

                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.ngayDi
                            ?.slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </td>

                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.ngayVe
                            ?.slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </td>
                      </>
                    )}

                    {/* FIELD THEO ROW */}
                    <td className="border p-1">{row.bienSoXe}</td>
                    <td className="border p-1">{row.tenKhachHang}</td>
                    <td className="border p-1">{row.giayTo}</td>
                    <td className="border p-1">{row.noiDi}</td>
                    <td className="border p-1">{row.noiDen}</td>
                    <td className="border p-1 text-right">
                      {row.trongLuongHang}
                    </td>
                    <td className="border p-1 text-center">{row.soDiem}</td>
                    <td className="border p-1">{row.haiChieuVaLuuCa}</td>
                    <td className="border p-1 text-right">{row.an}</td>
                    <td className="border p-1 text-right">{row.tangCa}</td>
                    <td className="border p-1 text-right">{row.bocXep}</td>
                    <td className="border p-1 text-right">{row.ve}</td>
                    <td className="border p-1 text-right">{row.tienChuyen}</td>
                    <td className="border p-1 text-right">{row.chiPhiKhac}</td>
                    <td className="border p-1">{row.laiXeThuKhach}</td>
                    <td className="border p-1">
                      {row.phuongAn === "daChuyenKhoan"
                        ? "Đã CK"
                        : row.phuongAn === "truVaoTongLichTrinh"
                          ? "Trừ tổng"
                          : ""}
                    </td>

                    {/* Tổng tiền – chỉ 1 lần */}
                    {rowIndex === 0 && (
                      <td
                        className={`border p-1 text-right text-blue-600 font-bold ${
                          isActiveSchedule(schedule._id) ? "bg-yellow-100" : ""
                        }`}
                        rowSpan={schedule.rows.length}
                      >
                        {schedule.tongTienLichTrinh} k
                      </td>
                    )}
                    <td className="border p-1">{row.maLichTrinh}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
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
