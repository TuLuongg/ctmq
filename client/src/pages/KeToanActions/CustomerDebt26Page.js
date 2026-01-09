import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import API from "../../api";
import TripPaymentModal from "../../components/TripPaymentModal";
import CostEditModal from "../../components/CostEditModal";
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

const HIGHLIGHT_COLORS = {
  yellow: "#FFF3CD", // vàng nhạt
  green: "#E6F4EA", // xanh lá
  blue: "#E7F1FF", // xanh dương
  pink: "#FDE7F3", // hồng
  purple: "#F3E8FF", // tím
  orange: "#FFE8CC", // cam nhạt
  red: "#FFE5E5", // đỏ nhạt
  cyan: "#E6FFFA", // xanh ngọc
  gray: "#F1F3F5", // xám
  lime: "#F4FEEA", // xanh chuối
};

export default function CustomerDebt26Page() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [highlightSelectTrip, setHighlightSelectTrip] = useState(null);

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
    { key: "diemXepHang", label: "Điểm đóng", width: 100, visible: true },
    { key: "diemDoHang", label: "Điểm giao", width: 100, visible: true },
    { key: "soDiem", label: "Số điểm", width: 80, visible: true },
    { key: "trongLuong", label: "Trọng lượng", width: 100, visible: true },
    { key: "bienSoXe", label: "Biển số", width: 80, visible: true },
    { key: "maKH", label: "Mã KH", width: 50, visible: true },
    { key: "ghiChu", label: "Ghi chú gốc", width: 100, visible: true },
    { key: "cuocPhi", label: "Cước phí", width: 80, visible: true },
    { key: "themDiem", label: "Thêm điểm", width: 80, visible: true },
    { key: "bocXep", label: "Bốc xếp", width: 80, visible: true },
    { key: "ve", label: "Vé", width: 80, visible: true },
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
    { key: "debtCode", label: "Mã CN", width: 80, visible: true },
  ];

  const MONEY_FIELDS = [
    "cuocPhi",
    "themDiem",
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
  const [page, setPage] = useState(1);
  const [limit] = useState(50); // cố định 100 / trang
  const [totalTrips, setTotalTrips] = useState(0);
  const [pageInput, setPageInput] = useState(page);
  const totalPages = Math.ceil(totalTrips / limit) || 1;

  const loadData = async (p = page) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/odd-debt`, {
        params: {
          startDate,
          endDate,
          page: p,
          limit,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // 🔥 ĐÚNG KEY BE TRẢ VỀ
      const list = res.data?.chiTietChuyen || [];

      const mapped = list.map((t) => ({
        ...t,
        trangThai: Number(t.conLai || 0) === 0 ? "green" : "red",
      }));

      setTrips(mapped);
      setTotalTrips(res.data?.soChuyen || 0);
      setPage(p);
    } catch (err) {
      console.error("load odd debt error:", err);
      setTrips([]);
      setTotalTrips(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasCongNo26Permission) return;
    loadData(1);
  }, [startDate, endDate, hasCongNo26Permission]);
  useEffect(() => {
    setPageInput(page);
  }, [page]);

  const [creatingDebt, setCreatingDebt] = useState(false);
  const [syncingDebt, setSyncingDebt] = useState(false);
  const [syncingToBase, setSyncingToBase] = useState(false);

  const handleCreateOddDebt = async () => {
    if (!window.confirm("Tạo công nợ cho các chuyến trong khoảng ngày này?"))
      return;

    try {
      setCreatingDebt(true);
      await axios.post(
        `${API}/odd-debt/create`,
        { startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("✅ Đã tạo công nợ khách lẻ");
      loadData(1);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi tạo công nợ");
    } finally {
      setCreatingDebt(false);
    }
  };

  const handleSyncOddDebt = async () => {
    if (
      !window.confirm(
        "Cập nhật các chuyến chưa có trong công nợ trong khoảng ngày này?"
      )
    )
      return;

    try {
      setSyncingDebt(true);
      await axios.post(
        `${API}/odd-debt/sync`,
        { startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("🔄 Đã cập nhật công nợ");
      loadData(1);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi cập nhật công nợ");
    } finally {
      setSyncingDebt(false);
    }
  };

  const handleSyncOddToBase = async () => {
    if (
      !window.confirm(
        "Chèn chi phí Khách Lẻ về chuyến gốc theo chi phí bổ sung theo khoảng ngày giao này?"
      )
    )
      return;

    try {
      setSyncingToBase(true);

      await axios.post(
        `${API}/odd-debt/sync-to-base-by-date`,
        { startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Đã chèn chi phí về chuyến gốc :v");
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi chèn chi phí về chuyến gốc !!!");
    } finally {
      setSyncingToBase(false);
    }
  };

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

    // ✅ Nếu tổng tiền = 0 → luôn là Chưa trả
    if (tongTien === 0) {
      color = "#ff3333";
      label = "Chưa trả";
    }
    // ✅ Tổng tiền > 0 và còn lại = 0 → Hoàn tất
    else if (conLai === 0) {
      color = "#00cc44";
      label = "Hoàn tất";
    }
    // ✅ Còn lại > 0
    else {
      const tiLe = conLai / tongTien;
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

  const [showCostModal, setShowCostModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editValues, setEditValues] = useState({});

  const openCostModal = (trip) => {
    setEditingTrip(trip);
    setEditValues({
      _id: trip._id,
      ...MONEY_FIELDS.reduce((acc, f) => {
        acc[f] = trip[f] ?? 0;
        return acc;
      }, {}),
    });
    setShowCostModal(true);
  };

  const updateHighlight = async (maChuyen, color) => {
    try {
      // gọi API
      await axios.put(
        `${API}/odd-debt/highlight`,
        { maChuyen, color },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // update state local
      setTrips((prev) =>
        prev.map((x) =>
          x.maChuyen === maChuyen ? { ...x, highlightColor: color || null } : x
        )
      );
    } catch (err) {
      console.error("❌ updateHighlight error", err);
      alert("Lỗi lưu highlight");
    } finally {
      setHighlightSelectTrip(null);
    }
  };

  const highlightRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        highlightSelectTrip &&
        highlightRef.current &&
        !highlightRef.current.contains(e.target)
      ) {
        setHighlightSelectTrip(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [highlightSelectTrip]);

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
                onChange={(e) => {
                  setPage(1);
                  setStartDate(e.target.value);
                }}
              />
            </div>

            <div>
              <label>Đến ngày: </label>
              <input
                type="date"
                onClick={(e) => e.target.showPicker()}
                className="border px-2 py-1 rounded cursor-pointer"
                value={endDate}
                onChange={(e) => {
                  setPage(1);
                  setEndDate(e.target.value);
                }}
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

            <button
              onClick={handleCreateOddDebt}
              disabled={creatingDebt}
              className={`px-4 py-2 text-white rounded text-xs
      ${creatingDebt ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}
    `}
            >
              {creatingDebt ? "Đang tạo..." : "Tạo công nợ"}
            </button>

            <button
              onClick={handleSyncOddDebt}
              disabled={syncingDebt}
              className={`px-4 py-2 text-white rounded text-xs
      ${syncingDebt ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"}
    `}
            >
              {syncingDebt ? "Đang cập nhật..." : "Cập nhật"}
            </button>
            <button
              onClick={handleSyncOddToBase}
              disabled={syncingToBase}
              className={`px-4 py-2 text-white rounded text-xs
    ${syncingToBase ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"}
  `}
            >
              {syncingToBase ? "Đang chèn..." : "Chèn về chuyến gốc"}
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
                    `${API}/odd-debt/name-customer`,
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
                    `${API}/odd-debt/note`,
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
                  <tr
                    key={t._id}
                    className="h-[22px]"
                    style={{
                      backgroundColor: t.highlightColor
                        ? HIGHLIGHT_COLORS[t.highlightColor] || t.highlightColor
                        : undefined,
                    }}
                  >
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

                        const MONEY_RIGHT_FIELDS = [
                          "tongTien",
                          "daThanhToan",
                          "conLai",
                        ];

                        if (DATE_COLUMNS.includes(col.key)) {
                          value = value
                            ? format(new Date(value), "dd/MM/yyyy")
                            : "";
                        }
                        if (MONEY_FIELDS.includes(col.key)) {
                          const num = Number(t[col.key]);

                          const displayValue =
                            !num || isNaN(num) ? "" : num.toLocaleString();

                          return (
                            <td
                              key={col.key}
                              className={`border table-cell cursor-pointer hover:bg-yellow-50
        ${col.key === "maChuyen" ? "sticky left-[30px] bg-white z-20" : ""}
        ${MONEY_RIGHT_FIELDS.includes(col.key) ? "text-right" : ""}
      `}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                              }}
                              onClick={() => openCostModal(t)}
                            >
                              <div className="text-right">{displayValue}</div>
                            </td>
                          );
                        }

                        if (col.key === "maChuyen") {
                          return (
                            <td
                              key={col.key}
                              className="border table-cell sticky left-[30px] z-20 relative cursor-pointer"
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                                backgroundColor: t.highlightColor
                                  ? HIGHLIGHT_COLORS[t.highlightColor] ||
                                    t.highlightColor
                                  : "white",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightSelectTrip(t.maChuyen);
                              }}
                            >
                              <div className="truncate font-medium">
                                {t.maChuyen}
                              </div>

                              {/* BẢNG CHỌN MÀU – BẬT NGAY */}
                              {highlightSelectTrip === t.maChuyen && (
                                <div
                                  ref={highlightRef}
                                  className="absolute top-0 left-full bg-white border shadow flex gap-1 p-1 z-[1000]"
                                  style={{ pointerEvents: "auto" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {[
                                    {
                                      key: "",
                                      label: "✖",
                                      title: "Bỏ highlight",
                                    },
                                    { key: "yellow", label: "🟨" },
                                    { key: "green", label: "🟩" },
                                    { key: "pink", label: "🩷" },
                                    { key: "blue", label: "🟦" },
                                    { key: "purple", label: "🟪" },

                                    // 🔥 thêm
                                    { key: "orange", label: "🟧" },
                                    { key: "red", label: "🟥" },
                                    { key: "cyan", label: "🟦" },
                                    { key: "gray", label: "⬜" },
                                    { key: "lime", label: "🟩" },
                                  ].map((c) => (
                                    <button
                                      key={c.key}
                                      title={c.title}
                                      className="w-5 h-5 border rounded hover:scale-110"
                                      style={{
                                        backgroundColor: c.key
                                          ? HIGHLIGHT_COLORS[c.key]
                                          : "transparent",
                                      }}
                                      onClick={() =>
                                        updateHighlight(t.maChuyen, c.key)
                                      }
                                    >
                                      {!c.key && c.label}
                                    </button>
                                  ))}
                                </div>
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
                          const num = Number(value ?? ""); // ép sang number
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
                              className={`cell-content ${
                                ["tongTien", "daThanhToan", "conLai"].includes(
                                  col.key
                                )
                                  ? "text-right"
                                  : ""
                              }`}
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

          <div className="flex justify-between items-center mt-3">
            <div className="font-semibold">
              Tổng số chuyến: <span className="text-black">{totalTrips}</span>{" "}
              || hiển thị:{" "}
              <span className="text-black">{filteredTrips.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => loadData(page - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Trước
              </button>

              {/* 🔥 CHỌN TRANG */}
              <select
                value={page}
                disabled={loading}
                onChange={(e) => loadData(Number(e.target.value))}
                className="border px-2 py-1 text-xs rounded cursor-pointer"
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Trang {i + 1}
                  </option>
                ))}
              </select>

              <span className="text-xs text-gray-600">/ {totalPages}</span>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => loadData(page + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Sau
              </button>
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

      <CostEditModal
        open={showCostModal}
        onClose={() => setShowCostModal(false)}
        trip={editingTrip}
        values={editValues}
        setValues={setEditValues}
        moneyFields={MONEY_FIELDS}
        onSaved={loadData}
      />
    </div>
  );
}
