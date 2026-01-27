import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";

const API_URL = `${API}/schedule-admin`;

const splitAddressInput = (value) => {
  const parts = value.split(";");
  const last = parts.pop() || "";
  return {
    prefix: parts.length ? parts.join(";").trim() + "; " : "",
    keyword: last.trim(),
  };
};

const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
};

const removeVietnameseTones = (str) =>
  str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase() || "";

const scoreAddressMatch = (keyword, address) => {
  const k = removeVietnameseTones(keyword);
  const a = removeVietnameseTones(address);
  if (a === k) return 1000;
  if (a.startsWith(k)) return 800;
  if (a.includes(` ${k} `) || a.endsWith(` ${k}`)) return 600;

  let score = 0;
  k.split(/\s+/).forEach((w) => {
    if (a.includes(w)) score += 50;
    else if (a.split(/\s+/).some((t) => levenshtein(w, t) <= 1)) score += 20;
  });
  return score;
};

const appendAddress = (prev, next) => {
  const { prefix } = splitAddressInput(prev || "");
  return `${prefix}${next}; `;
};

const splitCompletedPoints = (str = "") =>
  str
    .split(";")
    .slice(0, -1)
    .map((s) => s.trim())
    .filter(Boolean);

const getDiaChiMoi = (a) =>
  a.diaChiMoi && a.diaChiMoi.trim() ? a.diaChiMoi : a.diaChi;

const getDiaChiMoiByDiaChi = (diaChi, addresses = []) => {
  const found = addresses.find((a) => a.diaChi.trim() === diaChi.trim());
  return found ? getDiaChiMoi(found) : diaChi;
};

const formatDateFromDB = (v) => {
  if (!v) return "";

  // nếu BE trả Date object stringify
  if (typeof v === "string" && v.includes("T")) {
    const [y, m, d] = v.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  // fallback
  return String(v);
};

const normalizeDate = (v) => {
  if (!v) return "";

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // ISO
  if (typeof v === "string" && v.includes("T")) {
    return v.slice(0, 10);
  }

  return "";
};

const getByPath = (obj, path) => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

const DATE_FIELDS = ["ngayBocHang", "ngayGiaoHang"];

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

const compareValue = (a, b, fieldKey) => {
  // ===== CẢ 2 RỖNG → TRÙNG =====
  if (isEmpty(a) && isEmpty(b)) {
    return { ok: true, score: 100 };
  }

  // ===== 1 RỖNG 1 KHÔNG → KHÁC =====
  if (isEmpty(a) || isEmpty(b)) {
    return { ok: false, score: 0 };
  }

  // ===== FIELD NGÀY =====
  if (DATE_FIELDS.includes(fieldKey)) {
    const da = normalizeDate(a);
    const db = normalizeDate(b);

    if (da && db && da === db) {
      return { ok: true, score: 100 };
    }

    return { ok: false, score: 0 };
  }

  // ===== FIELD THƯỜNG =====
  const na = removeVietnameseTones(String(a));
  const nb = removeVietnameseTones(String(b));

  if (na === nb) return { ok: true, score: 100 };

  let score = 0;
  na.split(/\s+/).forEach((w) => {
    if (nb.includes(w)) score += 20;
    else if (nb.split(/\s+/).some((t) => levenshtein(w, t) <= 1)) score += 10;
  });

  return { ok: score >= 60, score };
};

const renderLTValue = (value, fieldKey) => {
  if (value === null || value === undefined || value === "") return "";

  // chỉ field ngày mới format
  if (DATE_FIELDS.includes(fieldKey)) {
    return formatDateFromDB(value);
  }

  // còn lại trả thẳng, đéo parse
  return String(value);
};

const CompareHint = ({ result, fieldKey }) => {
  if (!result) return null;

  const ltText = renderLTValue(result.ltValue, fieldKey);

  return (
    <div
      className={`text-xs mt-1 ${
        result.ok ? "text-green-600" : "text-red-500"
      }`}
    >
      {result.ok ? (
        "✓ Trùng lịch trình"
      ) : (
        <div>
          ✗ Khác
          {ltText && <> (LT: {ltText})</>}
        </div>
      )}
    </div>
  );
};

export default function RideEditTripModal({
  initialData,
  onSubmit,
  onClose,
  currentUser,
  drivers = [],
  customers = [],
  vehicles = [],
  addresses = [],
  customers2 = [],
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (
      initialData?.maLichTrinh &&
      initialData.maLichTrinh.trim() &&
      !compareData // 🔥 tránh gọi lại
    ) {
      const code = initialData.maLichTrinh.trim();

      setCompareCode(code);

      // ⏱ đợi state set xong rồi mới đối chiếu
      setTimeout(() => {
        handleCompareAuto(code);
      }, 0);
    }
  }, [initialData]);

  const canEditFinancial = currentUser?.permissions?.includes("edit_trip_full");
  const token = localStorage.getItem("token");
  const [compareCode, setCompareCode] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [compareResult, setCompareResult] = useState({});
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  const FIELD_MAP = {
    // ===== root =====
    tenLaiXe: "tenLaiXe",
    ngayBocHang: "ngayDi",
    ngayGiaoHang: "ngayVe",

    // ===== row =====
    bienSoXe: "row.bienSoXe",
    khachHang: "row.tenKhachHang",
    diemXepHang: "row.noiDi",
    diemDoHang: "row.noiDen",
    soDiem: "row.soDiem",
    trongLuong: "row.trongLuongHang",
    onlState: "row.giayTo",

    bocXep: "row.bocXep",
    ve: "row.ve",
    hangVe: "row.haiChieuVaLuuCa",
    luuCa: "row.haiChieuVaLuuCa",
    luatChiPhiKhac: "row.chiPhiKhac",
  };

  const LT_ONLY_FIELDS = [
    { key: "an", label: "Ăn" },
    { key: "tangCa", label: "Tăng ca" },
    { key: "tienChuyen", label: "Tiền chuyến" },
    { key: "tongTienLichTrinh", label: "Tổng tiền lịch trình" },
    { key: "laiXeThuKhach", label: "Lái xe thu khách" },
  ];

  const [compareError, setCompareError] = useState("");

  const handleCompareAuto = async (code) => {
    setCompareError("");

    try {
      const res = await axios.get(`${API_URL}/schedules/row/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data || Object.keys(res.data).length === 0) {
        setCompareError("Mã lịch trình không tồn tại");
        setCompareData(null);
        setCompareResult({});
        return;
      }

      const lt = res.data;
      const result = {};

      Object.entries(FIELD_MAP).forEach(([bkKey, path]) => {
        const ltValue = getByPath(lt, path);

        result[bkKey] = {
          ...compareValue(formData[bkKey], ltValue, bkKey),
          ltValue,
        };
      });

      setCompareData(lt);
      setCompareResult(result);
    } catch (err) {
      setCompareError("Không lấy được dữ liệu lịch trình");
      setCompareData(null);
      setCompareResult({});
    }
  };

  const handleCompare = async () => {
    setCompareError(""); // reset lỗi cũ

    if (!compareCode.trim()) {
      setCompareError("Vui lòng nhập mã lịch trình");
      return;
    }

    try {
      const res = await axios.get(
        `${API_URL}/schedules/row/${compareCode.trim()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // 🔴 Phòng trường hợp BE trả null / {}
      if (!res.data || Object.keys(res.data).length === 0) {
        setCompareError("Mã lịch trình không tồn tại");
        setCompareData(null);
        setCompareResult({});
        return;
      }

      const lt = res.data;

      const result = {};
      Object.entries(FIELD_MAP).forEach(([bkKey, path]) => {
        const ltValue = getByPath(lt, path);

        result[bkKey] = {
          ...compareValue(formData[bkKey], ltValue, bkKey),
          ltValue,
        };
      });

      setCompareData(lt);
      setCompareResult(result);
    } catch (err) {
      // ===== LỖI TỪ BE =====
      if (err.response?.status === 404) {
        setCompareError("Mã lịch trình không tồn tại");
      } else {
        setCompareError("Không lấy được dữ liệu lịch trình");
      }

      setCompareData(null);
      setCompareResult({});
    }
  };

  const handleSaveMaLichTrinh = async () => {
    setAssignError("");

    if (!compareData) {
      setAssignError("Chưa đối chiếu lịch trình");
      return;
    }

    if (!formData.maChuyen) {
      setAssignError("Không xác định được mã chuyến");
      return;
    }

    try {
      setAssignLoading(true);

      await axios.post(
        `${API_URL}/assign-ma-lich-trinh`,
        {
          maChuyen: formData.maChuyen,
          maLichTrinh: compareCode.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Đã lưu mã lịch trình vào chuyến");
    } catch (err) {
      setAssignError(err.response?.data?.error || "Lưu mã lịch trình thất bại");
    } finally {
      setAssignLoading(false);
    }
  };

  const moneyFields = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
    "cuocPhiBS",
    "bocXepBS",
    "veBS",
    "hangVeBS",
    "luuCaBS",
    "cpKhacBS",
    "daThanhToan",
  ];

  const formatMoney = (value) =>
    value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

  const formatDate = (v) => (typeof v === "string" ? v.slice(0, 10) : "");

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, ghiChu: initialData.ghiChu || "" });
    }
  }, [initialData]);

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);

  const [driverSuggestions, setDriverSuggestions] = useState([]);
  const [isDriverFocused, setIsDriverFocused] = useState(false);

  const [vehicleSuggestions, setVehicleSuggestions] = useState([]);
  const [isVehicleFocused, setIsVehicleFocused] = useState(false);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [isPickupFocused, setIsPickupFocused] = useState(false);
  const [isDropFocused, setIsDropFocused] = useState(false);

  const [customer2Suggestions, setCustomer2Suggestions] = useState([]);
  const [isCustomer2Focused, setIsCustomer2Focused] = useState(false);

  const [customerIndex, setCustomerIndex] = useState(-1);
  const [driverIndex, setDriverIndex] = useState(-1);
  const [vehicleIndex, setVehicleIndex] = useState(-1);
  const [pickupIndex, setPickupIndex] = useState(-1);
  const [dropIndex, setDropIndex] = useState(-1);
  const [customer2Index, setCustomer2Index] = useState(-1);
  useEffect(() => setCustomerIndex(-1), [customerSuggestions]);
  useEffect(() => setDriverIndex(-1), [driverSuggestions]);
  useEffect(() => setVehicleIndex(-1), [vehicleSuggestions]);
  useEffect(() => setPickupIndex(-1), [pickupSuggestions]);
  useEffect(() => setDropIndex(-1), [dropSuggestions]);
  useEffect(() => setCustomer2Index(-1), [customer2Suggestions]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ===== TIỀN =====
    if (moneyFields.includes(name)) {
      const raw = value.replace(/\./g, "");
      setFormData((prev) => ({ ...prev, [name]: raw }));
      return;
    }

    // ===== KHÁCH HÀNG =====
    if (name === "khachHang") {
      setFormData((prev) => ({ ...prev, khachHang: value }));

      const filtered = customers.filter((c) =>
        removeVietnameseTones(c.tenKhachHang || c.name).includes(
          removeVietnameseTones(value),
        ),
      );
      setCustomerSuggestions(filtered);

      const matched = customers.find(
        (c) =>
          removeVietnameseTones(c.tenKhachHang || c.name) ===
          removeVietnameseTones(value),
      );
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          maKH: matched.code,
          keToanPhuTrach: matched.accountant || "",
          accountUsername: matched.accUsername || "",
        }));
      }
      return;
    }

    // ===== LÁI XE =====
    if (name === "tenLaiXe") {
      setFormData((prev) => ({ ...prev, tenLaiXe: value }));

      const filtered = drivers.filter((d) =>
        removeVietnameseTones(d.name).includes(removeVietnameseTones(value)),
      );
      setDriverSuggestions(filtered);
      return;
    }

    // ===== BIỂN SỐ XE =====
    if (name === "bienSoXe") {
      setFormData((prev) => ({ ...prev, bienSoXe: value }));

      const filtered = vehicles.filter((v) =>
        removeVietnameseTones(v.plateNumber).includes(
          removeVietnameseTones(value),
        ),
      );
      setVehicleSuggestions(filtered);
      return;
    }
    // ===== ĐIỂM ĐÓNG HÀNG =====
    if (name === "diemXepHang") {
      setFormData((prev) => {
        const next = value;

        const completedList = splitCompletedPoints(next);

        const newList = completedList.map((diaChi) =>
          getDiaChiMoiByDiaChi(diaChi, addresses),
        );

        return {
          ...prev,
          diemXepHang: next,
          diemXepHangNew: newList.join("; ") + (newList.length ? "; " : ""),
        };
      });

      const { keyword } = splitAddressInput(value);
      if (!keyword) {
        setPickupSuggestions([]);
        return;
      }

      const filtered = (addresses || [])
        .map((a) => ({
          ...a,
          __score: scoreAddressMatch(keyword, a.diaChi),
        }))
        .filter((a) => a.__score > 0)
        .sort((a, b) => {
          if (b.__score !== a.__score) return b.__score - a.__score;
          return a.diaChi.length - b.diaChi.length;
        });

      setPickupSuggestions(filtered.slice(0, 50));

      return;
    }

    // ===== ĐIỂM GIAO HÀNG =====
    if (name === "diemDoHang") {
      setFormData((prev) => {
        const next = value;
        const completedList = splitCompletedPoints(next);

        const newList = completedList.map((diaChi) =>
          getDiaChiMoiByDiaChi(diaChi, addresses),
        );

        return {
          ...prev,
          diemDoHang: next,
          diemDoHangNew: newList.join("; ") + (newList.length ? "; " : ""),
        };
      });

      const { keyword } = splitAddressInput(value);
      if (!keyword) {
        setDropSuggestions([]);
        return;
      }

      const filtered = (addresses || [])
        .map((a) => ({
          ...a,
          __score: scoreAddressMatch(keyword, a.diaChi),
        }))
        .filter((a) => a.__score > 0)
        .sort((a, b) => {
          if (b.__score !== a.__score) return b.__score - a.__score;
          return a.diaChi.length - b.diaChi.length;
        });

      setDropSuggestions(filtered.slice(0, 50));

      return;
    }

    // ===== KH ĐIỂM GIAO (Customer2) =====
    if (name === "KHdiemGiaoHang") {
      setFormData((prev) => ({ ...prev, KHdiemGiaoHang: value }));

      const filtered = customers2.filter((c) =>
        removeVietnameseTones(c.nameKH).includes(removeVietnameseTones(value)),
      );

      setCustomer2Suggestions(filtered);
      return;
    }

    // ===== DEFAULT – CÁC FIELD CÒN LẠI =====
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold flex-1">
            Chỉnh sửa chuyến: {formData.maChuyen || formData._id}
          </h2>

          <input
            className="border rounded p-2 w-48"
            placeholder="Nhập mã lịch trình..."
            value={compareCode}
            onChange={(e) => setCompareCode(e.target.value)}
          />

          <button
            onClick={handleCompare}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            Đối chiếu
          </button>

          <button
            onClick={handleSaveMaLichTrinh}
            disabled={assignLoading}
            className={`px-3 py-2 rounded text-white ${
              assignLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {assignLoading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* ================== TRÁI ================== */}
          <div className="border rounded p-4">
            {/* LT – ONL – OFF */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { key: "ltState", label: "LT" },
                { key: "onlState", label: "ONL" },
                { key: "offState", label: "OFF" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col">
                  <label className="font-semibold">{label}</label>

                  <input
                    className="border rounded w-full p-2 mt-1"
                    value={formData[key] || ""}
                    name={key}
                    onChange={handleChange}
                  />

                  {/* HÀNG HINT – LUÔN TỒN TẠI */}
                  <div className="min-h-[16px] mt-1">
                    {key === "onlState" && (
                      <CompareHint
                        result={compareResult.onlState}
                        fieldKey="onlState"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* KH */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="font-semibold">Mã KH</label>
                <input
                  className="border rounded p-2 bg-gray-200 w-full"
                  readOnly
                  value={formData.maKH || ""}
                />
              </div>
              <div className="col-span-2 relative">
                <label className="font-semibold">Khách hàng</label>
                <input
                  type="text"
                  name="khachHang"
                  value={formData.khachHang || ""}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (!customerSuggestions.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCustomerIndex((i) =>
                        i < customerSuggestions.length - 1 ? i + 1 : 0,
                      );
                    }

                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setCustomerIndex((i) =>
                        i > 0 ? i - 1 : customerSuggestions.length - 1,
                      );
                    }

                    if (e.key === "Enter" && customerIndex >= 0) {
                      e.preventDefault();
                      const c = customerSuggestions[customerIndex];

                      setFormData((prev) => ({
                        ...prev,
                        khachHang: c.tenKhachHang || c.name,
                        maKH: c.code,
                        keToanPhuTrach: c.accountant || "",
                        accountUsername: c.accUsername || "",
                      }));

                      setCustomerSuggestions([]);
                    }

                    if (e.key === "Escape") {
                      setCustomerSuggestions([]);
                    }
                  }}
                  onFocus={() => setIsCustomerFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsCustomerFocused(false), 150)
                  }
                  className="border p-2 w-full rounded"
                  autoComplete="off"
                />
                <CompareHint result={compareResult.khachHang} />

                {isCustomerFocused && customerSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full w-full z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
                    {customerSuggestions.map((c, index) => (
                      <li
                        key={c._id}
                        className={`p-2 cursor-pointer
            ${index === customerIndex ? "bg-blue-100" : "hover:bg-gray-200"}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            khachHang: c.tenKhachHang || c.name,
                            maKH: c.code,
                            keToanPhuTrach: c.accountant || "",
                            accountUsername: c.accUsername || "",
                          }));
                          setCustomerSuggestions([]);
                        }}
                      >
                        {c.tenKhachHang || c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="relative">
              <label className="font-semibold">Điểm đóng hàng</label>
              <input
                type="text"
                name="diemXepHang"
                value={formData.diemXepHang || ""}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (!pickupSuggestions.length) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPickupIndex((i) =>
                      i < pickupSuggestions.length - 1 ? i + 1 : 0,
                    );
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPickupIndex((i) =>
                      i > 0 ? i - 1 : pickupSuggestions.length - 1,
                    );
                  }

                  if (e.key === "Enter" && pickupIndex >= 0) {
                    e.preventDefault();
                    const a = pickupSuggestions[pickupIndex];
                    const diaChiMoi = getDiaChiMoi(a);

                    setFormData((prev) => ({
                      ...prev,
                      diemXepHang: appendAddress(prev.diemXepHang, a.diaChi),
                      diemXepHangNew: appendAddress(
                        prev.diemXepHangNew,
                        diaChiMoi,
                      ),
                    }));

                    setPickupSuggestions([]);
                  }

                  if (e.key === "Escape") {
                    setPickupSuggestions([]);
                  }
                }}
                onFocus={() => setIsPickupFocused(true)}
                onBlur={() => setTimeout(() => setIsPickupFocused(false), 150)}
                className="border p-2 w-full rounded mt-1 mb-1"
                placeholder="Nhập điểm đóng hàng (cách nhau bằng dấu ; )"
                autoComplete="off"
                spellCheck={false}
              />
              <CompareHint result={compareResult.diemXepHang} />
              {isPickupFocused && pickupSuggestions.length > 0 && (
                <ul className="absolute w-full top-full left-0 z-50 bg-white border w-full max-h-48 overflow-y-auto mt-1 rounded shadow">
                  {pickupSuggestions.map((a, index) => (
                    <li
                      key={a._id}
                      className={`p-2 cursor-pointer text-sm
                          ${
                            index === pickupIndex
                              ? "bg-blue-100"
                              : "hover:bg-gray-200"
                          }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const diaChiMoi = getDiaChiMoi(a);
                        setFormData((prev) => ({
                          ...prev,
                          diemXepHang: appendAddress(
                            prev.diemXepHang,
                            a.diaChi,
                          ),
                          diemXepHangNew: appendAddress(
                            prev.diemXepHangNew,
                            diaChiMoi,
                          ),
                        }));
                        setPickupSuggestions([]);
                      }}
                    >
                      {a.diaChi}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {formData.diemXepHangNew && (
              <div className="text-xs text-gray-500 mt-1 mb-1">
                Địa chỉ mới:{" "}
                <span className="italic">{formData.diemXepHangNew}</span>
              </div>
            )}

            <div className="relative mt-1">
              <label className="font-semibold relative">Điểm giao hàng</label>
              <input
                type="text"
                name="diemDoHang"
                value={formData.diemDoHang || ""}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (!dropSuggestions.length) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setDropIndex((i) =>
                      i < dropSuggestions.length - 1 ? i + 1 : 0,
                    );
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setDropIndex((i) =>
                      i > 0 ? i - 1 : dropSuggestions.length - 1,
                    );
                  }

                  if (e.key === "Enter" && dropIndex >= 0) {
                    e.preventDefault();
                    const a = dropSuggestions[dropIndex];
                    const diaChiMoi = getDiaChiMoi(a);

                    setFormData((prev) => ({
                      ...prev,
                      diemDoHang: appendAddress(prev.diemDoHang, a.diaChi),
                      diemDoHangNew: appendAddress(
                        prev.diemDoHangNew,
                        diaChiMoi,
                      ),
                    }));
                    setDropSuggestions([]);
                  }
                }}
                onFocus={() => setIsDropFocused(true)}
                onBlur={() => setTimeout(() => setIsDropFocused(false), 150)}
                placeholder="Nhập điểm giao hàng (cách nhau bằng dấu ; )"
                className="border p-2 w-full rounded mt-1"
                autoComplete="off"
              />
              <CompareHint result={compareResult.diemDoHang} />

              {isDropFocused && dropSuggestions.length > 0 && (
                <ul className="absolute w-full top-full left-0 z-50 bg-white border max-h-48 overflow-y-auto mt-1 rounded shadow">
                  {dropSuggestions.map((a, index) => (
                    <li
                      key={a._id}
                      className={`p-2 cursor-pointer text-sm ${
                        index === dropIndex
                          ? "bg-blue-100"
                          : "hover:bg-gray-200"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const diaChiMoi = getDiaChiMoi(a);
                        setFormData((prev) => ({
                          ...prev,
                          diemDoHang: appendAddress(prev.diemDoHang, a.diaChi),
                          diemDoHangNew: appendAddress(
                            prev.diemDoHangNew,
                            diaChiMoi,
                          ),
                        }));
                        setDropSuggestions([]);
                      }}
                    >
                      {a.diaChi}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {formData.diemDoHangNew && (
              <div className="text-xs text-gray-500 mt-1 mb-2">
                Địa chỉ mới:{" "}
                <span className="italic">{formData.diemDoHangNew}</span>
              </div>
            )}

            {/* ===== KH ĐIỂM GIAO ===== */}
            <div className="relative">
              <label className="block text-xs font-medium mt-2">
                KH điểm giao
              </label>

              <input
                type="text"
                name="KHdiemGiaoHang"
                value={formData.KHdiemGiaoHang || ""}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (!customer2Suggestions.length) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCustomer2Index((i) =>
                      i < customer2Suggestions.length - 1 ? i + 1 : 0,
                    );
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCustomer2Index((i) =>
                      i > 0 ? i - 1 : customer2Suggestions.length - 1,
                    );
                  }

                  if (e.key === "Enter" && customer2Index >= 0) {
                    e.preventDefault();
                    setFormData((prev) => ({
                      ...prev,
                      KHdiemGiaoHang:
                        customer2Suggestions[customer2Index].nameKH,
                    }));
                    setCustomer2Suggestions([]);
                  }

                  if (e.key === "Escape") {
                    setCustomer2Suggestions([]);
                  }
                }}
                onFocus={() => setIsCustomer2Focused(true)}
                onBlur={() =>
                  setTimeout(() => setIsCustomer2Focused(false), 150)
                }
                className="border p-2 w-full rounded mt-1"
                placeholder="Nhập tên KH điểm giao"
                autoComplete="off"
                spellCheck={false}
              />

              {isCustomer2Focused && customer2Suggestions.length > 0 && (
                <ul className="absolute w-full top-full left-0 z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
                  {customer2Suggestions.map((c, index) => (
                    <li
                      key={c._id}
                      className={`p-2 cursor-pointer
    ${index === customer2Index ? "bg-blue-100" : "hover:bg-gray-200"}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          KHdiemGiaoHang: c.nameKH,
                        }));
                        setCustomer2Suggestions([]);
                      }}
                    >
                      {c.nameKH}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3 mt-3">
              <div>
                <label className="font-semibold block mb-1">Số điểm</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Số điểm"
                  value={formData.soDiem || ""}
                  name="soDiem"
                  onChange={handleChange}
                />
                <CompareHint result={compareResult.soDiem} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Trọng lượng</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Trọng lượng"
                  value={formData.trongLuong || ""}
                  name="trongLuong"
                  onChange={handleChange}
                />
                <CompareHint result={compareResult.trongLuong} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Cước phí</label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Cước phí"
                  value={formatMoney(formData.cuocPhi)}
                  name="cuocPhi"
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  Đã thanh toán
                </label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Đã thanh toán"
                  value={formatMoney(formData.daThanhToan)}
                  name="daThanhToan"
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* ================== PHẢI ================== */}
          <div className="border rounded p-4">
            {/* ===== BSX + TÊN LÁI XE (1 DÒNG) ===== */}
            <div className="flex gap-3 mb-3 items-end">
              <div className="w-1/3 relative">
                <label className="font-semibold block mb-1">Biển số xe</label>
                <input
                  type="text"
                  name="bienSoXe"
                  value={formData.bienSoXe || ""}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (!vehicleSuggestions.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setVehicleIndex((i) =>
                        i < vehicleSuggestions.length - 1 ? i + 1 : 0,
                      );
                    }

                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setVehicleIndex((i) =>
                        i > 0 ? i - 1 : vehicleSuggestions.length - 1,
                      );
                    }

                    if (e.key === "Enter" && vehicleIndex >= 0) {
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        bienSoXe: vehicleSuggestions[vehicleIndex].plateNumber,
                      }));
                      setVehicleSuggestions([]);
                    }
                  }}
                  onFocus={() => setIsVehicleFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsVehicleFocused(false), 150)
                  }
                  className="border p-2 w-full rounded"
                  autoComplete="off"
                />

                <CompareHint result={compareResult.bienSoXe} />

                {isVehicleFocused && vehicleSuggestions.length > 0 && (
                  <ul className="absolute w-full top-full left-0 z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
                    {vehicleSuggestions.map((v, index) => (
                      <li
                        key={v._id}
                        className={`p-2 cursor-pointer ${
                          index === vehicleIndex
                            ? "bg-blue-100"
                            : "hover:bg-gray-200"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            bienSoXe: v.plateNumber,
                          }));
                          setVehicleSuggestions([]);
                        }}
                      >
                        {v.plateNumber}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex-1 relative">
                <label className="font-semibold block mb-1">Tên lái xe</label>
                <input
                  type="text"
                  name="tenLaiXe"
                  value={formData.tenLaiXe || ""}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (!driverSuggestions.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setDriverIndex((i) =>
                        i < driverSuggestions.length - 1 ? i + 1 : 0,
                      );
                    }

                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setDriverIndex((i) =>
                        i > 0 ? i - 1 : driverSuggestions.length - 1,
                      );
                    }

                    if (e.key === "Enter" && driverIndex >= 0) {
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        tenLaiXe: driverSuggestions[driverIndex].name,
                      }));
                      setDriverSuggestions([]);
                    }
                  }}
                  onFocus={() => setIsDriverFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsDriverFocused(false), 150)
                  }
                  className="border p-2 w-full rounded"
                  autoComplete="off"
                />

                <CompareHint result={compareResult.tenLaiXe} />

                {isDriverFocused && driverSuggestions.length > 0 && (
                  <ul className="absolute w-full top-full left-0 z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
                    {driverSuggestions.map((d, index) => (
                      <li
                        key={d._id}
                        className={`p-2 cursor-pointer ${
                          index === driverIndex
                            ? "bg-blue-100"
                            : "hover:bg-gray-200"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tenLaiXe: d.name,
                          }));
                          setDriverSuggestions([]);
                        }}
                      >
                        {d.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ===== DIỄN GIẢI ===== */}
            <label className="font-semibold">Diễn giải</label>
            <input
              className="border rounded p-2 w-full mb-3"
              value={formData.dienGiai || ""}
              name="dienGiai"
              onChange={handleChange}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Ngày đóng hàng</label>
                <input
                  type="date"
                  className="border rounded p-2"
                  value={formatDate(formData.ngayBocHang)}
                  name="ngayBocHang"
                  onChange={handleChange}
                  onClick={(e) => e.target.showPicker()}
                />
                <CompareHint
                  result={compareResult.ngayBocHang}
                  fieldKey="ngayBocHang"
                />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Ngày giao hàng</label>
                <input
                  type="date"
                  className="border rounded p-2"
                  value={formatDate(formData.ngayGiaoHang)}
                  name="ngayGiaoHang"
                  onChange={handleChange}
                  onClick={(e) => e.target.showPicker()}
                />
                <CompareHint
                  result={compareResult.ngayGiaoHang}
                  fieldKey="ngayGiaoHang"
                />
              </div>
            </div>

            {/* ===== CƯỚC PHÍ PHỤ GỐC (BĐ) ===== */}
            <div className="mb-4">
              <label className="font-semibold">Cước phí phụ (BĐ)</label>

              {/* Dòng 1 */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-sm">Bốc xếp</label>
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.bocXep)}
                    name="bocXep"
                    onChange={handleChange}
                  />
                  <CompareHint result={compareResult.bocXep} />
                </div>

                <div>
                  <label className="text-sm">Hàng về</label>
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.hangVe)}
                    name="hangVe"
                    onChange={handleChange}
                  />
                  <CompareHint result={compareResult.hangVe} />
                </div>
              </div>

              {/* Dòng 2 */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm">Vé</label>
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.ve)}
                    name="ve"
                    onChange={handleChange}
                  />
                  <CompareHint result={compareResult.ve} />
                </div>

                <div>
                  <label className="text-sm">Lưu ca</label>
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.luuCa)}
                    name="luuCa"
                    onChange={handleChange}
                  />
                  <CompareHint result={compareResult.luuCa} />
                </div>
              </div>

              {/* Dòng 3 – full width */}
              <div className="mt-3">
                <label className="text-sm">Luật chi phí khác</label>
                <input
                  className="border rounded p-2 w-full"
                  value={formatMoney(formData.luatChiPhiKhac)}
                  name="luatChiPhiKhac"
                  onChange={handleChange}
                />
                <CompareHint result={compareResult.luatChiPhiKhac} />
              </div>
            </div>

            {compareData && (
              <div className="border rounded p-4 mt-4 bg-gray-50">
                <h3 className="font-semibold mb-3 text-sm text-gray-700">
                  Thông tin chỉ có ở lịch trình:
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {LT_ONLY_FIELDS.map(({ key, label }) => {
                    const value = compareData[key];

                    if (value === null || value === undefined || value === "") {
                      return null; // không có thì khỏi hiện
                    }

                    return (
                      <div key={key} className="text-sm">
                        <div className="text-gray-500">{label}</div>
                        <div className="font-medium">
                          {typeof value === "number"
                            ? formatMoney(value)
                            : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GHI CHÚ */}
        <div className="mt-4">
          <label className="font-semibold">Ghi chú (bắt buộc)</label>
          <textarea
            rows={3}
            className="border rounded w-full p-2 mt-1"
            value={formData.ghiChu}
            name="ghiChu"
            onChange={handleChange}
          />
        </div>

        {/* ACTION */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
}
