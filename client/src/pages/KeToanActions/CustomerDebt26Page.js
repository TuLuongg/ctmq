import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import API from "../../api";
import TripPaymentModal from "../../components/TripPaymentModal";
import "./CustomerDebt26Page.css"; // tạo CSS cho resize và overflow

const removeVietnameseTones = (str = "") => {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

const DATE_COLUMNS = ["ngayBocHang", "ngayGiaoHang", "ngayCK"];


export default function CustomerDebt26Page() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const getFirstDayOfMonth = () => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  };

  const getLastDayOfMonth = () => {
    const now = new Date();
    return format(
      new Date(now.getFullYear(), now.getMonth() + 1, 0),
      "yyyy-MM-dd"
    );
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());

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
    { key: "maKH", label: "Mã KH", width: 100, visible: true },
    { key: "khachHang", label: "Tên KH", width: 100, visible: true },
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

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (loading) return; // ⛔ chặn spam nút

    setLoading(true); // 🔵 khóa nút
    try {
      const res = await axios.get(
        `${API}/payment-history/customer26/debt?startDate=${startDate}&endDate=${endDate}`,
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
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

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

  const [resizing, setResizing] = useState(null);
  // { key, startX, startWidth }
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizing) return;

      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(10, resizing.startWidth + delta);

      saveColumns(
        columns.map((c) =>
          c.key === resizing.key ? { ...c, width: newWidth } : c
        )
      );
    };

    const handleMouseUp = () => setResizing(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, columns]);

  const [dragCol, setDragCol] = useState(null);
  const moveColumn = (fromKey, toKey) => {
    const fromIndex = columns.findIndex((c) => c.key === fromKey);
    const toIndex = columns.findIndex((c) => c.key === toKey);

    if (fromIndex === -1 || toIndex === -1) return;

    const newCols = [...columns];
    const [moved] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, moved);

    saveColumns(newCols);
  };

  const [filters, setFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);

const filteredTrips = trips.filter((t) =>
  Object.entries(filters).every(([key, val]) => {
    if (!val) return true;

    // 🔥 cột ngày
    if (DATE_COLUMNS.includes(key)) {
      if (!t[key]) return false;

      const rowDate = format(new Date(t[key]), "yyyy-MM-dd");
      return rowDate === val;
    }

    // 🔥 cột thường (không dấu)
    const fieldValue = removeVietnameseTones(t[key] ?? "");
    const filterValue = removeVietnameseTones(val);
    return fieldValue.includes(filterValue);
  })
);

const [showColumnSetting, setShowColumnSetting] = useState(false);
const clearAllFilters = () => {
  setFilters({});
  setActiveFilter(null);
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
          <label>Từ ngày: </label>
          <input
            type="date"
            className="border p-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>Đến ngày: </label>
          <input
            type="date"
            className="border p-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className={`px-4 py-2 text-white rounded 
    ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"}`}
        >
          {loading ? "Đang tải..." : "Lọc"}
        </button>
      </div>

      <div className="relative mb-2 inline-block">
  <button
    onClick={() => setShowColumnSetting(!showColumnSetting)}
    className="px-3 py-1 border rounded bg-gray-100 hover:bg-gray-200"
  >
    Ẩn cột
  </button>

  {showColumnSetting && (
    <div className="absolute z-20 mt-1 bg-white border shadow rounded p-2 max-h-60 overflow-auto">
      {columns.map((c) => (
        <label
          key={c.key}
          className="flex items-center gap-2 text-xs whitespace-nowrap"
        >
          <input
            type="checkbox"
            checked={c.visible}
            onChange={() => toggleColumn(c.key)}
          />
          {c.label}
        </label>
      ))}
    </div>
  )}
</div>

<button
  onClick={clearAllFilters}
  className="absolute right-4 z-30 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
>
  Xoá lọc
</button>


      {/* Bảng */}
      <div className="overflow-auto max-h-[600px] border">
        <table className="border table-fixed border-collapse">
          <thead className="bg-gray-100">
            <tr>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={() => setDragCol(col.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      moveColumn(dragCol, col.key);
                      setDragCol(null);
                    }}
                    className="border p-2 sticky top-0 bg-gray-100 z-10 relative cursor-move"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      maxWidth: col.width,
                    }}
                  >
                    <div
                      onClick={() =>
                        setActiveFilter(
                          activeFilter === col.key ? null : col.key
                        )
                      }
                      className="flex flex-col"
                    >
                      <span>{col.label}</span>

                      {activeFilter === col.key && (
  <input
    autoFocus
    type={DATE_COLUMNS.includes(col.key) ? "date" : "text"}
    className="border mt-1 px-1 text-xs"
    placeholder={
      DATE_COLUMNS.includes(col.key) ? "" : "Lọc..."
    }
    value={filters[col.key] || ""}
    onClick={(e) => e.stopPropagation()}
    onChange={(e) =>
      setFilters({
        ...filters,
        [col.key]: e.target.value,
      })
    }
  />
)}

                    </div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault(); // 🔥 cực quan trọng
                        e.stopPropagation(); // 🔥 cực quan trọng

                        setResizing({
                          key: col.key,
                          startX: e.clientX,
                          startWidth: col.width,
                        });
                      }}
                      className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent hover:bg-blue-400"
                    />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map((t) => (
              <tr key={t._id} className="h-[22px]">
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
                      <td
                        key={col.key}
                        className="border p-1 table-cell"
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          maxHeight: 20,
                        }}
                      >
                        <div className="cell-content" title={String(value ?? "")}>{value}</div>
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
