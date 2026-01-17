import { useState, useEffect, useRef, useMemo } from "react";
import { format, set } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaEdit,
  FaHistory,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCopy,
} from "react-icons/fa";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import RideModal from "../../components/RideModal";
import RideEditModal from "../../components/RideEditModal";
import RideRequestListModal from "../../components/RideRequestListModal";
import RideHistoryModal from "../../components/RideHistoryModal";
import BoSungSingleModal from "../../components/BoSungSingleModal";
import API from "../../api";

const API_URL = `${API}/schedule-admin`;
const USER_API = `${API}/auth/dieu-van`; // API lấy danh sách điều vận

const normalize = (s = "") =>
  s.toString().normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

// helper để dựng key trong localStorage (theo user)
const prefKey = (userId) => `trips_table_prefs_${userId || "guest"}`;

const columnGroups = [
  {
    label: "LT / ONL / OFF",
    keys: ["ltState", "onlState", "offState"],
  },
  {
    label: "MÃ KH / KH",
    keys: ["maKH", "khachHang"],
  },
  {
    label: "NGÀY ĐÓNG / GIAO",
    keys: ["ngayBocHang", "ngayGiaoHang"],
  },
  {
    label: "ĐIỂM ĐÓNG / GIAO",
    keys: ["diemXepHang", "diemDoHang"],
  },

  {
    label: "ĐIỂM ĐÓNG / GIAO MỚI",
    keys: ["diemXepHangNew", "diemDoHangNew"],
  },
  {
    label: "CHI PHÍ BỐ SUNG",
    keys: [
      "cuocPhiBS",
      "bocXepBS",
      "veBS",
      "hangVeBS",
      "luuCaBS",
      "cpKhacBS",
      "daThanhToan",
    ],
  },
  {
    label: "CHI PHÍ GỐC",
    keys: ["cuocPhi", "bocXep", "ve", "hangVe", "luuCa", "luatChiPhiKhac"],
  },
];

const groupColumnKeys = columnGroups.flatMap((g) => g.keys);

const parseExcelNumber = (val) => {
  if (val === null || val === undefined || val === "") return "0";

  // Excel đã là number
  if (typeof val === "number") {
    return Math.round(val).toString();
  }

  let str = val.toString().trim();

  // bỏ khoảng trắng
  str = str.replace(/\s+/g, "");

  // case: 1.234,56 → 1234.56
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }
  // case: 10000,5 → 10000.5
  else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const num = Number(str);
  if (isNaN(num)) return "0";

  // ✅ làm tròn & trả về STRING
  return Math.round(num).toString();
};


export default function ManageTrip({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [rideDraft, setRideDraft] = useState(null);
  const [managers, setManagers] = useState([]);
  const [today] = useState(new Date());
  const [date, setDate] = useState("");

  const [selectedTrips, setSelectedTrips] = useState([]); // các chuyến được chọn
  const [maHoaDonInput, setMaHoaDonInput] = useState(""); // mã hóa đơn nhập tay

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser?._id || "guest";

  const location = useLocation();
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

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  // 5 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [customers2, setCustomers2] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, customerRes, vehicleRes, addressRes, customer2Res] =
        await Promise.all([
          axios.get(`${API}/drivers/names/list`),
          axios.get(`${API}/customers`),
          axios.get(`${API}/vehicles/names/list`),
          axios.get(`${API}/address/all`),
          axios.get(`${API}/customer2/all`),
        ]);
      setDrivers(driverRes.data);
      setCustomers(customerRes.data);
      setVehicles(vehicleRes.data);
      setAddresses(addressRes.data.data || []);
      setCustomers2(customer2Res.data.data || []);
    };
    fetchData();
  }, []);

  // -------------------------------------
  // CÁC CỘT CHÍNH + MỞ RỘNG → GỘP 1 LIST
  // -------------------------------------
  const allColumns = [
    { key: "ltState", label: "LT" },
    { key: "onlState", label: "ONL" },
    { key: "offState", label: "OFF" },
    { key: "khachHang", label: "KHÁCH HÀNG" },
    { key: "maKH", label: "MÃ KH" },
    { key: "tenLaiXe", label: "TÊN LÁI XE" },
    { key: "dienGiai", label: "DIỄN GIẢI" },
    { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
    { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
    { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
    { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
    { key: "diemXepHangNew", label: "ĐIỂM ĐÓNG MỚI" },
    { key: "diemDoHangNew", label: "ĐIỂM GIAO MỚI" },
    { key: "KHdiemGiaoHang", label: "KH ĐIỂM GIAO" },
    { key: "soDiem", label: "SỐ ĐIỂM" },
    { key: "trongLuong", label: "TRỌNG LƯỢNG" },
    { key: "bienSoXe", label: "BIỂN SỐ XE" },
    { key: "themDiem", label: "THÊM ĐIỂM" },
    { key: "cuocPhiBS", label: "CƯỚC PHÍ" },
    { key: "daThanhToan", label: "ĐÃ THANH TOÁN" },
    { key: "bocXepBS", label: "BỐC XẾP" },
    { key: "veBS", label: "VÉ" },
    { key: "hangVeBS", label: "HÀNG VỀ" },
    { key: "luuCaBS", label: "LƯU CA" },
    { key: "cpKhacBS", label: "CP KHÁC" },
    { key: "maChuyen", label: "MÃ CHUYẾN" },
    { key: "debtCode", label: "MÃ CN" },
    { key: "accountUsername", label: "KẾ TOÁN PHỤ TRÁCH" },
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
    { key: "percentHH", label: "%HH" },
    { key: "moneyHH", label: "TIỀN HH" },
    { key: "moneyConLai", label: "TIỀN CÒN LẠI" },
    { key: "cuocTraXN", label: "CƯỚC TRẢ XE NGOÀI" },
    { key: "doanhThu", label: "DOANH THU" },
    { key: "dieuVan", label: "ĐIỀU VẬN" },
    { key: "createdBy", label: "NGƯỜI NHẬP" },
    { key: "ngayBoc", label: "NGÀY NHẬP" },
  ];

  // ---------------- prefs (order + widths) ----------------
  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key)
  );
  const [hiddenColumns, setHiddenColumns] = useState([]);

  // columnWidths dùng định dạng '120px'
  const [columnWidths, setColumnWidths] = useState(
    Object.fromEntries(
      allColumns.map((c) => [
        c.key,
        ["ltState", "offState", "onlState"].includes(c.key) ? 50 : 80,
      ])
    )
  );

  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // load prefs once when userId changes
  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.order)) {
        // keep only valid keys and append missing columns
        const valid = parsed.order.filter((k) =>
          allColumns.some((ac) => ac.key === k)
        );
        const missing = allColumns
          .map((c) => c.key)
          .filter((k) => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }
      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
      // <<<<<<<<<<<<  THÊM DÒNG NÀY  >>>>>>>>>>>>
      if (Array.isArray(parsed.hiddenColumns)) {
        setHiddenColumns(parsed.hiddenColumns);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [userId]);

  // save prefs when order or widths change (but only after initial load to avoid overwrite)
  useEffect(() => {
    if (!prefsLoaded) return;
    if (!userId) return;
    const payload = {
      order: visibleColumns,
      widths: columnWidths || {},
      hiddenColumns: hiddenColumns || [],
    };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save prefs:", e);
    }
  }, [visibleColumns, columnWidths, hiddenColumns, userId, prefsLoaded]);

  // ---------------- drag & resize refs ----------------
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col width
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(60);
  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, hiddenColumns, rides.length]);

  // ---------------- helpers & fetch ----------------
  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // 🔹 Lấy danh sách điều vận
  const fetchManagers = async () => {
    try {
      const res = await axios.get(USER_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManagers(res.data || []);
    } catch (err) {
      console.error(
        "Lỗi lấy danh sách điều vận:",
        err.response?.data || err.message
      );
    }
  };

  //Lấy thông số xe
  const [vehicleList, setVehicleList] = useState([]);
  const [hoverVehicle, setHoverVehicle] = useState(null);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const res = await axios.get(`${API}/vehicles/names/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicleList(res.data || []);
      } catch (err) {
        console.error("Lỗi tải danh sách xe", err);
      }
    };

    loadVehicles();
  }, []);

  const getVehicleInfo = (plate) => {
    return vehicleList.find(
      (v) => v.plateNumber?.trim().toLowerCase() === plate?.trim().toLowerCase()
    );
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [giaoFrom, setGiaoFrom] = useState(
    () => localStorage.getItem("filter_giaoFrom") || ""
  );
  const [giaoTo, setGiaoTo] = useState(
    () => localStorage.getItem("filter_giaoTo") || ""
  );

  useEffect(() => {
    if (giaoFrom) {
      localStorage.setItem("filter_giaoFrom", giaoFrom);
    }
  }, [giaoFrom]);

  useEffect(() => {
    if (giaoTo) {
      localStorage.setItem("filter_giaoTo", giaoTo);
    }
  }, [giaoTo]);

  const [totalFromBE, setTotalFromBE] = useState(0);
  const moneyColumns = [
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
    "themDiem",
    "cuocPhiBS",
    "bocXepBS",
    "veBS",
    "hangVeBS",
    "luuCaBS",
    "cpKhacBS",
    "moneyHH",
    "moneyConLai",
  ];
  const [moneyFilter, setMoneyFilter] = useState({});

  const filterFields = allColumns
    .filter((col) => !["ltState", "onlState", "offState"].includes(col.key)) // bỏ icon
    .map((col) => {
      const type = col.key.toLowerCase().includes("ngay") ? "date" : "text";
      return { ...col, type };
    });

  const [filters, setFilters] = useState(
    Object.fromEntries(filterFields.map((f) => [f.key, ""]))
  );

  // 🔒 DANH SÁCH GỐC – LƯU CỨNG
  const [excelOptions, setExcelOptions] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
    maHoaDon: [],
    debtCode: [],
  });

  // ✅ DANH SÁCH ĐƯỢC CHỌN
  const [excelSelected, setExcelSelected] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
    maHoaDon: [],
    debtCode: [],
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/accountant/filter-options`, {
        params: {
          fromDate: giaoFrom || undefined,
          toDate: giaoTo || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setExcelOptions(res.data))
      .catch(console.error);
  }, [giaoFrom, giaoTo]);

  const [searchKH, setSearchKH] = useState("");
  const [searchDriver, setSearchDriver] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [searchDGiai, setSearchDGiai] = useState("");
  const [searchCuocPhiBD, setSearchCuocPhiBD] = useState("");
  const [searchMaHoaDon, setSearchMaHoaDon] = useState("");
  const [searchDebtCode, setSearchDebtCode] = useState("");

  const [loading, setLoading] = useState(false);

  const [onlyEmptyMaHoaDon, setOnlyEmptyMaHoaDon] = useState(false);
  const [onlyEmptyDebtCode, setOnlyEmptyDebtCode] = useState(false);

  // 🔹 Lấy tất cả chuyến (có filter)
  const fetchAllRides = async () => {
    try {
      setLoading(true);

      const q = new URLSearchParams();
      q.append("page", page);
      q.append("limit", limit);

      if (giaoFrom) q.append("giaoFrom", giaoFrom);
      if (giaoTo) q.append("giaoTo", giaoTo);

      // 🔥 EXCEL FILTER – DÙNG excelSelected
      if (excelSelected.khachHang.length > 0) {
        excelSelected.khachHang.forEach((v) => q.append("khachHang", v));
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
      if (!onlyEmptyMaHoaDon && excelSelected.maHoaDon.length > 0) {
        excelSelected.maHoaDon.forEach((v) => q.append("maHoaDon", v));
      }

      if (!onlyEmptyDebtCode && excelSelected.debtCode.length > 0) {
        excelSelected.debtCode.forEach((v) => q.append("debtCode", v));
      }

      if (onlyEmptyMaHoaDon) {
        q.append("maHoaDonEmpty", "1");
      }

      if (onlyEmptyDebtCode) {
        q.append("debtCodeEmpty", "1");
      }

      // 🔹 FILTER TEXT
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          q.append(key, value);
        }
      });

      Object.entries(moneyFilter).forEach(([key, val]) => {
        if (val.empty) q.append(`${key}Empty`, "1");
        if (val.filled) q.append(`${key}Filled`, "1");
      });

      // 🔹 FILTER NGÀY RIÊNG
      if (date) {
        q.append("date", format(new Date(date), "yyyy-MM-dd"));
      }

      const res = await axios.get(`${API_URL}/accountant?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.data || [];

      setRides(data);
      setTotalPages(res.data.totalPages || 1);
      setTotalFromBE(res.data.total || 0);

      const w = {};
      data.forEach((d) => {
        if (d.warning === true) w[d._id] = true;
      });
      setWarnings(w);
    } catch (err) {
      console.error(
        "Lỗi khi lấy tất cả chuyến:",
        err.response?.data || err.message
      );
      setRides([]);
      setWarnings({});
    } finally {
      setLoading(false); // 🐱 load xong
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchAllRides();
  }, [
    filters,
    excelSelected.khachHang.join("|"),
    excelSelected.tenLaiXe.join("|"),
    excelSelected.bienSoXe.join("|"),
    excelSelected.dienGiai.join("|"),
    excelSelected.cuocPhi.join("|"),
    excelSelected.maHoaDon.join("|"),
    excelSelected.debtCode.join("|"),
    JSON.stringify(moneyFilter),
    date,
    page,
    limit,
    giaoFrom,
    giaoTo,
    onlyEmptyMaHoaDon,
    onlyEmptyDebtCode,
  ]);

  const [filterPos, setFilterPos] = useState({ x: 0, y: 0 });

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
          maChuyenList: selectedTrips
            .map((id) => rides.find((r) => r._id === id)?.maChuyen)
            .filter(Boolean),
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

  // 🔹 Xuất Excel
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    if (exporting) return; // ⛔ chống bấm nhiều lần

    try {
      if (!giaoFrom || !giaoTo) {
        alert("Vui lòng chọn khoảng ngày");
        return;
      }

      setExporting(true); // 🔒 khóa nút + hiện text

      const payload = {
        from: giaoFrom,
        to: giaoTo,
        maKHs:
          Array.isArray(excelOptions?.khachHang) &&
          excelOptions.khachHang.length > 0
            ? excelOptions.khachHang
            : undefined,
      };

      const res = await axios.post(
        `${API_URL}/export-excel-by-range`,
        payload,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      saveAs(
        new Blob([res.data]),
        `DANH_SACH_CHUYEN_${giaoFrom}_den_${giaoTo}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Xuất Excel thất bại");
    } finally {
      setExporting(false); // 🔓 mở lại nút (dù lỗi hay thành công)
    }
  };

  const exportToExcelBS = async () => {
    if (exporting) return;

    try {
      if (!giaoFrom || !giaoTo) {
        alert("Vui lòng chọn khoảng ngày");
        return;
      }

      setExporting(true);

      const payload = {
        from: giaoFrom,
        to: giaoTo,
        maKHs:
          Array.isArray(excelOptions?.khachHang) &&
          excelOptions.khachHang.length > 0
            ? excelOptions.khachHang
            : undefined,
      };

      const res = await axios.post(
        `${API_URL}/export-excel-by-range-bs`,
        payload,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      saveAs(
        new Blob([res.data]),
        `DANH_SACH_CHUYEN_BS_${giaoFrom}_den_${giaoTo}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  // ---- Excel bổ sung
  const [excelData, setExcelData] = useState([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [showFileStatus, setShowFileStatus] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);

  const handleSelectExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingFile(true);
    setShowFileStatus(false);
    setLoadedCount(0);
    setRemainingCount(0);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const updates = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      // Kiểm tra row có dữ liệu thật sự không
      const hasData = Object.values(row).some(
        (val) =>
          val !== null && val !== undefined && val.toString().trim() !== ""
      );
      if (!hasData) continue; // bỏ qua dòng trống

      const obj = {};
      for (let k in row) {
        const cleanKey = k.trim().toUpperCase().replace(/\s+/g, " ");
        obj[cleanKey] = row[k];
      }

      const r = {
        maChuyen: obj["MÃ CHUYẾN"] || obj["MA CHUYEN"] || "",
        ltState: (obj["LT"] ?? "").toString(),
        onlState: (obj["ONL"] ?? "").toString(),
        offState: (obj["OFF"] ?? "").toString(),
        cuocPhiBS: parseExcelNumber(obj["CƯỚC PHÍ"] ?? obj["CUOC PHI"]),
        bocXepBS: parseExcelNumber(obj["BỐC XẾP"]),
        veBS: parseExcelNumber(obj["VÉ"]),
        hangVeBS: parseExcelNumber(obj["HÀNG VỀ"]),
        luuCaBS: parseExcelNumber(obj["LƯU CA"]),
        cpKhacBS: parseExcelNumber(obj["CP KHÁC"]),
        themDiem: parseExcelNumber(obj["THÊM ĐIỂM"]),
      };

      // Chỉ push nếu có mã chuyến
      if (r.maChuyen) updates.push(r);
    }

    // Cập nhật state 1 lần duy nhất sau khi duyệt hết
    setExcelData(updates);
    setLoadedCount(updates.length);
    setRemainingCount(0);
    setLoadingFile(false);
    setShowFileStatus(true);
  };

  const handleAddCuocPhiBoSung = async () => {
    if (!excelData.length) return alert("Vui lòng chọn file Excel trước!");

    setLoadingImport(true);
    setLoadedCount(0);
    setRemainingCount(excelData.length);

    const failed = [];

    for (let i = 0; i < excelData.length; i++) {
      const item = excelData[i];
      try {
        await axios.post(
          `${API_URL}/add-bo-sung`,
          { updates: [item] }, // gửi từng chuyến
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        failed.push(item.maChuyen);
        console.error("Lỗi chuyến", item.maChuyen, err);
      }

      setLoadedCount((prev) => prev + 1);
      setRemainingCount((prev) => prev - 1);
    }

    setLoadingImport(false);
    setShowFileStatus(false); // ẩn text sau khi import xong
    setExcelData([]);
    const input = document.getElementById("excelInput");
    if (input) input.value = "";
    fetchAllRides();

    if (failed.length) {
      alert(`Một số chuyến không cập nhật được: ${failed.join(", ")}`);
    } else {
      alert("Cập nhật cước phí bổ sung thành công!");
    }
  };

  const [importHoaDonLoading, setImportHoaDonLoading] = useState(false);

  const handleImportHoaDonExcel = async (file) => {
    if (!file) return;

    const input = document.getElementById("importHoaDonInput"); // nhớ gán id cho input

    try {
      setImportHoaDonLoading(true);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // 👉 Đọc raw theo dạng mảng (A, B, C…)
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1, // mảng 2 chiều
        defval: "",
      });

      const records = [];

      // 👉 BỎ DÒNG 1 (header), bắt đầu từ dòng 2 → index = 1
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const maChuyen =
          row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";

        const maHoaDon =
          row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : "";

        if (maChuyen && maHoaDon) {
          records.push({ maChuyen, maHoaDon });
        }
      }

      console.log("ROWS:", rows);
      console.log("RECORDS:", records);

      if (!records.length) {
        alert("Không có dữ liệu mã chuyến / mã hoá đơn hợp lệ");
        return;
      }

      await axios.post(
        `${API_URL}/import-hoa-don`,
        { records },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Import thành công ${records.length} chuyến`);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Import hoá đơn thất bại");
    } finally {
      setImportHoaDonLoading(false);

      // ✅ RESET FILE INPUT DÙ THÀNH CÔNG HAY THẤT BẠI
      if (input) input.value = "";
    }
  };

  const handleImportCTXNExcel = async (file) => {
    if (!file) return;

    const input = document.getElementById("importHoaDonInput");

    try {
      setImportHoaDonLoading(true);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      const records = [];

      // bỏ header, bắt đầu từ dòng 2
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const maChuyen =
          row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";

        const cuocTraXN =
          row[1] !== undefined && row[1] !== null ? Number(row[1]) || 0 : 0;

        if (maChuyen) {
          records.push({ maChuyen, cuocTraXN });
        }
      }

      if (!records.length) {
        alert("Không có dữ liệu mã chuyến hợp lệ");
        return;
      }

      console.log(records);

      await axios.post(
        `${API_URL}/import-ctxn`,
        { records },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Import thành công ${records.length} chuyến`);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Import cước trả XN thất bại");
    } finally {
      setImportHoaDonLoading(false);
      if (input) input.value = "";
    }
  };

  // 🔹 Xoá mã hóa đơn cho các chuyến đã chọn (dùng chung checkbox)
  const removeMaHoaDon = async () => {
    if (!selectedTrips.length) return alert("Vui lòng chọn ít nhất 1 chuyến!");

    if (!window.confirm("Bạn có chắc muốn xoá mã hoá đơn các chuyến đã chọn?"))
      return;

    try {
      const res = await axios.post(
        `${API_URL}/remove-hoa-don`,
        {
          maChuyenList: selectedTrips
            .map((id) => rides.find((r) => r._id === id)?.maChuyen)
            .filter(Boolean),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setSelectedTrips([]);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xoá mã hoá đơn");
    }
  };

  const [openBoSung, setOpenBoSung] = useState(false);
  const [selectedRideBS, setSelectedRideBS] = useState(null);

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

      return true; // important
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
      const res = await axios.get(`${API_URL}/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyRequests(res.data.data || []);
    } catch (err) {
      console.error(
        "Lỗi lấy yêu cầu của tôi:",
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const openMyRequests = () => {
    fetchMyRequests();
    setShowMyRequestModal(true);
  };

  // ---------- Drag & Drop for columns (native) ----------
  const onDragStart = (e, colKey) => {
    dragColRef.current = colKey;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", colKey);
    } catch (err) {
      // some browsers may throw on setData; ignore
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    const src = dragColRef.current || e.dataTransfer.getData("text/plain");
    if (!src || src === targetKey) return;
    const idxSrc = visibleColumns.indexOf(src);
    const idxTarget = visibleColumns.indexOf(targetKey);
    if (idxSrc === -1 || idxTarget === -1) return;
    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
    dragColRef.current = null;
  };

  // ---------- Resizable columns (mouse handlers) ----------
  const onMouseDownResize = (e, colKey) => {
    e.preventDefault();
    const th = e.target.closest("th");
    const startWidth = th ? th.offsetWidth : 120;
    resizingRef.current = { columnKey: colKey, startX: e.clientX, startWidth };
    window.addEventListener("mousemove", onMouseMoveResize);
    window.addEventListener("mouseup", onMouseUpResize);
  };

  const onMouseMoveResize = (e) => {
    const r = resizingRef.current;
    if (!r.columnKey) return;
    const delta = e.clientX - r.startX;
    let newWidth = r.startWidth + delta;
    if (newWidth < 10) newWidth = 10;
    setColumnWidths((prev) => ({ ...prev, [r.columnKey]: `${newWidth}px` }));
  };

  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      return;
    }

    const th = document.querySelector(`th[data-col="${colKey}"]`);
    const finalWidth = th
      ? th.offsetWidth + "px"
      : columnWidths[colKey] || "80px";

    // update state AND persist widths immediately into localStorage (merge)
    setColumnWidths((prev) => {
      const updated = { ...prev, [colKey]: finalWidth };
      try {
        const prefs = JSON.parse(localStorage.getItem(prefKey(userId))) || {};
        prefs.widths = updated;
        prefs.order = prefs.order || visibleColumns;
        localStorage.setItem(prefKey(userId), JSON.stringify(prefs));
      } catch (e) {
        console.warn("Failed to persist width:", e);
      }
      return updated;
    });

    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
  };

  const [showColumnBox, setShowColumnBox] = useState(false);
  const [showActionColumn, setShowActionColumn] = useState(true);
  const boxRef = useRef(null);

  // tắt dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowColumnBox(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Bật tắt cảnh báo
  const [warnings, setWarnings] = useState({});

  const toggleWarning = async (rideId) => {
    try {
      const res = await axios.put(
        `${API_URL}/warning/${rideId}`,
        {}, // body rỗng
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newWarningState = res.data.warning;

      setWarnings((prev) => ({
        ...prev,
        [rideId]: newWarningState,
      }));
    } catch (err) {
      console.error("Toggle warning failed ", err);
    }
  };

  const numberColumns = [
    "cuocPhi",
    "cuocPhiBS",
    "bocXep",
    "bocXepBS",
    "ve",
    "veBS",
    "hangVe",
    "hangVeBS",
    "luuCa",
    "luuCaBS",
    "cpKhacBS",
    "luatChiPhiKhac",
    "khoangCach",
    "laiXeThuCuoc",
    "daThanhToan",
    "themDiem",
    "moneyHH",
    "moneyConLai",
    "cuocTraXN",
    "doanhThu",
  ];

  const formatNumber = (n) => {
    if (n == null || n === "") return "";
    const num = Number(n.toString().replace(/\./g, "").replace(/,/g, ""));
    if (isNaN(num)) return n;
    return num.toLocaleString("vi-VN"); // vì VN: 1.234.567
  };

  const [openFilter, setOpenFilter] = useState(null);

  useEffect(() => {
    const close = (e) => {
      const th = e.target.closest("th[data-col]");
      if (!th) setOpenFilter(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows(
      (prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id) // bỏ ra
          : [...prev, id] // thêm vào
    );
  };

  const getColumnLabel = (key) => {
    return allColumns.find((c) => c.key === key)?.label || key;
  };

  const [showModal, setShowModal] = useState(false);
  const handleAdd = () => {
    setRideDraft([]);
    setShowModal(true);
  };
  const COPY_FIELDS = [
    // Người & xe
    "tenLaiXe",
    "bienSoXe",

    // Khách
    "khachHang",
    "maKH",
    "keToanPhuTrach",
    "accountUsername",

    // Mô tả chuyến
    "dienGiai",
    "ngayBocHang",
    "ngayGiaoHang",

    // Địa điểm
    "diemXepHang",
    "diemXepHangNew",
    "diemDoHang",
    "diemDoHangNew",
    "KHdiemGiaoHang",

    // Thông tin hàng
    "soDiem",
    "trongLuong",

    // Tiền cơ bản (tuỳ mày có cho copy hay không)
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
    "laiXeThuCuoc",
  ];

  const buildCopySchedule = (schedule) => {
    const result = {};

    COPY_FIELDS.forEach((key) => {
      if (schedule[key] !== undefined && schedule[key] !== null) {
        result[key] = schedule[key];
      }
    });

    return result;
  };

  const handleCopyRide = (ride) => {
    const copied = {
      // ✅ chỉ lấy data sạch
      ...buildCopySchedule(ride),

      // ✅ format ngày nếu cần cho input date
      ngayBocHang: ride.ngayBocHang
        ? format(new Date(ride.ngayBocHang), "yyyy-MM-dd")
        : "",

      ngayGiaoHang: ride.ngayGiaoHang
        ? format(new Date(ride.ngayGiaoHang), "yyyy-MM-dd")
        : "",

      // ❌ KHÔNG copy các field hệ thống
      maChuyen: undefined,
      ngayBoc: undefined,

      // ✅ gán người tạo mới
      createdByID: currentUser._id,
      createdBy: currentUser.fullname,
      dieuVanID: currentUser._id,
      dieuVan: currentUser.fullname,
    };

    setRideDraft(copied);
    setShowModal(true);
  };

  const handleSave = async (payload) => {
    try {
      // chỉ POST, không check editRide
      const res = await axios.post(API_URL, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // thêm vào state
      setRides((prev) => [...prev, res.data]);

      // nếu cần fetch lại danh sách
      fetchAllRides();
      alert("Thêm chuyến thành công !");
      // đóng modal
      setShowModal(false);
    } catch (err) {
      alert("Không lưu được: " + err.response?.data?.error);
    }
  };

  const filteredKhachHang = excelOptions.khachHang.filter((c) => {
    if (!searchKH) return true;
    return normalize(c).includes(normalize(searchKH));
  });

  const filteredTenLaiXe = excelOptions.tenLaiXe.filter((d) => {
    if (!searchDriver) return true;
    return normalize(d).includes(normalize(searchDriver));
  });

  const filteredBienSoXe = excelOptions.bienSoXe.filter((p) => {
    if (!searchPlate) return true;
    return normalize(p).includes(normalize(searchPlate));
  });

  const filteredDienGiai = excelOptions.dienGiai.filter((dg) => {
    if (!searchDGiai) return true;
    return normalize(dg).includes(normalize(searchDGiai));
  });

  const filteredCuocPhi = excelOptions.cuocPhi.filter((cp) => {
    if (!searchCuocPhiBD) return true;
    return normalize(cp).includes(normalize(searchCuocPhiBD));
  });

  const filteredMaHoaDon = excelOptions.maHoaDon.filter((m) => {
    if (onlyEmptyMaHoaDon && m) return false;

    if (!searchMaHoaDon) return true;

    return normalize(m || "").includes(normalize(searchMaHoaDon));
  });

  const filteredDebtCode = excelOptions.debtCode.filter((d) => {
    if (onlyEmptyDebtCode && d) return false;

    if (!searchDebtCode) return true;

    return normalize(d || "").includes(normalize(searchDebtCode));
  });

  // ---------- Render ----------
  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
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
            if (!currentUser?.permissions?.includes("edit_trip")) {
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
      <div className="flex flex-wrap gap-2 mb-3 items-center w-full">
        {/* Filter điều vận riêng */}
        <select
          value={filters.dieuVanID}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dieuVanID: e.target.value }))
          }
          className="border rounded px-3 py-2"
        >
          <option value="">-- Lọc theo điều vận --</option>
          {managers.map((m) => (
            <option key={m._id} value={m._id}>
              {m.fullname}
            </option>
          ))}
        </select>
        <div className="flex gap-2 items-center">
          <label>Từ ngày giao:</label>
          <input
            type="date"
            value={giaoFrom}
            onChange={(e) => {
              setPage(1);
              setGiaoFrom(e.target.value);
            }}
            onClick={(e) => e.target.showPicker()}
            className="border px-2 py-1 rounded cursor-pointer"
          />

          <label>Đến:</label>
          <input
            type="date"
            value={giaoTo}
            onChange={(e) => {
              setPage(1);
              setGiaoTo(e.target.value);
            }}
            onClick={(e) => e.target.showPicker()}
            className="border px-2 py-1 rounded cursor-pointer"
          />
        </div>
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
          disabled={exporting}
          className={`px-4 py-2 rounded-lg shadow-sm text-white
    ${
      exporting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-500 hover:bg-blue-600"
    }
  `}
        >
          Xuất File gốc
        </button>

        <button
          onClick={exportToExcelBS}
          disabled={exporting}
          className={`px-4 py-2 rounded-lg shadow-sm text-white
    ${
      exporting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-500 hover:bg-blue-600"
    }
  `}
        >
          Xuất File BS
        </button>

        <div className="flex items-center gap-2">
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
          {/* IMPORT HOÁ ĐƠN */}
          <label className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
            {importHoaDonLoading ? "Đang import..." : "Import hoá đơn"}
            <input
              id="importHoaDonInput"
              type="file"
              hidden
              accept=".xlsx,.xls, .xlsm"
              disabled={importHoaDonLoading}
              onChange={(e) => handleImportHoaDonExcel(e.target.files[0])}
            />
          </label>

          {/* IMPORT CƯỚC TRẢ XE NGOÀI */}
          <label className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
            {importHoaDonLoading
              ? "Đang import..."
              : "Import cước trả xe ngoài"}
            <input
              id="importHoaDonInput"
              type="file"
              hidden
              accept=".xlsx,.xls, .xlsm"
              disabled={importHoaDonLoading}
              onClick={(e) => {
                e.target.value = null;
              }}
              onChange={(e) => handleImportCTXNExcel(e.target.files[0])}
            />
          </label>

          {/* Text tiến trình cùng dòng */}
          {(showFileStatus || loadingImport) && (
            <span
              className={`ml-3 ${
                loadingImport ? "text-green-600" : "text-blue-600"
              }`}
            >
              {loadingImport
                ? `Vui lòng chờ import... Đã import: ${loadedCount} | Còn lại: ${remainingCount}`
                : `Đã load file... Đã load: ${loadedCount} / ${
                    loadedCount + remainingCount
                  } | Còn lại: ${remainingCount}`}
            </span>
          )}

          {exporting && (
            <span className="text-red-600 font-medium ml-2">
              Đang xuất file, vui lòng chờ...!
            </span>
          )}
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
        <button
          className="bg-gray-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          onClick={removeMaHoaDon}
          disabled={!selectedTrips.length}
        >
          Xoá mã hoá đơn
        </button>
        <span className="text-sm text-gray-600">
          Đã chọn {selectedTrips.length} chuyến
          {selectedTrips.length > 0 &&
            `: ${selectedTrips
              .map((id) => rides.find((r) => r._id === id)?.maChuyen)
              .filter(Boolean)
              .join(", ")}`}
        </span>
      </div>

      {/* UI CHỌN HIỆN / ẨN CỘT */}
      <div className="w-full flex items-center justify-between mb-2 text-xs">
        {/* BÊN TRÁI: Hiện / Ẩn cột */}
        <div className="relative inline-block" ref={boxRef}>
          <button
            onClick={() => setShowColumnBox(!showColumnBox)}
            className="px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
          >
            Hiện / Ẩn cột
          </button>

          {showColumnBox && (
            <div className="absolute left-0 mt-2 w-64 bg-white border rounded-lg shadow-xl p-3 z-[1000]">
              {/* Nút chọn tất cả + bỏ tất cả */}
              <div className="flex gap-2 mb-3">
                <button
                  className="flex-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={() => setHiddenColumns([])}
                >
                  Chọn tất cả
                </button>

                <button
                  className="flex-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => setHiddenColumns(allColumns.map((c) => c.key))}
                >
                  Bỏ tất cả
                </button>
              </div>

              {/* Danh sách cột */}
              <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                <label className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-gray-100 px-1 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={showActionColumn}
                    onChange={() => setShowActionColumn((p) => !p)}
                  />
                  HÀNH ĐỘNG
                </label>
                {columnGroups.map((g) => (
                  <label
                    key={g.label}
                    className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={g.keys.every((k) => !hiddenColumns.includes(k))}
                      onChange={() => {
                        setHiddenColumns((prev) => {
                          const dangHien = g.keys.every(
                            (k) => !prev.includes(k)
                          );
                          return dangHien
                            ? [...new Set([...prev, ...g.keys])]
                            : prev.filter((k) => !g.keys.includes(k));
                        });
                      }}
                    />
                    {g.label}
                  </label>
                ))}
                {allColumns
                  .filter((col) => !groupColumnKeys.includes(col.key))
                  .map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.key)}
                        onChange={() => {
                          setHiddenColumns((prev) =>
                            prev.includes(col.key)
                              ? prev.filter((k) => k !== col.key)
                              : [...prev, col.key]
                          );
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* BÊN PHẢI: + Thêm & Xóa lọc */}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            + Thêm chuyến
          </button>

          <button
            onClick={() => {
              setFilters(
                Object.fromEntries(filterFields.map((f) => [f.key, ""]))
              );
              setExcelSelected({
                khachHang: [],
                tenLaiXe: [],
                bienSoXe: [],
                dienGiai: [],
                cuocPhi: [],
                maHoaDon: [],
                debtCode: [],
              });
              setSearchKH("");
              setSearchCuocPhiBD("");
              setSearchDGiai("");
              setSearchDebtCode("");
              setSearchDriver("");
              setSearchPlate("");
              setSearchMaHoaDon("");
              setMoneyFilter("");
              setPage(1);
            }}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {/* BẢNG */}
      <div className="overflow-auto border" style={{ maxHeight: "80vh" }}>
        <table
          style={{
            tableLayout: "auto",
            width: "max-content",
            maxWidth: "max-content",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead className="bg-blue-600 text-white">
            <tr>
              {/* CỘT 1: SỬA */}
              {showActionColumn && (
                <th
                  className="border bg-blue-600 text-white"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 60,
                    width: 80,
                    textAlign: "center",
                    background: "#2563eb",
                  }}
                >
                  HÀNH ĐỘNG
                </th>
              )}

              {/* CỘT 2: CHECKBOX HEADER */}
              <th
                className="border bg-blue-600 text-white"
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 60,
                  width: 40,
                  textAlign: "center",
                  background: "#2563eb",
                }}
              >
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

              {/* RENDER CÁC CỘT KHÁC */}
              {visibleColumns.map((colKey, index) => {
                if (hiddenColumns.includes(colKey)) return null;
                const col = allColumns.find((c) => c.key === colKey) || {
                  key: colKey,
                  label: colKey,
                };
                const width = columnWidths[col.key] || 1 + "px";
                const fieldType =
                  filterFields.find((f) => f.key === col.key)?.type || "text";
                const dateFields = ["ngayBoc", "ngayBocHang", "ngayGiaoHang"];

                // LEFT OFFSET CHO 2 CỘT CỐ ĐỊNH TIẾP THEO
                let leftOffset = null;
                if (index === 0) leftOffset = 40;
                if (index === 1) leftOffset = 40 + width;

                const stickyColumns = ["khachHang", "maKH"];
                const stickyIndex = stickyColumns.indexOf(col.key);
                if (stickyIndex >= 0) {
                  leftOffset = 40;
                  for (let i = 0; i < stickyIndex; i++) {
                    const key = stickyColumns[i];
                    leftOffset += parseInt(columnWidths[key] || 120);
                  }
                }

                return (
                  <th
                    key={col.key}
                    data-col={col.key}
                    draggable // ⭐ BẮT BUỘC ĐỂ KÉO CỘT
                    onDragStart={(e) => onDragStart(e, col.key)} // ⭐ BẮT ĐẦU KÉO
                    onDragOver={onDragOver} // ⭐ ĐỂ MỤC TIÊU NHẬN DROP
                    onDrop={(e) => onDrop(e, col.key)} // ⭐ THẢ CỘT
                    className="border p-0 bg-blue-600 text-white relative select-none"
                    style={{
                      position: "sticky",
                      top: 0,
                      left: stickyIndex >= 0 ? leftOffset : undefined,
                      zIndex: stickyIndex >= 0 ? 60 : 50,
                      background: "#2563eb",
                      width,
                      minWidth: ["ltState", "offState", "onlState"].includes(
                        col.key
                      )
                        ? 5
                        : width,
                      maxWidth: width,
                      overflow: "visible",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    // ⭐ NGĂN VIỆC NHẤP VÀO LẠI CHẶN DRAG
                    onMouseDown={(e) => {
                      if (e.target.tagName !== "TH") e.stopPropagation();
                    }}
                  >
                    {/* LABEL */}
                    <div
                      className="p-2 flex items-center justify-center w-full text-center text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFilterPos({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setOpenFilter(col.key);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <span
                        className="text-center"
                        style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: "14px",
                          display: "block",
                          maxHeight: "28px", // = 2 dòng
                          overflow: "hidden",
                        }}
                      >
                        {col.label}
                      </span>
                    </div>

                    {/* RESIZE HANDLE */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResize(e, col.key);
                      }}
                      style={{
                        width: 10,
                        cursor: "col-resize",
                        height: "100%",
                        position: "absolute",
                        right: 0,
                        top: 0,
                        zIndex: 80,
                      }}
                    />

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
                        {openFilter === "khachHang" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchKH}
                              onChange={(e) => setSearchKH(e.target.value)}
                            />

                            <label className="flex gap-1 items-center mb-1 font-semibold">
                              <input
                                type="checkbox"
                                checked={
                                  filteredKhachHang.length > 0 &&
                                  filteredKhachHang.every((c) =>
                                    excelSelected.khachHang.includes(c)
                                  )
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => {
                                    const isAllSelected =
                                      filteredKhachHang.every((c) =>
                                        prev.khachHang.includes(c)
                                      );

                                    return {
                                      ...prev,
                                      khachHang: isAllSelected
                                        ? prev.khachHang.filter(
                                            (x) =>
                                              !filteredKhachHang.includes(x)
                                          )
                                        : [
                                            ...prev.khachHang,
                                            ...filteredKhachHang.filter(
                                              (x) => !prev.khachHang.includes(x)
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
                                    checked={excelSelected.khachHang.includes(
                                      c
                                    )}
                                    onChange={() =>
                                      setExcelSelected((p) => ({
                                        ...p,
                                        khachHang: p.khachHang.includes(c)
                                          ? p.khachHang.filter((x) => x !== c)
                                          : [...p.khachHang, c],
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
                                    khachHang: [],
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
                              onChange={(e) => setSearchDriver(e.target.value)}
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
                                            (x) => !filteredTenLaiXe.includes(x)
                                          )
                                        : [
                                            ...prev.tenLaiXe,
                                            ...filteredTenLaiXe.filter(
                                              (x) => !prev.tenLaiXe.includes(x)
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
                                    checked={excelSelected.tenLaiXe.includes(d)}
                                    onChange={() =>
                                      setExcelSelected((p) => ({
                                        ...p,
                                        tenLaiXe: p.tenLaiXe.includes(d)
                                          ? p.tenLaiXe.filter((x) => x !== d)
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
                              onChange={(e) => setSearchPlate(e.target.value)}
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
                                            (x) => !filteredBienSoXe.includes(x)
                                          )
                                        : [
                                            ...prev.bienSoXe,
                                            ...filteredBienSoXe.filter(
                                              (x) => !prev.bienSoXe.includes(x)
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
                                    checked={excelSelected.bienSoXe.includes(p)}
                                    onChange={() =>
                                      setExcelSelected((s) => ({
                                        ...s,
                                        bienSoXe: s.bienSoXe.includes(p)
                                          ? s.bienSoXe.filter((x) => x !== p)
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
                              onChange={(e) => setSearchDGiai(e.target.value)}
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
                                            (x) => !filteredDienGiai.includes(x)
                                          )
                                        : [
                                            ...prev.dienGiai,
                                            ...filteredDienGiai.filter(
                                              (x) => !prev.dienGiai.includes(x)
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
                                        dienGiai: prev.dienGiai.includes(dg)
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
                                    const isAllSelected = filteredCuocPhi.every(
                                      (cp) => prev.cuocPhi.includes(cp)
                                    );
                                    return {
                                      ...prev,
                                      cuocPhi: isAllSelected
                                        ? prev.cuocPhi.filter(
                                            (x) => !filteredCuocPhi.includes(x)
                                          )
                                        : [
                                            ...prev.cuocPhi,
                                            ...filteredCuocPhi.filter(
                                              (x) => !prev.cuocPhi.includes(x)
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
                                    checked={excelSelected.cuocPhi.includes(cp)}
                                    onChange={() =>
                                      setExcelSelected((prev) => ({
                                        ...prev,
                                        cuocPhi: prev.cuocPhi.includes(cp)
                                          ? prev.cuocPhi.filter((x) => x !== cp)
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
                        {/* ===== FILTER MA HOA DON (STRING) ===== */}
                        {openFilter === "maHoaDon" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchMaHoaDon}
                              onChange={(e) =>
                                setSearchMaHoaDon(e.target.value)
                              }
                            />

                            <label className="flex gap-1 items-center mb-1 text-red-600 font-semibold">
                              <input
                                type="checkbox"
                                checked={onlyEmptyMaHoaDon}
                                onChange={() => {
                                  setOnlyEmptyMaHoaDon((p) => !p);
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    maHoaDon: [],
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chưa nhập
                            </label>

                            <label className="flex gap-1 items-center mb-1 font-semibold">
                              <input
                                type="checkbox"
                                checked={
                                  filteredMaHoaDon.length > 0 &&
                                  filteredMaHoaDon.every((m) =>
                                    excelSelected.maHoaDon.includes(m)
                                  )
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => {
                                    const isAllSelected =
                                      filteredMaHoaDon.every((m) =>
                                        prev.maHoaDon.includes(m)
                                      );
                                    return {
                                      ...prev,
                                      maHoaDon: isAllSelected
                                        ? prev.maHoaDon.filter(
                                            (x) => !filteredMaHoaDon.includes(x)
                                          )
                                        : [
                                            ...prev.maHoaDon,
                                            ...filteredMaHoaDon.filter(
                                              (x) => !prev.maHoaDon.includes(x)
                                            ),
                                          ],
                                    };
                                  });
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả ({filteredMaHoaDon.length})
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {filteredMaHoaDon.map((cp) => (
                                <label
                                  key={cp}
                                  className="flex gap-1 items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={excelSelected.maHoaDon.includes(
                                      cp
                                    )}
                                    onChange={() =>
                                      setExcelSelected((prev) => ({
                                        ...prev,
                                        maHoaDon: prev.maHoaDon.includes(cp)
                                          ? prev.maHoaDon.filter(
                                              (x) => x !== cp
                                            )
                                          : [...prev.maHoaDon, cp],
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
                                    maHoaDon: [],
                                  }));
                                  setSearchMaHoaDon("");
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER MA CN (STRING) ===== */}
                        {openFilter === "debtCode" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchDebtCode}
                              onChange={(e) =>
                                setSearchDebtCode(e.target.value)
                              }
                            />
                            <label className="flex gap-1 items-center mb-1 text-red-600 font-semibold">
                              <input
                                type="checkbox"
                                checked={onlyEmptyDebtCode}
                                onChange={() => {
                                  setOnlyEmptyDebtCode((p) => !p);
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    debtCode: [],
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chưa có KCN
                            </label>

                            <label className="flex gap-1 items-center mb-1 font-semibold">
                              <input
                                type="checkbox"
                                checked={
                                  filteredDebtCode.length > 0 &&
                                  filteredDebtCode.every((d) =>
                                    excelSelected.debtCode.includes(d)
                                  )
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => {
                                    const isAllSelected =
                                      filteredDebtCode.every((d) =>
                                        prev.debtCode.includes(d)
                                      );
                                    return {
                                      ...prev,
                                      debtCode: isAllSelected
                                        ? prev.debtCode.filter(
                                            (x) => !filteredDebtCode.includes(x)
                                          )
                                        : [
                                            ...prev.debtCode,
                                            ...filteredDebtCode.filter(
                                              (x) => !prev.debtCode.includes(x)
                                            ),
                                          ],
                                    };
                                  });
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả ({filteredDebtCode.length})
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {filteredDebtCode.map((cp) => (
                                <label
                                  key={cp}
                                  className="flex gap-1 items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={excelSelected.debtCode.includes(
                                      cp
                                    )}
                                    onChange={() =>
                                      setExcelSelected((prev) => ({
                                        ...prev,
                                        debtCode: prev.debtCode.includes(cp)
                                          ? prev.debtCode.filter(
                                              (x) => x !== cp
                                            )
                                          : [...prev.debtCode, cp],
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
                                    debtCode: [],
                                  }));
                                  setSearchDebtCode("");
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
                          "khachHang",
                          "tenLaiXe",
                          "bienSoXe",
                          "dienGiai",
                          "cuocPhi",
                          "maHoaDon",
                          "debtCode",
                        ].includes(openFilter) &&
                          !moneyColumns.includes(openFilter) && (
                            <>
                              {[
                                "ngayBoc",
                                "ngayBocHang",
                                "ngayGiaoHang",
                              ].includes(openFilter) ? (
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
                                  moneyFilter[openFilter]?.empty || false
                                }
                                onChange={() =>
                                  setMoneyFilter((p) => {
                                    const isChecked = p[openFilter]?.empty;

                                    return {
                                      ...p,
                                      [openFilter]: isChecked
                                        ? {} // bỏ chọn
                                        : { empty: true, filled: false }, // chọn empty => tắt filled
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
                                  moneyFilter[openFilter]?.filled || false
                                }
                                onChange={() =>
                                  setMoneyFilter((p) => {
                                    const isChecked = p[openFilter]?.filled;

                                    return {
                                      ...p,
                                      [openFilter]: isChecked
                                        ? {} // bỏ chọn
                                        : { filled: true, empty: false }, // chọn filled => tắt empty
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
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Đang load */}
            {loading && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-6 text-center"
                >
                  <div className="flex items-center justify-center gap-3 text-blue-500">
                    <span className="text-3xl animate-pulse">🐈💨</span>
                    <span className="italic">Mèo đang chạy lấy dữ liệu…</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Load xong nhưng rỗng */}
            {!loading && rides.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}

            {rides.map((r) => (
              <tr
                key={r._id}
                className={`text-center cursor-pointer ${
                  selectedRows.includes(r._id)
                    ? "bg-yellow-400" // 🔥 chữ vàng + đậm
                    : "text-black"
                } hover:bg-gray-100`}
                onClick={() => toggleRowHighlight(r._id)}
              >
                {/* CỘT 1: HÀNH ĐỘNG */}
                {showActionColumn && (
                  <td
                    className="border p-1 bg-white"
                    style={{
                      position: "sticky",
                      zIndex: 50,
                      background: "#fff",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      {/* Nút sửa */}
                      <button
                        onClick={() => openEditRide(r)}
                        className="p-1.5 bg-yellow-400 text-white rounded-lg shadow-sm hover:bg-yellow-500 hover:shadow-md transition"
                        title="Sửa chuyến"
                      >
                        <FaEdit className="w-2 h-2" />
                      </button>

                      {/* Nút cảnh báo */}
                      <button
                        onClick={() => toggleWarning(r._id)}
                        className={`p-1.5 rounded-lg shadow-sm transition ${
                          warnings[r._id]
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title="Đánh dấu cảnh báo"
                      >
                        <FaExclamationTriangle className="w-2 h-2" />
                      </button>

                      {/* Lịch sử chỉnh sửa */}
                      {editCounts[r._id] > 0 ? (
                        <button
                          onClick={() => handleViewHistory(r)}
                          className="relative p-1.5 bg-green-50 rounded-lg shadow-sm hover:bg-green-100 transition"
                          title="Lịch sử chỉnh sửa"
                        >
                          <FaHistory className="text-green-600 w-2 h-2" />

                          {/* Badge số lần */}
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-2 h-2 flex items-center justify-center rounded-full shadow">
                            {editCounts[r._id]}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">null</span>
                      )}

                      <button
                        onClick={() => handleCopyRide(r)}
                        className="p-1.5 bg-gray-400 text-white rounded-lg shadow-sm hover:bg-green-500 hover:shadow-md transition"
                        title="Nhân bản"
                      >
                        <FaCopy className="w-2 h-2" />
                      </button>
                    </div>
                  </td>
                )}

                {/* CỘT 2: CHECKBOX */}
                <td
                  className="border p-1 bg-white"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 50,
                    width: 40,
                    background: "#fff",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedTrips.includes(r._id)}
                    onChange={() => toggleSelectTrip(r._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>

                {/* RENDER DATA */}
                {visibleColumns.map((colKey, colIndex) => {
                  if (hiddenColumns.includes(colKey)) return null;
                  const col = allColumns.find((c) => c.key === colKey) || {
                    key: colKey,
                    label: colKey,
                  };

                  const width = columnWidths[col.key] || 120;

                  const cellValue = [
                    "ngayBocHang",
                    "ngayGiaoHang",
                    "ngayBoc",
                  ].includes(col.key)
                    ? formatDate(r[col.key])
                    : col.key === "dieuVan"
                    ? getFullName(r.dieuVanID)
                    : r[col.key] ?? "";

                  let leftOffset = null;
                  if (colIndex === 0) leftOffset = 40;
                  if (colIndex === 1) leftOffset = 40 + width;

                  const stickyColumns = ["khachHang", "maKH"];
                  const stickyIndex = stickyColumns.indexOf(col.key);

                  if (stickyIndex >= 0) {
                    leftOffset = 40; // 40 checkbox
                    for (let i = 0; i < stickyIndex; i++) {
                      const key = stickyColumns[i];
                      leftOffset += parseInt(columnWidths[key] || 120);
                    }
                  }

                  return (
                    <td
                      key={col.key}
                      className="border p-0"
                      style={{
                        position: leftOffset !== null ? "sticky" : "static",
                        left: stickyIndex >= 0 ? leftOffset : undefined,
                        paddingLeft: 2,
                        height: 20,
                        lineHeight: "20px",
                        zIndex: stickyIndex >= 0 ? 45 : 1,
                        background: warnings[r._id]
                          ? "#fecaca"
                          : selectedRows.includes(r._id)
                          ? "#fef08a" // màu vàng nhạt
                          : "#fff",

                        textAlign: "left",
                        width,
                        minWidth: width,
                        maxWidth: width,
                      }}
                    >
                      {/* ⭐ NẾU LÀ CỘT BIỂN SỐ XE → THÊM HOVER TOOLTIP */}
                      {col.key === "bienSoXe" ? (
                        <div
                          className="truncate text-black underline cursor-help"
                          onMouseEnter={(e) => {
                            const info = getVehicleInfo(r.bienSoXe);
                            if (info)
                              setHoverVehicle({
                                ...info,
                                x: e.clientX + 15,
                                y: e.clientY + 15,
                              });
                          }}
                          onMouseMove={(e) => {
                            setHoverVehicle((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    x: e.clientX + 15,
                                    y: e.clientY + 15,
                                  }
                                : null
                            );
                          }}
                          onMouseLeave={() => setHoverVehicle(null)}
                        >
                          {r.bienSoXe}
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1"
                          style={{
                            textAlign: [
                              "cuocPhiBS",
                              "bocXepBS",
                              "veBS",
                              "hangVeBS",
                              "luuCaBS",
                              "cpKhacBS",
                              "themDiem",
                              "cuocPhi",
                              "bocXep",
                              "ve",
                              "hangVe",
                              "luuCa",
                              "luatChiPhiKhac",
                              "percentHH",
                              "moneyHH",
                              "moneyConLai",
                              "cuocTraXN",
                              "doanhThu",
                            ].includes(col.key)
                              ? "right"
                              : "left",
                            paddingRight: [
                              "cuocPhiBS",
                              "bocXepBS",
                              "veBS",
                              "hangVeBS",
                              "luuCaBS",
                              "cpKhacBS",
                              "themDiem",
                              "cuocPhi",
                              "bocXep",
                              "ve",
                              "hangVe",
                              "luuCa",
                              "luatChiPhiKhac",
                              "percentHH",
                              "moneyHH",
                              "moneyConLai",
                              "cuocTraXN",
                              "doanhThu",
                            ].includes(col.key)
                              ? "4px"
                              : "0",
                            fontWeight: [
                              "cuocPhiBS",
                              "bocXepBS",
                              "veBS",
                              "hangVeBS",
                              "luuCaBS",
                              "cpKhacBS",
                              "themDiem",
                              "cuocTraXN",
                            ].includes(col.key)
                              ? "700"
                              : "normal",
                            color: [
                              "cuocPhiBS",
                              "bocXepBS",
                              "veBS",
                              "hangVeBS",
                              "luuCaBS",
                              "cpKhacBS",
                              "themDiem",
                              "cuocTraXN",
                            ].includes(col.key)
                              ? "#1766ddff"
                              : "black",
                          }}
                        >
                          {/* TEXT (có thể rỗng) */}
                          <span className="truncate flex-1">
                            {numberColumns.includes(col.key)
                              ? formatNumber(cellValue)
                              : cellValue || ""}
                          </span>

                          {/* ICON luôn sát phải */}
                          {col.key === "cpKhacBS" && (
                            <FaInfoCircle
                              className="shrink-0 text-gray-500 hover:text-blue-600 cursor-pointer"
                              title="Chi tiết chi phí khác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRideBS(r);
                                setOpenBoSung(true);
                              }}
                            />
                          )}
                        </div>
                      )}
                      {hoverVehicle && (
                        <div
                          className="fixed bg-white border p-3 rounded-lg text-sm z-[9999]"
                          style={{
                            top: hoverVehicle.y,
                            left: hoverVehicle.x,
                            width: 240,
                          }}
                        >
                          <div>
                            <strong>Biển số:</strong> {hoverVehicle.plateNumber}
                          </div>
                          <div>
                            <strong>Loại xe:</strong> {hoverVehicle.vehicleType}
                          </div>
                          <div>
                            <strong>Kích thước:</strong> {hoverVehicle.length} ×{" "}
                            {hoverVehicle.width} × {hoverVehicle.height}
                          </div>
                          <div>
                            <strong>Định mức:</strong> {hoverVehicle.norm}
                          </div>
                        </div>
                      )}
                      {/* ⭐ ICON THÔNG TIN – CHỈ cpKhacBS */}
                    </td>
                  );
                })}
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

      <div className="flex items-center gap-3 text-sm text-gray-600 justify-end mt-2">
        <span>
          Tổng số chuyến: <b>{totalFromBE}</b>
        </span>

        <span>| hiển thị: {rides.length}</span>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border px-2 py-1 rounded text-black"
        >
          {[30, 35, 40, 45, 50].map((n) => (
            <option key={n} value={n}>
              {n} / trang
            </option>
          ))}
        </select>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 w-full">
          <RideEditModal
            ride={editingRide}
            allColumns={allColumns}
            onSubmit={submitEditRequest}
            onClose={() => setShowEditModal(false)}
            drivers={drivers}
            customers={customers}
            vehicles={vehicles}
            addresses={addresses}
            customers2={customers2}
          />
        </div>
      )}

      <div className="fixed z-[99999]">
        <RideRequestListModal
          open={showMyRequestModal}
          onClose={() => setShowMyRequestModal(false)}
          requests={myRequests}
          title="Yêu cầu chỉnh sửa của tôi"
        />
      </div>

      {showHistoryModal && historyRide && (
        <div className="fixed z-[99999]">
          <RideHistoryModal
            ride={historyRide}
            historyData={rideHistory}
            onClose={() => setShowHistoryModal(false)}
          />
        </div>
      )}

      {/* Modal thêm/sửa chuyến */}
      {showModal && (
        <div className="fixed z-[99999]">
          <RideModal
            key="new"
            initialData={rideDraft}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
            dieuVanList={[]}
            currentUser={currentUser}
            drivers={drivers}
            customers={customers}
            vehicles={vehicles}
            addresses={addresses}
            customers2={customers2}
          />
        </div>
      )}

      <div className="fixed z-[99999]">
        <BoSungSingleModal
          open={openBoSung}
          schedule={selectedRideBS}
          onClose={() => setOpenBoSung(false)}
          onSaved={(updatedRide) => {
            setRides((prev) =>
              prev.map((r) => (r._id === updatedRide._id ? updatedRide : r))
            );

            setOpenBoSung(false);
          }}
        />
      </div>
    </div>
  );
}
