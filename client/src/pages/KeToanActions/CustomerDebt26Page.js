import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import API from "../../api";
import TripPaymentModal from "../../components/TripPaymentModal";
import "./CustomerDebt26Page.css"; // tạo CSS cho resize và overflow

export default function CustomerDebt26Page() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // cấu hình cột (key, label, width, visible)
  const defaultColumns = [
    { key: "tenLaiXe", label: "Tên lái xe", width: 120, visible: true },
    { key: "maChuyen", label: "Mã chuyến", width: 100, visible: true },
    { key: "dienGiai", label: "Diễn giải", width: 150, visible: true },
    { key: "ngayBocHang", label: "Ngày đóng", width: 100, visible: true },
    { key: "ngayGiaoHang", label: "Ngày giao", width: 100, visible: true },
    { key: "diemDoHang", label: "Điểm đóng", width: 100, visible: true },
    { key: "diemXepHang", label: "Điểm giao", width: 100, visible: true },
    { key: "soDiem", label: "Số điểm", width: 80, visible: true },
    { key: "trongLuong", label: "Trọng lượng", width: 100, visible: true },
    { key: "bienSoXe", label: "Biển số", width: 100, visible: true },
    { key: "tongTien", label: "Tổng tiền", width: 120, visible: true },
    { key: "daThanhToan", label: "Đã thanh toán", width: 120, visible: true },
    { key: "conLai", label: "Còn lại", width: 120, visible: true },
    { key: "trangThai", label: "Trạng thái", width: 100, visible: true },
    { key: "ngayCK", label: "Ngày CK", width: 100, visible: true },
    { key: "taiKhoanCK", label: "Tài khoản", width: 120, visible: true },
    { key: "noiDungCK", label: "Nội dung CK", width: 200, visible: true },
  ];

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("customer26_columns");
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  const saveColumns = (cols) => {
    setColumns(cols);
    localStorage.setItem("customer26_columns", JSON.stringify(cols));
  };

  const navigate = useNavigate();
  const location = useLocation();
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const isActive = (path) => location.pathname === path;

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

  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  const loadData = async () => {
    try {
      const res = await axios.get(
        `${API}/payment-history/customer26/debt?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const list = res.data?.chiTietChuyen || [];
      const mapped = list.map((c) => ({
        ...c.thongTinChuyen,
        tongTien: c.tongTien,
        daThanhToan: c.daThanhToan,
        conLai: c.conLai,
        ngayCK: c.ngayCK,
        taiKhoanCK: c.taiKhoanCK,
        noiDungCK: c.noiDungCK,
        trangThai: c.conLai === 0 ? "green" : "red",
      }));
      setTrips(mapped);
    } catch (err) {
      console.error(err);
      setTrips([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const toggleColumn = (key) => {
    const newCols = columns.map((c) =>
      c.key === key ? { ...c, visible: !c.visible } : c
    );
    saveColumns(newCols);
  };

  const renderStatus = (t) => {
    let color = "#ff3333";
    let label = "Chưa trả";

    const tongTien = t.tongTien || 0;
    const conLai = t.conLai || 0;

    if (conLai === 0) {
      color = "#00cc44";
      label = "Hoàn tất";
    } else {
      const tiLe = tongTien === 0 ? 0 : conLai / tongTien;
      if (tiLe <= 0.2) {
        color = "#ffcc00";
        label = "Còn ít";
      } else {
        color = "#ff3333";
        label = "Chưa trả";
      }
    }

    return (
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setSelectedTrip(t)}
      >
        <span
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: color,
          }}
        />
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className="p-4 text-xs">
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
            if (!user?.permissions?.includes("edit_trip")) {
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
      </div>
      <h1 className="text-xl font-bold mb-4">CÔNG NỢ KHÁCH LẺ (MÃ 26)</h1>

      {/* Bộ lọc */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <label>Tháng: </label>
          <select
            className="border p-1"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Năm: </label>
          <input
            type="number"
            className="border p-1 w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Lọc
        </button>
      </div>

      {/* Toggle ẩn/hiện cột */}
      <div className="mb-2 flex flex-wrap gap-2">
        {columns.map((c) => (
          <label key={c.key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={c.visible}
              onChange={() => toggleColumn(c.key)}
            />
            {c.label}
          </label>
        ))}
      </div>

      {/* Bảng */}
      {/* Bảng */}
      <div className="overflow-auto max-h-[600px] border">
        <table className="border table-auto min-w-max w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th
                    key={col.key}
                    className="border p-2 sticky top-0 bg-gray-100 z-10"
                    style={{ width: col.width, minWidth: 50 }}
                  >
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t._id} className="h-[50px]">
                {columns
                  .filter((c) => c.visible)
                  .map((col) => {
                    let value = t[col.key];
                    if (
                      col.key === "ngayBocHang" ||
                      col.key === "ngayGiaoHang" ||
                      col.key === "ngayCK"
                    ) {
                      value = value
                        ? format(new Date(value), "dd/MM/yyyy")
                        : "";
                    }
                    if (
                      col.key === "tongTien" ||
                      col.key === "daThanhToan" ||
                      col.key === "conLai"
                    ) {
                      value = value?.toLocaleString();
                    }
                    if (col.key === "trangThai") {
                      return (
                        <td key={col.key} className="border p-1 text-center">
                          {renderStatus(t)}
                        </td>
                      );
                    }
                    if (col.key === "taiKhoanCK") {
                      const methodMap = {
                        CaNhan: "Cá Nhân",
                        VCB: "VCB Công ty",
                        TCB: "TCB Công ty",
                      };
                      value = methodMap[value] || value;
                    }
                    return (
                      <td key={col.key} className="border p-1">
                        {value}
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTrip && (
        <TripPaymentModal
          maChuyenCode={selectedTrip.maChuyen}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}
