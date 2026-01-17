import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsUnlock, BsLock } from "react-icons/bs";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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

const normalize = (s = "") =>
  s.toString().normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const formatNumber = (n) => {
  if (n == null || n === "") return "";
  const num = Number(n.toString().replace(/\./g, "").replace(/,/g, ""));
  if (isNaN(num)) return n;
  return num.toLocaleString("vi-VN"); // vì VN: 1.234.567
};

const DATE_COLUMNS = ["ngayBocHang", "ngayGiaoHang", "ngayCK"];

const HIGHLIGHT_COLORS = {
  yellow: "#EEEE00", // vàng nhạt
  green: "#00EE00", // xanh lá
  blue: "#436EEE", // xanh dương
  pink: "#FF69B4", // hồng
  purple: "#FF83FA", // tím
  orange: "#FFE4B5", // cam nhạt
  red: "#FA8072", // đỏ nhạt
  cyan: "#98F5FF", // xanh ngọc
  gray: "#9C9C9C", // xám
  lime: "#54FF9F", // xanh chuối
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
    { key: "nameCustomer", label: "Tên khách hàng", width: 120, visible: true },
    { key: "isLocked", label: "Khoá", width: 40, visible: true },
    { key: "maChuyen", label: "Mã chuyến", width: 80, visible: true },
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

  // ===== MONEY FILTER (COPY TỪ ManageAllTrip) =====
  const moneyColumns = [
    "themDiem",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
  ];

  const [moneyFilter, setMoneyFilter] = useState({});

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("customer26_columns");
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  const getColumnLabel = (key) => {
    if (!Array.isArray(columns)) return key;
    const col = columns.find((c) => c.key === key);
    return col?.label || key;
  };

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
  const [filters, setFilters] = useState({});

  const [excelOptions, setExcelOptions] = useState({
    nameCustomer: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
    daThanhToan: [],
  });

  const [excelSelected, setExcelSelected] = useState({
    nameCustomer: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
    daThanhToan: [],
  });

  useEffect(() => {
    axios
      .get(`${API}/odd-debt/filter-all`, {
        headers: `Bearer ${localStorage.getItem("token")}`,
        params: {
          fromDate: startDate || undefined,
          toDate: endDate || undefined,
        },
      })
      .then((res) => setExcelOptions(res.data))
      .catch((err) => console.error("❌ fetch filter-all error:", err));
  }, [startDate, endDate]);

  const [searchKH, setSearchKH] = useState("");
  const [searchDriver, setSearchDriver] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [searchDGiai, setSearchDGiai] = useState("");
  const [searchCuocPhiBD, setSearchCuocPhiBD] = useState("");
  const [searchDTT, setSearchDTT] = useState("");

  // ===== SORT (match BE getOddCustomerDebt) =====
  const SORTABLE_COLUMNS = {
    nameCustomer: true,
    dienGiai: true,
    ngayGiaoHang: true,
  };

  const [sort, setSort] = useState([]);
  // ví dụ: [{ field: "ngayGiaoHang", order: "asc" }]

  const toggleSort = (field) => {
    setSort((prev) => {
      const current = prev.find((s) => s.field === field);

      // chưa sort → asc
      if (!current) {
        return [{ field, order: "asc" }];
      }

      // asc → desc
      if (current.order === "asc") {
        return [{ field, order: "desc" }];
      }

      // desc → bỏ sort
      return [];
    });

    setPage(1);
  };

  const [tongTienAll, setTongTienAll] = useState(0);
const [conLaiAll, setConLaiAll] = useState(0);


  const loadData = async (p = page) => {
    if (loading) return;
    setLoading(true);

    try {
      const q = new URLSearchParams();

      q.append("page", p);
      q.append("limit", limit);

      if (startDate) q.append("startDate", startDate);
      if (endDate) q.append("endDate", endDate);

      if (excelSelected.nameCustomer.length > 0) {
        excelSelected.nameCustomer.forEach((v) => q.append("nameCustomer", v));
      }
      if (excelSelected.tenLaiXe.length > 0) {
        excelSelected.tenLaiXe.forEach((v) => q.append("tenLaiXe", v));
      }
      if (excelSelected.bienSoXe.length > 0) {
        excelSelected.bienSoXe.forEach((v) => q.append("bienSoXe", v));
      }
      if (excelSelected.dienGiai.length > 0) {
        excelSelected.dienGiai.forEach((v) => q.append("dienGiai", v));
      }
      if (excelSelected.cuocPhi.length > 0) {
        excelSelected.cuocPhi.forEach((v) => q.append("cuocPhi", v));
      }
      if (excelSelected.daThanhToan.length > 0) {
        excelSelected.daThanhToan.forEach((v) => q.append("daThanhToan", v));
      }

      // ===== FILTER NHẬP TEXT / DATE (GỬI LÊN BE) =====
      Object.entries(filters || {}).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          q.append(key, val);
        }
      });

      // ===== FILTER TIỀN (EMPTY / FILLED) =====
      Object.entries(moneyFilter || {}).forEach(([key, rule]) => {
        if (rule?.empty) q.append(`${key}Empty`, "1");
        if (rule?.filled) q.append(`${key}Filled`, "1");
      });

      // ===== SORT (match BE) =====
      if (sort.length > 0) {
        q.append("sort", JSON.stringify(sort));
      }

      const res = await axios.get(`${API}/odd-debt/all?${q.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const list = res.data?.chiTietChuyen || [];

      const mapped = list.map((t) => ({
        ...t,
        trangThai: Number(t.conLai || 0) === 0 ? "green" : "red",
      }));

      setTrips(mapped);
      setTotalTrips(res.data?.soChuyen || 0);
      setTongTienAll(res.data?.tongTienAll || 0);
setConLaiAll(res.data?.conLaiAll || 0);
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
  }, [
    startDate,
    endDate,
    hasCongNo26Permission,
    excelSelected.nameCustomer.join("|"),
    excelSelected.tenLaiXe.join("|"),
    excelSelected.bienSoXe.join("|"),
    excelSelected.dienGiai.join("|"),
    excelSelected.cuocPhi.join("|"),
    excelSelected.daThanhToan.join("|"),
    JSON.stringify(filters),
    JSON.stringify(moneyFilter),
    sort,
  ]);
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
        "Cập nhật thông tin từ chuyến gốc sang công nợ trong khoảng ngày này?"
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

  const [exporting, setExporting] = useState(false);
  const exportToExcel = async () => {
    if (exporting) return; // ⛔ chống spam click

    try {
      if (!startDate || !endDate) {
        alert("Vui lòng chọn khoảng ngày");
        return;
      }

      setExporting(true); // 🔒 khóa nút

      const payload = {
        from: startDate,
        to: endDate,
      };

      const res = await axios.post(
        `${API}/odd-debt/export-excel-by-range`,
        payload,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      saveAs(
        new Blob([res.data]),
        `CONG_NO_KHACH_LE_${startDate}_den_${endDate}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Xuất Excel thất bại");
    } finally {
      setExporting(false); // 🔓 mở lại nút
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
    setFilters("");
    setExcelSelected({
      nameCustomer: [],
      tenLaiXe: [],
      bienSoXe: [],
      dienGiai: [],
      cuocPhi: [],
      daThanhToan: [],
    });
    setSearchKH("");
    setSearchDriver("");
    setSearchDGiai("");
    setSearchCuocPhiBD("");
    setSearchDTT("");
    setPage(1);
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

  const [filterPos, setFilterPos] = useState({ x: 0, y: 0 });

  const [openFilter, setOpenFilter] = useState(null);

  useEffect(() => {
    const close = (e) => {
      const th = e.target.closest("th[data-col]");
      if (!th) setOpenFilter(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredKhachHang = (excelOptions.nameCustomer || []).filter((c) => {
    if (!searchKH) return true;
    return normalize(c).includes(normalize(searchKH));
  });

  const filteredTenLaiXe = (excelOptions.tenLaiXe || []).filter((d) => {
    if (!searchDriver) return true;
    return normalize(d).includes(normalize(searchDriver));
  });

  const filteredBienSoXe = (excelOptions.bienSoXe || []).filter((p) => {
    if (!searchPlate) return true;
    return normalize(p).includes(normalize(searchPlate));
  });

  const filteredDienGiai = (excelOptions.dienGiai || []).filter((dg) => {
    if (!searchDGiai) return true;
    return normalize(dg).includes(normalize(searchDGiai));
  });

  const filteredCuocPhi = (excelOptions.cuocPhi || []).filter((cp) => {
    if (!searchCuocPhiBD) return true;
    return normalize(cp).includes(normalize(searchCuocPhiBD));
  });

  const filteredDTT = (excelOptions.daThanhToan || []).filter((dt) => {
    if (!searchDTT) return true;
    return normalize(dt).includes(normalize(searchDTT));
  });

  const renderSortIcon = (field) => {
    if (!SORTABLE_COLUMNS[field]) return null;

    const current = sort.find((s) => s.field === field);

    return (
      <span
        className="flex flex-col ml-1 select-none"
        onClick={(e) => {
          e.stopPropagation(); // ❗ không mở filter
          toggleSort(field);
        }}
        style={{ cursor: "pointer", lineHeight: "10px" }}
      >
        <span
          style={{
            fontSize: 9,
            opacity: current?.order === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: 9,
            marginTop: -2,
            opacity: current?.order === "desc" ? 1 : 0.3,
          }}
        >
          ▼
        </span>
      </span>
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
              onClick={exportToExcel}
              disabled={exporting}
              className={`px-4 py-2 rounded-lg shadow-sm text-white flex items-center gap-2
    ${
      exporting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-500 hover:bg-blue-600"
    }
  `}
            >
              {exporting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {exporting ? "Đang xuất file..." : "Xuất Excel"}
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
            <button
              className="px-4 py-2 text-white rounded text-xs bg-red-400 hover:bg-red-700"
              onClick={async () => {
                if (
                  !window.confirm("Khoá tất cả chuyến trong khoảng ngày này?")
                )
                  return;

                await axios.post(
                  `${API}/odd-debt/lock-by-date`,
                  { startDate, endDate },
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  }
                );

                loadData();
              }}
            >
              Khoá tất cả
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
                      const isMaChuyen = col.key === "nameCustomer";

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
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setFilterPos({
                                x: rect.left,
                                y: rect.bottom,
                              });
                              setOpenFilter(col.key);
                            }}
                            className="flex flex-col"
                          >
                            <div className="flex items-center justify-center">
                              <span>{col.label}</span>
                              {renderSortIcon(col.key)}
                            </div>

                            {/* FILTER POPUP */}
                            {openFilter && (
                              <div
                                className="fixed bg-white border rounded shadow p-2 z-[9999] text-black text-xs"
                                style={{
                                  top: filterPos.y,
                                  left: filterPos.x,
                                  width: 240,
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {/* ===== FILTER KHÁCH HÀNG ===== */}
                                {openFilter === "nameCustomer" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchKH}
                                      onChange={(e) =>
                                        setSearchKH(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredKhachHang.length > 0 &&
                                          filteredKhachHang.every((c) =>
                                            excelSelected.nameCustomer.includes(
                                              c
                                            )
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredKhachHang.every((c) =>
                                                prev.nameCustomer.includes(c)
                                              );

                                            return {
                                              ...prev,
                                              nameCustomer: isAllSelected
                                                ? prev.nameCustomer.filter(
                                                    (x) =>
                                                      !filteredKhachHang.includes(
                                                        x
                                                      )
                                                  )
                                                : [
                                                    ...prev.nameCustomer,
                                                    ...filteredKhachHang.filter(
                                                      (x) =>
                                                        !prev.nameCustomer.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredKhachHang.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredKhachHang.map((c) => (
                                        <label
                                          key={c}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.nameCustomer.includes(
                                              c
                                            )}
                                            onChange={() =>
                                              setExcelSelected((p) => ({
                                                ...p,
                                                nameCustomer:
                                                  p.nameCustomer.includes(c)
                                                    ? p.nameCustomer.filter(
                                                        (x) => x !== c
                                                      )
                                                    : [...p.nameCustomer, c],
                                              }))
                                            }
                                          />
                                          <span className="truncate">{c}</span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((p) => ({
                                            ...p,
                                            nameCustomer: [],
                                          }));
                                          setSearchKH("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER LÁI XE ===== */}
                                {openFilter === "tenLaiXe" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchDriver}
                                      onChange={(e) =>
                                        setSearchDriver(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredTenLaiXe.length > 0 &&
                                          filteredTenLaiXe.every((d) =>
                                            excelSelected.tenLaiXe.includes(d)
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredTenLaiXe.every((d) =>
                                                prev.tenLaiXe.includes(d)
                                              );
                                            return {
                                              ...prev,
                                              tenLaiXe: isAllSelected
                                                ? prev.tenLaiXe.filter(
                                                    (x) =>
                                                      !filteredTenLaiXe.includes(
                                                        x
                                                      )
                                                  )
                                                : [
                                                    ...prev.tenLaiXe,
                                                    ...filteredTenLaiXe.filter(
                                                      (x) =>
                                                        !prev.tenLaiXe.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredTenLaiXe.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredTenLaiXe.map((d) => (
                                        <label
                                          key={d}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.tenLaiXe.includes(
                                              d
                                            )}
                                            onChange={() =>
                                              setExcelSelected((p) => ({
                                                ...p,
                                                tenLaiXe: p.tenLaiXe.includes(d)
                                                  ? p.tenLaiXe.filter(
                                                      (x) => x !== d
                                                    )
                                                  : [...p.tenLaiXe, d],
                                              }))
                                            }
                                          />
                                          <span className="truncate">{d}</span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((p) => ({
                                            ...p,
                                            tenLaiXe: [],
                                          }));
                                          setSearchDriver("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER BIỂN SỐ XE ===== */}
                                {openFilter === "bienSoXe" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchPlate}
                                      onChange={(e) =>
                                        setSearchPlate(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredBienSoXe.length > 0 &&
                                          filteredBienSoXe.every((p) =>
                                            excelSelected.bienSoXe.includes(p)
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredBienSoXe.every((p) =>
                                                prev.bienSoXe.includes(p)
                                              );
                                            return {
                                              ...prev,
                                              bienSoXe: isAllSelected
                                                ? prev.bienSoXe.filter(
                                                    (x) =>
                                                      !filteredBienSoXe.includes(
                                                        x
                                                      )
                                                  )
                                                : [
                                                    ...prev.bienSoXe,
                                                    ...filteredBienSoXe.filter(
                                                      (x) =>
                                                        !prev.bienSoXe.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredBienSoXe.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredBienSoXe.map((p) => (
                                        <label
                                          key={p}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.bienSoXe.includes(
                                              p
                                            )}
                                            onChange={() =>
                                              setExcelSelected((s) => ({
                                                ...s,
                                                bienSoXe: s.bienSoXe.includes(p)
                                                  ? s.bienSoXe.filter(
                                                      (x) => x !== p
                                                    )
                                                  : [...s.bienSoXe, p],
                                              }))
                                            }
                                          />
                                          <span className="truncate">{p}</span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((p) => ({
                                            ...p,
                                            bienSoXe: [],
                                          }));
                                          setSearchPlate("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER DIỄN GIẢI ===== */}
                                {openFilter === "dienGiai" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchDGiai}
                                      onChange={(e) =>
                                        setSearchDGiai(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredDienGiai.length > 0 &&
                                          filteredDienGiai.every((dg) =>
                                            excelSelected.dienGiai.includes(dg)
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredDienGiai.every((dg) =>
                                                prev.dienGiai.includes(dg)
                                              );
                                            return {
                                              ...prev,
                                              dienGiai: isAllSelected
                                                ? prev.dienGiai.filter(
                                                    (x) =>
                                                      !filteredDienGiai.includes(
                                                        x
                                                      )
                                                  )
                                                : [
                                                    ...prev.dienGiai,
                                                    ...filteredDienGiai.filter(
                                                      (x) =>
                                                        !prev.dienGiai.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredDienGiai.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredDienGiai.map((dg) => (
                                        <label
                                          key={dg}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.dienGiai.includes(
                                              dg
                                            )}
                                            onChange={() =>
                                              setExcelSelected((prev) => ({
                                                ...prev,
                                                dienGiai:
                                                  prev.dienGiai.includes(dg)
                                                    ? prev.dienGiai.filter(
                                                        (x) => x !== dg
                                                      )
                                                    : [...prev.dienGiai, dg],
                                              }))
                                            }
                                          />
                                          <span className="truncate">{dg}</span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((prev) => ({
                                            ...prev,
                                            dienGiai: [],
                                          }));
                                          setSearchDGiai("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER CƯỚC PHÍ (STRING) ===== */}
                                {openFilter === "cuocPhi" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchCuocPhiBD}
                                      onChange={(e) =>
                                        setSearchCuocPhiBD(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredCuocPhi.length > 0 &&
                                          filteredCuocPhi.every((cp) =>
                                            excelSelected.cuocPhi.includes(cp)
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredCuocPhi.every((cp) =>
                                                prev.cuocPhi.includes(cp)
                                              );
                                            return {
                                              ...prev,
                                              cuocPhi: isAllSelected
                                                ? prev.cuocPhi.filter(
                                                    (x) =>
                                                      !filteredCuocPhi.includes(
                                                        x
                                                      )
                                                  )
                                                : [
                                                    ...prev.cuocPhi,
                                                    ...filteredCuocPhi.filter(
                                                      (x) =>
                                                        !prev.cuocPhi.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredCuocPhi.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredCuocPhi.map((cp) => (
                                        <label
                                          key={cp}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.cuocPhi.includes(
                                              cp
                                            )}
                                            onChange={() =>
                                              setExcelSelected((prev) => ({
                                                ...prev,
                                                cuocPhi: prev.cuocPhi.includes(
                                                  cp
                                                )
                                                  ? prev.cuocPhi.filter(
                                                      (x) => x !== cp
                                                    )
                                                  : [...prev.cuocPhi, cp],
                                              }))
                                            }
                                          />
                                          <span className="truncate">
                                            {formatNumber(cp)}
                                          </span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((prev) => ({
                                            ...prev,
                                            cuocPhi: [],
                                          }));
                                          setSearchCuocPhiBD("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER ĐÃ THANH TOÁN (STRING) ===== */}
                                {openFilter === "daThanhToan" && (
                                  <>
                                    <input
                                      className="border w-full px-2 py-1 mb-1"
                                      placeholder="Tìm nhanh..."
                                      value={searchDTT}
                                      onChange={(e) =>
                                        setSearchDTT(e.target.value)
                                      }
                                    />

                                    <label className="flex gap-1 items-center mb-1 font-semibold">
                                      <input
                                        type="checkbox"
                                        checked={
                                          filteredDTT.length > 0 &&
                                          filteredDTT.every((dt) =>
                                            excelSelected.daThanhToan.includes(
                                              dt
                                            )
                                          )
                                        }
                                        onChange={() => {
                                          setExcelSelected((prev) => {
                                            const isAllSelected =
                                              filteredDTT.every((dt) =>
                                                prev.daThanhToan.includes(dt)
                                              );
                                            return {
                                              ...prev,
                                              daThanhToan: isAllSelected
                                                ? prev.daThanhToan.filter(
                                                    (x) =>
                                                      !filteredDTT.includes(x)
                                                  )
                                                : [
                                                    ...prev.daThanhToan,
                                                    ...filteredDTT.filter(
                                                      (x) =>
                                                        !prev.daThanhToan.includes(
                                                          x
                                                        )
                                                    ),
                                                  ],
                                            };
                                          });
                                          setPage(1);
                                        }}
                                      />
                                      Chọn tất cả ({filteredDTT.length})
                                    </label>

                                    <div className="max-h-40 overflow-y-auto border p-1">
                                      {filteredDTT.map((dt) => (
                                        <label
                                          key={dt}
                                          className="flex gap-1 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={excelSelected.daThanhToan.includes(
                                              dt
                                            )}
                                            onChange={() =>
                                              setExcelSelected((prev) => ({
                                                ...prev,
                                                daThanhToan:
                                                  prev.daThanhToan.includes(dt)
                                                    ? prev.daThanhToan.filter(
                                                        (x) => x !== dt
                                                      )
                                                    : [...prev.daThanhToan, dt],
                                              }))
                                            }
                                          />
                                          <span className="truncate">
                                            {formatNumber(dt)}
                                          </span>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setExcelSelected((prev) => ({
                                            ...prev,
                                            daThanhToan: [],
                                          }));
                                          setSearchDTT("");
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ===== FILTER CÁC CỘT CÒN LẠI (TEXT / DATE) ===== */}
                                {![
                                  "nameCustomer",
                                  "tenLaiXe",
                                  "bienSoXe",
                                  "dienGiai",
                                  "cuocPhi",
                                  "daThanhToan",
                                ].includes(openFilter) &&
                                  !moneyColumns.includes(openFilter) && (
                                    <>
                                      {["ngayBocHang", "ngayGiaoHang"].includes(
                                        openFilter
                                      ) ? (
                                        <input
                                          type="date"
                                          className="w-full border px-2 py-1 rounded text-black"
                                          value={filters[openFilter] || ""}
                                          onChange={(e) =>
                                            setFilters((p) => ({
                                              ...p,
                                              [openFilter]: e.target.value,
                                            }))
                                          }
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          className="w-full border px-2 py-1 rounded text-black"
                                          placeholder={`Lọc theo ${getColumnLabel(
                                            openFilter
                                          )}`}
                                          value={filters[openFilter] || ""}
                                          onChange={(e) =>
                                            setFilters((p) => ({
                                              ...p,
                                              [openFilter]: e.target.value,
                                            }))
                                          }
                                        />
                                      )}

                                      <div className="flex gap-1 mt-2">
                                        <button
                                          className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                          onClick={() => {
                                            setPage(1);
                                            setOpenFilter(null);
                                          }}
                                        >
                                          Áp dụng
                                        </button>

                                        <button
                                          className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                          onClick={() =>
                                            setFilters((p) => ({
                                              ...p,
                                              [openFilter]: "",
                                            }))
                                          }
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    </>
                                  )}

                                {/* ===== FILTER TIỀN ===== */}
                                {moneyColumns.includes(openFilter) && (
                                  <>
                                    <div className="font-semibold mb-1">
                                      {getColumnLabel(openFilter)}
                                    </div>

                                    <label className="flex items-center gap-1 mb-1">
                                      <input
                                        type="checkbox"
                                        checked={
                                          moneyFilter[openFilter]?.empty ||
                                          false
                                        }
                                        onChange={() =>
                                          setMoneyFilter((p) => {
                                            const isChecked =
                                              p[openFilter]?.empty;

                                            return {
                                              ...p,
                                              [openFilter]: isChecked
                                                ? {} // bỏ chọn
                                                : {
                                                    empty: true,
                                                    filled: false,
                                                  }, // chọn empty => tắt filled
                                            };
                                          })
                                        }
                                      />
                                      Chưa nhập
                                    </label>

                                    <label className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={
                                          moneyFilter[openFilter]?.filled ||
                                          false
                                        }
                                        onChange={() =>
                                          setMoneyFilter((p) => {
                                            const isChecked =
                                              p[openFilter]?.filled;

                                            return {
                                              ...p,
                                              [openFilter]: isChecked
                                                ? {} // bỏ chọn
                                                : {
                                                    filled: true,
                                                    empty: false,
                                                  }, // chọn filled => tắt empty
                                            };
                                          })
                                        }
                                      />
                                      Đã nhập
                                    </label>

                                    <div className="flex gap-1 mt-2">
                                      <button
                                        className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                        onClick={() => {
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Áp dụng
                                      </button>

                                      <button
                                        className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                        onClick={() => {
                                          setMoneyFilter((p) => {
                                            const c = { ...p };
                                            delete c[openFilter];
                                            return c;
                                          });
                                          setPage(1);
                                          setOpenFilter(null);
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>

                                    <hr className="my-2" />
                                  </>
                                )}
                              </div>
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
        ${col.key === "nameCustomer" ? "sticky left-[30px] bg-white z-20" : ""}
        ${MONEY_RIGHT_FIELDS.includes(col.key) ? "text-right" : ""}
      `}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                              }}
                              onClick={() => {
                                if (t.isLocked) {
                                  alert(
                                    "Chuyến đã bị khoá, không được sửa chi phí"
                                  );
                                  return;
                                }
                                openCostModal(t);
                              }}
                            >
                              <div className="text-right">{displayValue}</div>
                            </td>
                          );
                        }

                        if (col.key === "nameCustomer") {
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
                                {t.nameCustomer}
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

                        if (col.key === "isLocked") {
                          return (
                            <td
                              key="isLocked"
                              className="border"
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                              }}
                            >
                              <div
                                className="flex items-center justify-center"
                                onClick={async () => {
                                  await axios.post(
                                    `${API}/odd-debt/toggle-lock`,
                                    { maChuyen: t.maChuyen },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${localStorage.getItem(
                                          "token"
                                        )}`,
                                      },
                                    }
                                  );
                                  loadData();
                                }}
                              >
                                <div
                                  className={`
            w-6 h-6 flex items-center justify-center rounded-full
            cursor-pointer transition
            ${
              t.isLocked
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            }
          `}
                                  title={t.isLocked ? "Đã khoá" : "Đang mở"}
                                >
                                  {t.isLocked ? (
                                    <BsLock size={14} />
                                  ) : (
                                    <BsUnlock size={14} />
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.key}
                            className={`border table-cell
    ${col.key === "nameCustomer" ? "sticky left-[30px] bg-white z-20" : ""}
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
  {/* ===== BÊN TRÁI: TỔNG SỐ CHUYẾN ===== */}
  <div className="font-semibold text-sm">
    Tổng số chuyến:{" "}
    <span className="text-black">{totalTrips}</span>
    {"  "}|| hiển thị:{" "}
    <span className="text-black">{filteredTrips.length}</span>
  </div>

  {/* ===== GIỮA: PHÂN TRANG ===== */}
  <div className="flex items-center gap-2">
    <button
      disabled={page <= 1 || loading}
      onClick={() => loadData(page - 1)}
      className="px-3 py-1 border rounded disabled:opacity-50"
    >
      Trước
    </button>

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

{/* ===== BÊN PHẢI: TỔNG TIỀN | CÒN LẠI ===== */}
<div className="font-semibold text-sm text-right whitespace-nowrap">
  Tổng cước:&nbsp;
  <span className="text-blue-600 text-lg">
    {tongTienAll.toLocaleString()}
  </span>
  {"  "}|
  {"  "}Còn lại:&nbsp;
  <span className="text-red-600 text-lg">
    {conLaiAll.toLocaleString()}
  </span>
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
