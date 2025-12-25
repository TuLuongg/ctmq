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
    { key: "maChuyen", label: "Mã chuyến", width: 80, visible: true },
    { key: "nameCustomer", label: "Tên khách hàng", width: 120, visible: true },
    { key: "tenLaiXe", label: "Tên lái xe", width: 120, visible: true },
    { key: "dienGiai", label: "Diễn giải", width: 150, visible: true },
    { key: "ngayBocHang", label: "Ngày đóng", width: 100, visible: true },
    { key: "ngayGiaoHang", label: "Ngày giao", width: 100, visible: true },
    { key: "diemDoHang", label: "Điểm đóng", width: 100, visible: true },
    { key: "diemXepHang", label: "Điểm giao", width: 100, visible: true },
    { key: "soDiem", label: "Số điểm", width: 80, visible: true },
    { key: "trongLuong", label: "Trọng lượng", width: 100, visible: true },
    { key: "bienSoXe", label: "Biển số", width: 100, visible: true },
    { key: "maKH", label: "Mã KH", width: 100, visible: true },
    { key: "cuocPhi", label: "Cước phí", width: 80, visible: true },
    { key: "bocXep", label: "Bốc xếp", width: 80, visible: true },
    { key: "ve", label: "Vé", width: 60, visible: true },
    { key: "hangVe", label: "Hàng về", width: 80, visible: true },
    { key: "luuCa", label: "Lưu ca", width: 80, visible: true },
    { key: "luatChiPhiKhac", label: "Luật CP khác", width: 90, visible: true },
    { key: "tongTien", label: "Tổng tiền", width: 120, visible: true },
    { key: "daThanhToan", label: "Đã thanh toán", width: 120, visible: true },
    { key: "conLai", label: "Còn lại", width: 120, visible: true },
    { key: "trangThai", label: "Trạng thái", width: 100, visible: true },
    { key: "ngayCK", label: "Ngày CK", width: 100, visible: true },
    { key: "taiKhoanCK", label: "Tài khoản", width: 120, visible: true },
    { key: "noiDungCK", label: "Nội dung CK", width: 200, visible: true },
    { key: "noteOdd", label: "Ghi chú thêm", width: 120, visible: true },
  ];

  const MONEY_FIELDS = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
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
  const hasCongNo26Permission = user?.permissions?.includes("cong_no_26");

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

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

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

  const [editingTrip, setEditingTrip] = useState(null); // _id chuyến đang edit
  const [editValues, setEditValues] = useState({}); // lưu 6 ô tiền

  useEffect(() => {
    if (!hasCongNo26Permission) return;
    loadData();
  }, [startDate, endDate, hasCongNo26Permission]);

  const toggleColumn = (key) => {
    const newCols = columns.map((c) =>
      c.key === key ? { ...c, visible: !c.visible } : c
    );
    saveColumns(newCols);
  };
  const allChecked = columns.every((c) => c.visible);
  const someChecked = columns.some((c) => c.visible);
  const toggleAllColumns = () => {
    const allChecked = columns.every((c) => c.visible); // đang tất cả chọn
    const newCols = columns.map((c) => ({
      ...c,
      visible: !allChecked, // nếu all → bỏ hết, chưa all → chọn hết
    }));
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

  // checkbox selection
  const [selectedForNameCustomer, setSelectedForNameCustomer] = useState([]);
  const [selectedForNoteOdd, setSelectedForNoteOdd] = useState([]);

  // input values
  const [nameCustomerInput, setNameCustomerInput] = useState("");
  const [noteOddInput, setNoteOddInput] = useState("");

  const allTripCodes = filteredTrips.map((t) => t.maChuyen);

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
                <button
          onClick={handleGoToContract}
          className={`px-3 py-1 rounded text-white ${
            isActive("/contract") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className={`px-3 py-1 rounded text-white ${
            isActive("/tcb-person") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          TCB cá nhân
        </button>
      </div>
      <h1 className="text-xl font-bold mb-4">CÔNG NỢ KHÁCH LẺ (MÃ 26)</h1>

      {!hasCongNo26Permission ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-600">
          <div className="text-8xl mb-4 animate-bounce">😿</div>
          <div className="text-xl font-semibold mb-1">
            Bạn chưa được cấp quyền sử dụng chức năng này !!!
          </div>
          <div className="text-xl italic text-gray-500">
            Vui lòng xin cấp quyền <b>công nợ khách lẻ (26)</b> để tiếp tục 🐾
          </div>
        </div>
      ) : (
        <>
          {/* Bộ lọc */}
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label>Từ ngày: </label>
              <input
                type="date"
                onClick={(e) => e.target.showPicker()}
                className="border px-2 py-1 rounded cursor-pointer"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label>Đến ngày: </label>
              <input
                type="date"
                onClick={(e) => e.target.showPicker()}
                className="border px-2 py-1 rounded cursor-pointer"
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
          <div className="flex justify-between items-center gap-4 mb-3">
            {/* LEFT – update nameCustomer */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border px-2 py-1 text-xs w-[220px]"
                placeholder="Tên khách hàng..."
                value={nameCustomerInput}
                onChange={(e) => setNameCustomerInput(e.target.value)}
              />
              <button
                className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                onClick={async () => {
                  if (!selectedForNameCustomer.length) {
                    alert("Chưa chọn chuyến nào");
                    return;
                  }
                  await axios.put(
                    `${API}/payment-history/update-name-customer`,
                    {
                      maChuyenList: selectedForNameCustomer,
                      nameCustomer: nameCustomerInput,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                      },
                    }
                  );
                  setSelectedForNameCustomer([]);
                  setNameCustomerInput("");
                  loadData();
                }}
              >
                Cập nhật
              </button>
            </div>

            {/* RIGHT – update noteOdd */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border px-2 py-1 text-xs w-[260px]"
                placeholder="Ghi chú phát sinh..."
                value={noteOddInput}
                onChange={(e) => setNoteOddInput(e.target.value)}
              />
              <button
                className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                onClick={async () => {
                  if (!selectedForNoteOdd.length) {
                    alert("Chưa chọn chuyến nào");
                    return;
                  }
                  await axios.put(
                    `${API}/payment-history/update-note-odd`,
                    {
                      maChuyenList: selectedForNoteOdd,
                      noteOdd: noteOddInput,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                      },
                    }
                  );
                  setSelectedForNoteOdd([]);
                  setNoteOddInput("");
                  loadData();
                }}
              >
                Cập nhật
              </button>
            </div>
          </div>

          <div className="relative mb-2 inline-block z-[100]">
            <button
              onClick={() => setShowColumnSetting(!showColumnSetting)}
              className="px-3 py-1 border rounded bg-gray-100 hover:bg-gray-200"
            >
              Ẩn cột
            </button>

            {showColumnSetting && (
              <div className="absolute z-90 mt-1 bg-white border shadow rounded p-2 max-h-60 overflow-auto space-y-1">
                {/* 🔥 CHỌN TẤT CẢ / BỎ TẤT CẢ */}
                <label className="flex items-center gap-2 text-xs font-semibold border-b pb-1 mb-1">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = !allChecked && someChecked;
                    }}
                    onChange={toggleAllColumns}
                  />
                  Chọn tất cả
                </label>

                {/* DANH SÁCH CỘT */}
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
            <table className="table-fixed border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="border sticky top-[-1px] left-[-1px] z-50 bg-gray-100 text-center"
                    style={{ width: 32, minWidth: 32, maxWidth: 32 }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        allTripCodes.length > 0 &&
                        allTripCodes.every((code) =>
                          selectedForNameCustomer.includes(code)
                        )
                      }
                      onChange={(e) => {
                        setSelectedForNameCustomer(
                          e.target.checked ? allTripCodes : []
                        );
                      }}
                    />
                  </th>

                  {columns
                    .filter((c) => c.visible)
                    .map((col) => {
                      const isMaChuyen = col.key === "maChuyen";

                      return (
                        <th
                          key={col.key}
                          draggable
                          onDragStart={() => setDragCol(col.key)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            moveColumn(dragCol, col.key);
                            setDragCol(null);
                          }}
                          className={`border p-2 sticky top-[-1px] bg-gray-100 relative cursor-move
          ${isMaChuyen ? "left-[30px] z-30" : "z-10"}
        `}
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
                                type={
                                  DATE_COLUMNS.includes(col.key)
                                    ? "date"
                                    : "text"
                                }
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
                              e.preventDefault();
                              e.stopPropagation();
                              setResizing({
                                key: col.key,
                                startX: e.clientX,
                                startWidth: col.width,
                              });
                            }}
                            className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent hover:bg-blue-400"
                          />
                        </th>
                      );
                    })}

                  <th className="border p-1 sticky top-[-1px] right-0 bg-gray-100 z-30 text-center w-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        allTripCodes.length > 0 &&
                        allTripCodes.every((code) =>
                          selectedForNoteOdd.includes(code)
                        )
                      }
                      onChange={(e) => {
                        setSelectedForNoteOdd(
                          e.target.checked ? allTripCodes : []
                        );
                      }}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t) => (
                  <tr key={t._id} className="h-[22px]">
                    {/* LEFT checkbox – nameCustomer */}
                    <td
                      className="border sticky left-[-1px] z-40 bg-white text-center"
                      style={{ width: 32, minWidth: 32, maxWidth: 32 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForNameCustomer.includes(t.maChuyen)}
                        onChange={(e) => {
                          setSelectedForNameCustomer((prev) =>
                            e.target.checked
                              ? [...prev, t.maChuyen]
                              : prev.filter((m) => m !== t.maChuyen)
                          );
                        }}
                      />
                    </td>

                    {/* DATA COLUMNS */}
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => {
                        let value = t[col.key];

                        if (DATE_COLUMNS.includes(col.key)) {
                          value = value
                            ? format(new Date(value), "dd/MM/yyyy")
                            : "";
                        }
                        if (MONEY_FIELDS.includes(col.key)) {
                          const num = Number(t[col.key] ?? 0);
                          const displayValue = isNaN(num)
                            ? ""
                            : num.toLocaleString();

                          return (
                            <td
                              key={col.key}
                              className={`border table-cell relative ${
                                col.key === "maChuyen"
                                  ? "sticky left-[30px] bg-white z-20"
                                  : ""
                              }`}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                              }}
                              onClick={() => {
                                setEditingTrip(t._id);
                                setEditValues({
                                  _id: t._id,
                                  ...MONEY_FIELDS.reduce((acc, f) => {
                                    acc[f] = t[f] ?? 0; // lấy giá trị cũ từ row
                                    return acc;
                                  }, {}),
                                });
                              }}
                            >
                              {editingTrip === t._id ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    className="border p-1 text-right w-full"
                                    value={editValues[col.key]}
                                    onChange={(e) =>
                                      setEditValues((prev) => ({
                                        ...prev,
                                        [col.key]: Number(e.target.value),
                                      }))
                                    }
                                  />

                                  {col.key === "luatChiPhiKhac" && (
                                    <div
                                      className="absolute top-0 left-full ml-1 flex gap-1 items-center"
                                      style={{ height: "100%" }}
                                    >
                                      <button
                                        className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await axios.put(
                                              `${API}/schedule-admin/${editValues._id}`,
                                              editValues,
                                              {
                                                headers: {
                                                  Authorization: `Bearer ${localStorage.getItem(
                                                    "token"
                                                  )}`,
                                                },
                                              }
                                            );
                                            setEditingTrip(null);
                                            loadData();
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                      >
                                        Lưu
                                      </button>
                                      <button
                                        className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingTrip(null);
                                        }}
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-right">{displayValue}</div>
                              )}
                            </td>
                          );
                        }
                        if (
                          col.key === "tongTien" ||
                          col.key === "daThanhToan" ||
                          col.key === "conLai" ||
                          col.key === "cuocPhi" ||
                          col.key === "bocXep" ||
                          col.key === "ve" ||
                          col.key === "hangVe" ||
                          col.key === "luuCa" ||
                          col.key === "luatChiPhiKhac"
                        ) {
                          const num = Number(value ?? 0); // ép sang number
                          value = isNaN(num) ? "" : num.toLocaleString(); // nếu NaN thì hiển thị rỗng
                        }

                        if (col.key === "trangThai") {
                          return (
                            <td
                              key={col.key}
                              className="border p-1 text-center"
                            >
                              {renderStatus(t)}
                            </td>
                          );
                        }

                        if (col.key === "taiKhoanCK") {
                          const methodMap = {
                            PERSONAL_VCB: "TK cá nhân - VCB",
                            PERSONAL_TCB: "TK cá nhân - TCB",
                            COMPANY_VCB: "VCB công ty",
                            COMPANY_TCB: "TCB công ty",
                            CASH: "Tiền mặt",
                            OTHER: "Khác",
                          };
                          value = methodMap[value] || value;
                        }

                        return (
                          <td
                            key={col.key}
                            className={`border table-cell
    ${col.key === "maChuyen" ? "sticky left-[30px] bg-white z-20" : ""}
  `}
                            style={{
                              width: col.width,
                              minWidth: col.width,
                              maxWidth: col.width,
                            }}
                          >
                            <div
                              className="cell-content"
                              title={String(value ?? "")}
                            >
                              {value}
                            </div>
                          </td>
                        );
                      })}

                    {/* RIGHT checkbox – noteOdd */}
                    <td className="border text-center sticky right-0 bg-white z-20">
                      <input
                        type="checkbox"
                        checked={selectedForNoteOdd.includes(t.maChuyen)}
                        onChange={(e) => {
                          setSelectedForNoteOdd((prev) =>
                            e.target.checked
                              ? [...prev, t.maChuyen]
                              : prev.filter((m) => m !== t.maChuyen)
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end items-center mt-2">
            <div className="font-semibold">
              Tổng số chuyến:{" "}
              <span className="text-black-600">{filteredTrips.length}</span>
            </div>
          </div>
        </>
      )}

      {selectedTrip && (
        <TripPaymentModal
          onReloadPayment={loadData}
          maChuyenCode={selectedTrip.maChuyen}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}
