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
  const [showExtra, setShowExtra] = useState(false);

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

  const [allCols, setAllCols] = useState([...mainColumns]);

  useEffect(() => {
    const cols = [...mainColumns, ...(showExtra ? extraColumns : [])];
    setAllCols(cols);

    // Cập nhật thứ tự cột nếu thiếu
    setColOrder((prev) => {
      const keys = cols.map((c) => c.key);
      const newOrder = prev.filter((k) => keys.includes(k));

      // Thêm các cột mới vào cuối
      keys.forEach((k) => {
        if (!newOrder.includes(k)) newOrder.push(k);
      });

      return newOrder;
    });

    // Cập nhật width cho cột mới
    setColWidths((prev) => {
      const next = { ...prev };
      cols.forEach((c) => {
        if (!next[c.key]) next[c.key] = 80; // width mặc định
      });
      return next;
    });
  }, [showExtra]);

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

      if (filters.tenLaiXe) q.append("tenLaiXe", filters.tenLaiXe);
      if (filters.maChuyen) q.append("maChuyen", filters.maChuyen);
      if (filters.bienSoXe) q.append("bienSoXe", filters.bienSoXe);
      if (filters.dieuVanID) q.append("dieuVanID", filters.dieuVanID);
      if (date) q.append("date", format(new Date(date), "yyyy-MM-dd"));
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

useEffect(() => {
  fetchAllRides();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filters, date, page, rangeStart, rangeEnd]);


  // 🔹 Hàm lấy fullname từ id
  const getFullName = (id) => {
    const found = managers.find((m) => m._id === id);
    return found ? found.fullname : id;
  };

  // 🔹 Xuất Excel
  const exportToExcel = () => {
    if (!rides.length) return alert("Không có dữ liệu để xuất Excel!");

    // 1️⃣ Tạo danh sách tất cả cột dựa trên showExtra
    const allColumns = [...mainColumns, ...(showExtra ? extraColumns : [])];

    // 2️⃣ Tạo header hiển thị (label)
    const headers = allColumns.map((c) => c.label);

    // 3️⃣ Tạo dữ liệu
    const data = rides.map((r) => {
      const row = {};
      allColumns.forEach((col) => {
        // Xử lý các trường đặc biệt
        if (col.key === "dieuVan") row[col.key] = getFullName(r.dieuVanID);
        else if (["ngayBoc", "ngayBocHang", "ngayGiaoHang"].includes(col.key))
          row[col.key] = formatDate(r[col.key]);
        else row[col.key] = r[col.key] || "";
      });
      return row;
    });

    // 4️⃣ Chuyển JSON → Sheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: allColumns.map((c) => c.key),
    });

    // 5️⃣ Gắn header (label) lên đầu sheet
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    // 6️⃣ Tạo workbook và append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tổng hợp chuyến");

    // 7️⃣ Lưu file
    saveAs(
      new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })]),
      `TongHop_${format(today, "ddMMyyyy_HHmm")}.xlsx`
    );
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

    const failed = []; // lưu các bản ghi lỗi (nếu cần)

    try {
      // Import tuần tự để có thể update remaining từng cái
      for (let i = 0; i < excelData.length; i++) {
        const record = excelData[i];
        try {
          // Gọi API import từng bản ghi (server nên chấp nhận 1 item trong records array)
          await axios.post(
            `${API_URL}/import-excel`,
            { records: [record], mode },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error(
            "Lỗi import record:",
            record,
            err.response?.data || err.message
          );
          failed.push({ record, error: err.response?.data || err.message });
          // tiếp tục import các bản ghi còn lại
        } finally {
          setRemaining((prev) => prev - 1);
        }
      }

      if (failed.length === 0) {
        alert("Import thành công tất cả chuyến!");
      } else {
        alert(
          `Hoàn thành với ${failed.length} chuyến lỗi. Kiểm tra console để biết chi tiết.`
        );
        console.warn("Danh sách lỗi import:", failed);
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
  const [activeFilterCol, setActiveFilterCol] = useState(null);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setActiveFilterCol(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
      <div className="flex gap-2 items-center mb-4">
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

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-2 mb-3 items-center w-full justify-start">
        <select
          value={filters.dieuVanID}
          onChange={(e) =>
            setFilters({ ...filters, dieuVanID: e.target.value })
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

        <input
          type="text"
          placeholder="Mã chuyến"
          value={filters.maChuyen}
          onChange={(e) => setFilters({ ...filters, maChuyen: e.target.value })}
          className="border rounded px-3 py-2"
        />

        <input
          type="text"
          placeholder="Khách hàng"
          value={filters.khachHang}
          onChange={(e) =>
            setFilters({ ...filters, khachHang: e.target.value })
          }
          className="border rounded px-3 py-2"
        />

        <input
          type="text"
          placeholder="Biển số xe"
          value={filters.bienSoXe}
          onChange={(e) => setFilters({ ...filters, bienSoXe: e.target.value })}
          className="border rounded px-3 py-2"
        />


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

            // Xóa toàn bộ filter theo cột
            setColumnFilters({});

            // Tắt ô filter cột đang mở
            setActiveFilterCol(null);
            setRangeEnd();
            setRangeStart()
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm"
        >
          Xóa lọc
        </button>

        <button
          onClick={() => navigate("/dieu-van")}
          className="ml-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          ← Quay lại điều vận
        </button>
      </div>
      {/* Các nút hành động */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button
          onClick={() => setShowExtra((s) => !s)}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
        >
          {showExtra ? "Ẩn bớt" : "Hiển thị đầy đủ"}
        </button>

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
            📌 Đã load được {loadedCount.toLocaleString()} chuyến
          </span>
        )}
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
      <div className="flex flex-wrap gap-3 p-2 bg-white shadow rounded mb-3">
        {allCols.map((c) => (
          <label key={c.key} className="flex gap-2 items-center text-xs">
            <input
              type="checkbox"
              checked={!hiddenCols?.includes(c.key)}
              onChange={() => {
                if (hiddenCols.includes(c.key)) {
                  setHiddenCols(hiddenCols.filter((k) => k !== c.key));
                } else {
                  setHiddenCols([...hiddenCols, c.key]);
                }
              }}
            />
            {c.label}
          </label>
        ))}
      </div>

      {/* ====== BẢNG NÂNG CAO ====== */}
      <div className="overflow-auto max-h-[75vh] border bg-white">
        <table className="border-collapse text-sm w-max">
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
                        onClick={() =>
                          setActiveFilterCol((prev) =>
                            prev === key ? null : key
                          )
                        }
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
                    {activeFilterCol === key && (
                      <div
                        ref={filterRef}
                        className="absolute left-0 right-0 top-full mt-1 z-90 bg-white"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {dateColumns.includes(key) ? (
                          <input
                            type="date"
                            autoFocus
                            onMouseDown={(e) => e.stopPropagation()}
                            value={columnFilters[key] || ""}
                            onChange={(e) =>
                              setColumnFilters({
                                ...columnFilters,
                                [key]: e.target.value,
                              })
                            }
                            className="border p-1 w-full text-xs text-black placeholder-gray-400"
                          />
                        ) : (
                          <input
                            type="text"
                            autoFocus
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="Lọc..."
                            value={columnFilters[key] || ""}
                            onChange={(e) =>
                              setColumnFilters({
                                ...columnFilters,
                                [key]: e.target.value,
                              })
                            }
                            className="border p-1 w-full text-xs text-black placeholder-gray-400"
                          />
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
