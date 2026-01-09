import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const API_URL = `${API}/schedule-admin`;
const USER_API = `${API}/auth/dieu-van`; // ✅ API mới lấy danh sách điều vận

const removeVietnamese = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalize = (s = "") =>
  s.toString().normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

export default function TongHop({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]); // ✅ danh sách điều vận thật
  const [today] = useState(new Date());
  const [date, setDate] = useState("");
  const [filters, setFilters] = useState({
    dieuVanID: "",
    maChuyen: "",
    khachHang: "",
    bienSoXe: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const isActive = (path) => location.pathname === path;
  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver-dv", { state: { user } });
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer-dv", { state: { user } });
  };

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle-dv", { state: { user } });
  };

  const handleGoToScheduleTrash = () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.username !== "doanvanthiep") {
      return alert("Bạn không có quyền truy cập vào thùng rác!");
    }

    navigate("/schedule-trash", { state: { user } });
  };

  const mainColumns = [
    { key: "maKH", label: "MÃ KH" },
    { key: "khachHang", label: "KHÁCH HÀNG" },
    { key: "dienGiai", label: "DIỄN GIẢI" },
    { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
    { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
    { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
    { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
    { key: "soDiem", label: "SỐ ĐIỂM" },
    { key: "trongLuong", label: "TRỌNG LƯỢNG" },
    { key: "cuocPhi", label: "CƯỚC PHÍ" },
    { key: "bienSoXe", label: "BIỂN SỐ XE" },
    { key: "maChuyen", label: "MÃ CHUYẾN" },
  ];

  const extraColumns = [
    { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
    { key: "bocXep", label: "BỐC XẾP" },
    { key: "ve", label: "VÉ" },
    { key: "hangVe", label: "HÀNG VỀ" },
    { key: "luuCa", label: "LƯU CA" },
    { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC" },
    { key: "tenLaiXe", label: "TÊN LÁI XE" },
    { key: "accountUsername", label: "KẾ TOÁN PHỤ TRÁCH" },
    { key: "ghiChu", label: "GHI CHÚ" },
    { key: "dieuVan", label: "ĐIỀU VẬN" },
    { key: "ngayBoc", label: "NGÀY NHẬP" },
    { key: "createdBy", label: "NGƯỜI NHẬP" },
  ];

  const [allCols, setAllCols] = useState([...mainColumns, ...extraColumns]);

  // Format số tiền có dấu chấm hàng nghìn
  const formatMoney = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("vi-VN");
  };

  // Các trường cần format tiền
  const moneyFields = [
    "cuocPhi",
    "laiXeThuCuoc",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
    "cuocPhiBoSung",
  ];

  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // 🔹 Lấy danh sách điều vận thật
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

  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFromBE, setTotalFromBE] = useState(0);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // 🔹 Lấy tất cả chuyến (có filter)
  const fetchAllRides = async () => {
    try {
      const q = new URLSearchParams();
      q.append("page", page);
      q.append("limit", limit);
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

      // 🔥 Filter ngày riêng (nếu có)
      if (date) {
        q.append("date", format(new Date(date), "yyyy-MM-dd"));
      }
      if (rangeStart) q.append("giaoFrom", rangeStart);
      if (rangeEnd) q.append("giaoTo", rangeEnd);

      const res = await axios.get(`${API_URL}/all?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRides(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);

      // 👇 tổng số chuyến thật từ BE (không phân trang)
      setTotalFromBE(res.data.total || res.data.totalDocs || 0);
    } catch (err) {
      console.error(
        "Lỗi khi lấy tất cả chuyến:",
        err.response?.data || err.message
      );
      setRides([]);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const [openFilter, setOpenFilter] = useState(null);

  const [searchKH, setSearchKH] = useState("");
  const [searchDriver, setSearchDriver] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [searchDGiai, setSearchDGiai] = useState("");
  const [searchCuocPhiBD, setSearchCuocPhiBD] = useState("");

  const [moneyFilter, setMoneyFilter] = useState({});

  // 🔒 DANH SÁCH GỐC – LƯU CỨNG
  const [excelOptions, setExcelOptions] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
  });

  // ✅ DANH SÁCH ĐƯỢC CHỌN
  const [excelSelected, setExcelSelected] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
  });
  useEffect(() => {
    fetchAllRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters,
    excelSelected.khachHang.join("|"),
    excelSelected.tenLaiXe.join("|"),
    excelSelected.bienSoXe.join("|"),
    excelSelected.dienGiai.join("|"),
    excelSelected.cuocPhi.join("|"),
    JSON.stringify(moneyFilter),
    date,
    page,
    rangeStart,
    rangeEnd,
  ]);
  useEffect(() => {
    axios
      .get(`${API_URL}/accountant/filter-all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setExcelOptions(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const close = (e) => {
      const th = e.target.closest("th[data-col]");
      if (!th) setOpenFilter(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const [filterPos, setFilterPos] = useState({ x: 0, y: 0 });
  const getColumnLabel = (key) => {
    return allCols.find((c) => c.key === key)?.label || key;
  };

  // 🔹 Hàm lấy fullname từ id
  const getFullName = (id) => {
    const found = managers.find((m) => m._id === id);
    return found ? found.fullname : id;
  };

  // 🔹 Xuất Excel (gọi BE)
  const exportToExcel = async () => {
    try {
      if (!rangeStart || !rangeEnd) {
        alert("Vui lòng chọn khoảng ngày");
        return;
      }

      const payload = {
        from: rangeStart,
        to: rangeEnd,
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

      // ⬇️ tải file
      saveAs(
        new Blob([res.data]),
        `DANH_SACH_CHUYEN_${rangeStart}_den_${rangeEnd}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Xuất Excel thất bại");
    }
  };

  const [excelData, setExcelData] = useState([]);

  const parseExcelDate = (val) => {
    if (!val) return null;

    // Nếu là số (Excel serial)
    if (typeof val === "number") {
      const dt = XLSX.SSF.parse_date_code(val);
      return new Date(dt.y, dt.m - 1, dt.d, 12, 0, 0);
    }

    // Nếu là chuỗi dd/MM/yyyy
    if (typeof val === "string" && val.includes("/")) {
      const [d, m, y] = val.split("/");
      return new Date(y, m - 1, d, 12, 0, 0);
    }

    // Nếu là kiểu khác thì bỏ
    return null;
  };

  const [excelLoading, setExcelLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0); // số chuyến load từ file
  const [remaining, setRemaining] = useState(0); // số chuyến còn lại khi import

  const handleSelectExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return alert("Chưa chọn file Excel!");

    setExcelLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      // ===== KIỂM TRA THIẾU CỘT BẮT BUỘC =====
      const REQUIRED_COLUMNS = [
        "MÃ KH",
        "MÃ CHUYẾN",
        "NGÀY GIAO HÀNG",
        "CƯỚC PHÍ",
      ];

      // Lấy header từ sheet
      const header = XLSX.utils
        .sheet_to_json(sheet, {
          header: 1,
          defval: "",
        })[0]
        ?.map((h) => h.toString().trim());

      const missingColumns = REQUIRED_COLUMNS.filter(
        (col) => !header.includes(col)
      );

      if (missingColumns.length > 0) {
        alert(
          `❌ File Excel thiếu cột bắt buộc:\n- ${missingColumns.join("\n- ")}`
        );

        setExcelData([]);
        setLoadedCount(0);
        setRemaining(0);
        setExcelLoading(false);
        return;
      }

      // Chuẩn hoá key giống BE
      rows = rows.map((r) => {
        const obj = {};
        for (let k in r) {
          const cleanKey = k.trim().replace(/\s+/g, " ");
          obj[cleanKey] = r[k];
        }
        return obj;
      });

      // Map về đúng structure chuyến
      const mapped = rows
        .map((r) => ({
          ltState: r["LT"] || "",
          onlState: r["ONL"] || "",
          offState: r["OFF"] || "",
          maChuyen: r["MÃ CHUYẾN"]?.toString().trim() || "",
          tenLaiXe: r["TÊN LÁI XE"] || "",
          maKH: (r["MÃ KH"] ?? "").toString().trim(),
          dienGiai: r["DIỄN GIẢI"] || "",
          ngayBocHang: parseExcelDate(r["NGÀY ĐÓNG HÀNG"]),
          ngayGiaoHang: parseExcelDate(r["NGÀY GIAO HÀNG"]),
          ngayBoc: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            12,
            0,
            0
          ),
          diemXepHang: r["ĐIỂM ĐÓNG HÀNG"] || "",
          diemDoHang: r["ĐIỂM GIAO HÀNG"] || "",
          soDiem: r["SỐ ĐIỂM"] || "",
          trongLuong: r["TRỌNG LƯỢNG"] || "",
          bienSoXe: r["BIỂN SỐ XE"] || "",
          cuocPhi: r["CƯỚC PHÍ"] || "",
          daThanhToan: r["ĐÃ THANH TOÁN"] || "",
          bocXep: r["BỐC XẾP"] || "",
          ve: r["VÉ"] || "",
          hangVe: r["HÀNG VỀ"] || "",
          luuCa: r["LƯU CA"] || "",
          luatChiPhiKhac: r["LUẬT CP KHÁC"] || "",
          ghiChu: r["GHI CHÚ"] || "",
          KHdiemGiaoHang: r["TÊN KH GIAO"] || ""
        }))
        .filter((x) => x.maChuyen && String(x.maKH).trim() !== ""); // Chỉ lấy dòng có mã chuyến và mã KH

      setExcelData(mapped);
      setLoadedCount(mapped.length);
      setRemaining(0); // reset khi chọn file mới

      console.log("Dữ liệu import tạm:", mapped);
    } catch (err) {
      console.error("Lỗi đọc file excel:", err);
      alert("Lỗi khi đọc file Excel!");
      setExcelData([]);
      setLoadedCount(0);
      setRemaining(0);
    } finally {
      setExcelLoading(false);
    }
  };

  const [loadingImport, setLoadingImport] = useState(false);

  const handleImportSchedules = async (mode = "overwrite") => {
    if (!excelData.length) return alert("Chưa có dữ liệu import!");

    if (!window.confirm(`Bạn có chắc muốn nhập ${excelData.length} chuyến?`))
      return;

    setLoadingImport(true);
    setRemaining(excelData.length);

    try {
      let totalImported = 0;
      let skippedTrips = [];
      // Import tuần tự để có thể update remaining từng cái
      for (let i = 0; i < excelData.length; i++) {
        const record = excelData[i];
        try {
          // Gọi API import từng bản ghi (server nên chấp nhận 1 item trong records array)
          const res = await axios.post(
            `${API_URL}/import-excel`,
            { records: [record], mode },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // 🔹 gom kết quả từ BE
          if (res.data?.importedCount) {
            totalImported += res.data.importedCount;
          }

          if (Array.isArray(res.data?.skippedTrips)) {
            skippedTrips.push(...res.data.skippedTrips.filter(Boolean));
          }
        } catch (err) {
          console.error("Lỗi import record:", record, err);
          skippedTrips.push(record.maChuyen || null);
          // tiếp tục import các bản ghi còn lại
        } finally {
          setRemaining((prev) => prev - 1);
        }
      }

      if (skippedTrips.length === 0) {
        alert(`Import thành công ${totalImported} chuyến!`);
      } else {
        alert(
          `Import xong: ${totalImported} chuyến thành công.\n` +
            `Không import được ${skippedTrips.length} chuyến:\n` +
            skippedTrips.join(", ")
        );
      }

      // Reset sau import (chỉ khi bạn muốn)
      setExcelData([]);
      setLoadedCount(0);
      setRemaining(0);
      const inputEl = document.getElementById("excelInput");
      if (inputEl) inputEl.value = "";

      fetchAllRides();
    } catch (err) {
      console.error("Lỗi khi import:", err);
      alert("Có lỗi khi import!");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!rangeStart || !rangeEnd) {
      return alert("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc!");
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa tất cả chuyến từ ${rangeStart} → ${rangeEnd}?`
      )
    ) {
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/delete-by-date-range`,
        { startDate: rangeStart, endDate: rangeEnd },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message || "Đã xóa thành công!");
      fetchAllRides();
    } catch (err) {
      console.error("Lỗi xóa chuyến theo khoảng ngày:", err);
      alert(err.response?.data?.error || "Lỗi khi xóa chuyến!");
    }
  };

  // ==== Cho bảng nâng cao ====
  const [hiddenCols, setHiddenCols] = useState([]);
  const [colOrder, setColOrder] = useState(allCols.map((c) => c.key));
  const [colWidths, setColWidths] = useState(
    Object.fromEntries(allCols.map((c) => [c.key, 120]))
  );

  const dragCol = useRef(null);

  const handleDrop = (key) => {
    if (!dragCol.current) return;
    const newOrder = [...colOrder];
    const from = newOrder.indexOf(dragCol.current);
    const to = newOrder.indexOf(key);

    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragCol.current);

    setColOrder(newOrder);
    dragCol.current = null;
  };

  // Resize cột
  const startResize = (e, key) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[key];

    const onMove = (ev) => {
      const newW = Math.max(10, startW + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [key]: newW }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ==== FILTER THEO TỪNG CỘT ====
  const [columnFilters, setColumnFilters] = useState({});
  const filterRef = useRef(null);

  const dateColumns = ["ngayBoc", "ngayBocHang", "ngayGiaoHang"];
  const moneyColumns = [
    "cuocPhi",
    "laiXeThuCuoc",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
  ];

  const filteredRides = rides.filter((r) => {
    // ===== FILTER KHÁCH HÀNG =====
    if (filters.khachHang.trim()) {
      const input = removeVietnamese(filters.khachHang.toLowerCase().trim());
      const name = removeVietnamese((r.khachHang || "").toLowerCase().trim());
      if (!name.includes(input)) return false;
    }

    // ===== FILTER KHOẢNG NGÀY GIAO =====
    // ===== LỌC THEO KHOẢNG NGÀY GIAO (FIX CHUẨN) =====
    if (rangeStart || rangeEnd) {
      if (!r.ngayGiaoHang) return false;

      const d = new Date(r.ngayGiaoHang);
      if (isNaN(d.getTime())) return false;

      // Chuẩn hoá về yyyy-MM-dd để so sánh
      const giao = format(d, "yyyy-MM-dd");

      if (rangeStart && giao < rangeStart) return false;
      if (rangeEnd && giao > rangeEnd) return false;
    }

    // ===== FILTER THEO CỘT =====
    for (const key in columnFilters) {
      const f = columnFilters[key]?.trim();
      if (!f) continue;

      const raw = r[key];

      if (dateColumns.includes(key)) {
        const formatted = raw ? new Date(raw).toISOString().slice(0, 10) : "";
        if (formatted !== f) return false;
        continue;
      }

      if (moneyColumns.includes(key)) {
        const rawNum = (raw || "").toString().replace(/\./g, "");
        const fNum = f.replace(/\./g, "");
        if (!rawNum.includes(fNum)) return false;
        continue;
      }

      const field = removeVietnamese((raw || "").toString().toLowerCase());
      const filterText = removeVietnamese(f.toLowerCase());
      if (!field.includes(filterText)) return false;
    }

    return true;
  });

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const colPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showColumnPicker &&
        colPickerRef.current &&
        !colPickerRef.current.contains(e.target)
      ) {
        setShowColumnPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnPicker]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
      <div className="flex gap-2 items-center mb-4">
        <button
          onClick={() => navigate("/dieu-van")}
          className={"px-3 py-1 rounded text-white bg-blue-500"}
        >
          Trang chính
        </button>
        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white 
        ${isActive("/manage-driver-dv") ? "bg-green-600" : "bg-blue-500"}
      `}
        >
          Danh sách lái xe
        </button>

        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white 
        ${isActive("/manage-customer-dv") ? "bg-green-600" : "bg-blue-500"}
      `}
        >
          Danh sách khách hàng
        </button>

        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white 
        ${isActive("/manage-vehicle-dv") ? "bg-green-600" : "bg-blue-500"}
      `}
        >
          Danh sách xe
        </button>
        <button
          onClick={handleGoToScheduleTrash}
          className={`px-3 py-1 rounded text-white
        ${isActive("/schedule-trash") ? "bg-green-600" : "bg-blue-500"}
      `}
        >
          Các chuyến bị xoá
        </button>
      </div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">TỔNG HỢP TẤT CẢ CÁC CHUYẾN</h1>
        <div className="flex gap-4 items-center">
          <span>
            Điều vận: {currentUser?.fullname || currentUser?.username}
          </span>
          <span className="font-semibold text-blue-600">
            Hôm nay: {format(today, "dd/MM/yyyy")}
          </span>
          <button
            onClick={onLogout || (() => navigate("/login"))}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Các nút hành động */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button
          onClick={exportToExcel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          📥 Xuất Excel
        </button>
        <input
          id="excelInput"
          type="file"
          accept=".xlsx,.xls, .xlsm"
          onChange={handleSelectExcel}
          className="border px-3 py-2 rounded"
        />

        <button
          onClick={() => handleImportSchedules("add")}
          disabled={loadingImport || excelLoading || loadedCount === 0}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          {loadingImport
            ? `Đang nhập chuyến, số chuyến còn lại: ${remaining}`
            : "Thêm mới"}
        </button>

        <button
          onClick={() => handleImportSchedules("overwrite")}
          disabled={loadingImport || excelLoading || loadedCount === 0}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          {loadingImport
            ? `Đang nhập chuyến, số chuyến còn lại: ${remaining}`
            : "Ghi đè"}
        </button>

        {excelLoading && (
          <span className="text-red-600 font-semibold ml-3">
            File đang được load, xin vui lòng chờ...
          </span>
        )}

        {/* Hiển thị số chuyến đã load */}
        {loadedCount > 0 && !excelLoading && (
          <span className="text-green-600 font-semibold ml-3">
            Đã load được {loadedCount.toLocaleString()} chuyến
          </span>
        )}
        <a
          href="/DANH_SACH_CHUYEN.xlsx"
          download
          style={{
            color: "#0d6efd", // xanh bootstrap
            fontStyle: "italic", // chữ nghiêng
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          (-- Tải file Excel mẫu --)
        </a>
      </div>

      <div className="m-2 flex items-center gap-2 flex-wrap">
        <span className="font-semibold">Khoảng ngày giao:</span>

        <input
          type="date"
          value={rangeStart}
          onChange={(e) => setRangeStart(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <span>→</span>

        <input
          type="date"
          value={rangeEnd}
          onChange={(e) => setRangeEnd(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <button
          onClick={handleDeleteByDateRange}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          Xóa chuyến
        </button>
      </div>

      {/* Bảng */}
      {/* ====== CHỌN CỘT ====== */}
      <div className="flex justify-between p-2 bg-white shadow rounded mb-3">
        <button
          onClick={() => setShowColumnPicker((v) => !v)}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg relative"
        >
          ⚙️
        </button>
        {showColumnPicker && (
          <div
            ref={colPickerRef}
            className="absolute z-50 mt-8 w-64 max-h-96 overflow-auto
               bg-white shadow-lg rounded border"
          >
            <ul className="divide-y text-xs">
              {allCols.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(c.key)}
                    onChange={() => {
                      setHiddenCols((prev) =>
                        prev.includes(c.key)
                          ? prev.filter((k) => k !== c.key)
                          : [...prev, c.key]
                      );
                    }}
                  />
                  <span className="whitespace-nowrap">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* 🔹 Nút Xóa lọc */}
        <button
          onClick={() => {
            // Xóa các filter lớn
            setFilters({
              dieuVanID: "",
              tenLaiXe: "",
              maChuyen: "",
              khachHang: "",
              bienSoXe: "",
            });
            setDate("");

            setExcelSelected({
              khachHang: [],
              tenLaiXe: [],
              bienSoXe: [],
              dienGiai: [],
              cuocPhi: [],
            });

            // Xóa toàn bộ filter theo cột
            setColumnFilters({});

            // Tắt ô filter cột đang mở
            setRangeEnd();
            setRangeStart();
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm"
        >
          Xóa lọc
        </button>
      </div>

      {/* ====== BẢNG NÂNG CAO ====== */}
      <div className="overflow-auto max-h-[75vh] border bg-white">
        <table className="border-separate border-spacing-0 text-sm w-max">
          <thead className="sticky top-0 bg-blue-600 text-white z-10">
            <tr>
              {colOrder.map((key) => {
                const col = allCols.find((c) => c.key === key);
                if (!col || hiddenCols.includes(key)) return null;

                return (
                  <th
                    key={key}
                    style={{
                      width: colWidths[key],
                      minWidth: 10,
                      maxWidth: colWidths[key],
                      textAlign: "center",
                    }}
                    className="border p-0 relative select-none overflow-hidden"
                  >
                    {/* VÙNG DRAG & LABEL */}
                    <div
                      className="p-2 flex items-center justify-center gap-1"
                      draggable // ⬅ kéo CỘT ở đây, không phải th
                      onDragStart={() => (dragCol.current = key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(key)}
                      style={{ width: "100%", height: "100%" }}
                    >
                      {/* LABEL → Toggle filter */}
                      <span
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setFilterPos({
                            x: rect.left,
                            y: rect.bottom,
                          });
                          setOpenFilter(col.key);
                        }}
                        className="cursor-pointer block w-full"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "12px",
                          lineHeight: "1.2",
                        }}
                      >
                        {col.label}
                      </span>

                      {/* RESIZE */}
                      <span
                        onMouseDown={(e) => startResize(e, key)}
                        className="cursor-col-resize w-2 h-full bg-gray-300 absolute right-0 top-0"
                      />
                    </div>

                    {/* Ô FILTER */}
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

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.khachHang.length ===
                                    excelOptions.khachHang.length &&
                                  excelOptions.khachHang.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    khachHang:
                                      p.khachHang.length ===
                                      excelOptions.khachHang.length
                                        ? []
                                        : excelOptions.khachHang,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.khachHang
                                .filter((c) => {
                                  if (!searchKH) return true;
                                  return normalize(c).includes(
                                    normalize(searchKH)
                                  );
                                })

                                .map((c) => (
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

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.tenLaiXe.length ===
                                    excelOptions.tenLaiXe.length &&
                                  excelOptions.tenLaiXe.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    tenLaiXe:
                                      p.tenLaiXe.length ===
                                      excelOptions.tenLaiXe.length
                                        ? []
                                        : excelOptions.tenLaiXe,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.tenLaiXe
                                .filter((d) => {
                                  if (!searchDriver) return true;
                                  return normalize(d).includes(
                                    normalize(searchDriver)
                                  );
                                })

                                .map((d) => (
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

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.bienSoXe.length ===
                                    excelOptions.bienSoXe.length &&
                                  excelOptions.bienSoXe.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    bienSoXe:
                                      p.bienSoXe.length ===
                                      excelOptions.bienSoXe.length
                                        ? []
                                        : excelOptions.bienSoXe,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.bienSoXe
                                .filter((p) => {
                                  if (!searchPlate) return true;
                                  return normalize(p).includes(
                                    normalize(searchPlate)
                                  );
                                })

                                .map((p) => (
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

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.dienGiai.length ===
                                    excelOptions.dienGiai.length &&
                                  excelOptions.dienGiai.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    dienGiai:
                                      prev.dienGiai.length ===
                                      excelOptions.dienGiai.length
                                        ? []
                                        : excelOptions.dienGiai,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.dienGiai
                                .filter((dg) => {
                                  if (!searchDGiai) return true;
                                  return normalize(dg).includes(
                                    normalize(searchDGiai)
                                  );
                                })
                                .map((dg) => (
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

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.cuocPhi.length ===
                                    excelOptions.cuocPhi.length &&
                                  excelOptions.cuocPhi.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    cuocPhi:
                                      prev.cuocPhi.length ===
                                      excelOptions.cuocPhi.length
                                        ? []
                                        : excelOptions.cuocPhi,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.cuocPhi
                                .filter((cp) => {
                                  if (!searchCuocPhiBD) return true;
                                  return normalize(cp).includes(
                                    normalize(searchCuocPhiBD)
                                  );
                                })
                                .map((cp) => (
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
                                          cuocPhi: prev.cuocPhi.includes(cp)
                                            ? prev.cuocPhi.filter(
                                                (x) => x !== cp
                                              )
                                            : [...prev.cuocPhi, cp],
                                        }))
                                      }
                                    />
                                    <span className="truncate">
                                      {formatMoney(cp)}
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
            {filteredRides.map((r) => (
              <tr key={r._id} className="text-center hover:bg-gray-100">
                {colOrder.map((key) => {
                  const col = allCols.find((c) => c.key === key);
                  if (!col || hiddenCols.includes(key)) return null;

                  let value = r[key] ?? "";

                  // Format đặc biệt
                  if (
                    ["ngayBoc", "ngayBocHang", "ngayGiaoHang"].includes(key)
                  ) {
                    value = formatDate(value);
                  }
                  if (moneyFields.includes(key)) {
                    value = formatMoney(value);
                  }
                  if (key === "dieuVan") {
                    value = getFullName(r.dieuVanID);
                  }

                  return (
                    <td
                      key={key}
                      className="border px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        width: colWidths[key],
                        maxWidth: colWidths[key],
                      }}
                    >
                      {value}
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

      <div className="mt-3 text-right font-semibold text-gray-700">
        Tổng số chuyến: {totalFromBE.toLocaleString()} | Đang hiển thị:{" "}
        {filteredRides.length.toLocaleString()}
      </div>
    </div>
  );
}
