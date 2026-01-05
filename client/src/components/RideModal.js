import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
registerLocale("vi", vi);

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
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
};

const getDiaChiMoi = (address) => {
  return address.diaChiMoi && address.diaChiMoi.trim()
    ? address.diaChiMoi
    : address.diaChi;
};

const appendAddress = (prevValue, newValue) => {
  const { prefix } = splitAddressInput(prevValue || "");
  return `${prefix}${newValue}; `;
};

const splitCompletedPoints = (str = "") => {
  // chỉ lấy các đoạn KẾT THÚC bởi ;
  return str
    .split(";")
    .slice(0, -1) // ❗ bỏ đoạn đang gõ dở
    .map((s) => s.trim())
    .filter(Boolean);
};

const getDiaChiMoiByDiaChi = (diaChi, addresses = []) => {
  const found = addresses.find((a) => a.diaChi.trim() === diaChi.trim());

  if (!found) return diaChi;

  return found.diaChiMoi && found.diaChiMoi.trim()
    ? found.diaChiMoi
    : found.diaChi;
};

export default function RideModal({
  initialData,
  onClose,
  onSave,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
  vehicles = [],
  addresses = [],
  customers2 = [],
}) {
  const [form, setForm] = useState(initialData || {});
  const [checkedFees, setCheckedFees] = useState({
    bocXep: false,
    ve: false,
    hangVe: false,
    luuCa: false,
    luatChiPhiKhac: false,
  });

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

  const moneyFields = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
  ];

  const formatMoney = (value) => {
    if (!value && value !== 0) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const numberToVietnameseText = (num) => {
    if (!num) return "";
    const number = parseInt(num.toString().replace(/\D/g, ""), 10);
    if (isNaN(number)) return "";
    const ChuSo = [
      "không",
      "một",
      "hai",
      "ba",
      "bốn",
      "năm",
      "sáu",
      "bảy",
      "tám",
      "chín",
    ];
    const DonVi = ["", "nghìn", "triệu", "tỷ"];

    const readTriple = (n) => {
      let tram = Math.floor(n / 100);
      let chuc = Math.floor((n % 100) / 10);
      let donvi = n % 10;
      let s = "";
      if (tram > 0) s += ChuSo[tram] + " trăm ";
      if (chuc > 1) s += ChuSo[chuc] + " mươi ";
      if (chuc === 1) s += "mười ";
      if (chuc !== 0 && donvi === 1) s += "mốt ";
      else if (donvi === 5 && chuc !== 0) s += "lăm ";
      else if (donvi !== 0) s += ChuSo[donvi] + " ";
      return s.trim();
    };

    let i = 0,
      text = "";
    let tempNumber = number;
    while (tempNumber > 0) {
      let n = tempNumber % 1000;
      if (n !== 0) text = readTriple(n) + " " + DonVi[i] + " " + text;
      tempNumber = Math.floor(tempNumber / 1000);
      i++;
    }

    return text.trim() + " VNĐ";
  };

  const removeVietnameseTones = (str) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const scoreAddressMatch = (keyword, address) => {
    const k = removeVietnameseTones(keyword);
    const a = removeVietnameseTones(address);

    // 1️⃣ Trùng tuyệt đối
    if (a === k) return 1000;

    // 2️⃣ Bắt đầu bằng keyword
    if (a.startsWith(k)) return 800;

    // 3️⃣ Keyword là 1 cụm từ độc lập
    if (a.includes(` ${k} `) || a.endsWith(` ${k}`)) return 600;

    // 4️⃣ Match từng từ (logic cũ)
    const words = k.split(/\s+/).filter(Boolean);
    let score = 0;

    words.forEach((w) => {
      if (a.includes(w)) score += 50;
      else if (a.split(/\s+/).some((t) => levenshtein(w, t) <= 1)) score += 20;
    });

    return score;
  };

  useEffect(() => {
    if (!currentUser) return;

    setForm((prev) => ({
      ...prev,
      createdByID: prev.createdByID || currentUser._id,
      createdBy: prev.createdBy || currentUser.fullname || currentUser.username,
    }));

    if (dieuVanList && dieuVanList.length) {
      const selected =
        dieuVanList.find((d) => d._id === currentUser._id) ||
        dieuVanList.find((d) => d.username === currentUser.username);
      if (selected) {
        setForm((prev) => ({
          ...prev,
          dieuVanID: prev.dieuVanID || selected._id,
          dieuVan: prev.dieuVan || selected.fullname || selected.username,
        }));
      }
    }
  }, [currentUser, dieuVanList]);

  useEffect(() => {
    console.log("customers2 updated:", customers2);
  }, [customers2]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ===== TIỀN =====
    if (moneyFields.includes(name)) {
      const raw = value.replace(/\./g, "");
      setForm((prev) => ({ ...prev, [name]: raw }));
      return;
    }

    // ===== KHÁCH HÀNG =====
    if (name === "khachHang") {
      setForm((prev) => ({ ...prev, khachHang: value }));

      const filtered = customers.filter((c) =>
        removeVietnameseTones(c.tenKhachHang || c.name).includes(
          removeVietnameseTones(value)
        )
      );
      setCustomerSuggestions(filtered);

      const matched = customers.find(
        (c) =>
          removeVietnameseTones(c.tenKhachHang || c.name) ===
          removeVietnameseTones(value)
      );
      if (matched) {
        setForm((prev) => ({
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
      setForm((prev) => ({ ...prev, tenLaiXe: value }));

      const filtered = drivers.filter((d) =>
        removeVietnameseTones(d.name).includes(removeVietnameseTones(value))
      );
      setDriverSuggestions(filtered);
      return;
    }

    // ===== BIỂN SỐ XE =====
    if (name === "bienSoXe") {
      setForm((prev) => ({ ...prev, bienSoXe: value }));

      const filtered = vehicles.filter((v) =>
        removeVietnameseTones(v.plateNumber).includes(
          removeVietnameseTones(value)
        )
      );
      setVehicleSuggestions(filtered);
      return;
    }
    // ===== ĐIỂM ĐÓNG HÀNG =====
    if (name === "diemXepHang") {
      setForm((prev) => {
        const next = value;

        const completedList = splitCompletedPoints(next);

        const newList = completedList.map((diaChi) =>
          getDiaChiMoiByDiaChi(diaChi, addresses)
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
      setForm((prev) => {
        const next = value;
        const completedList = splitCompletedPoints(next);

        const newList = completedList.map((diaChi) =>
          getDiaChiMoiByDiaChi(diaChi, addresses)
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
      setForm((prev) => ({ ...prev, KHdiemGiaoHang: value }));

      const filtered = customers2.filter((c) =>
        removeVietnameseTones(c.nameKH).includes(removeVietnameseTones(value))
      );

      setCustomer2Suggestions(filtered);
      return;
    }

    // ===== DEFAULT – CÁC FIELD CÒN LẠI =====
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleFee = (key) => {
    setCheckedFees((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) {
        setForm((p) => ({ ...p, [key]: "" }));
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const matchedCustomer = customers.find(
      (c) => (c.tenKhachHang || c.name) === form.khachHang
    );
    if (!matchedCustomer) {
      alert("Vui lòng chọn khách hàng từ danh sách có sẵn!");
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const payload = {
      ...form,
      createdByID: currentUser._id,
      createdBy: currentUser.fullname || currentUser.username,
      dieuVanID: form.dieuVanID || currentUser._id,
      dieuVan: form.dieuVan || currentUser.fullname || currentUser.username,
      ngayBoc: `${yyyy}-${mm}-${dd}`,
      ghiChu: form.ghiChu || "",
    };

    if (!payload.maChuyen) {
      delete payload.maChuyen;
    }

    onSave(payload);
  };

  const handleClose = () => {
    onClose();
  };

  const fields = [
    {
      name: "bienSoXe",
      label: "Biển số xe",
      type: "text",
      list: "vehicleList",
    },
    {
      name: "khachHang",
      label: "Khách hàng",
      type: "text",
      list: "customerList",
    },
    { name: "ngayBocHang", label: "Ngày đóng hàng", type: "text" },
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "text" },
    { name: "diemXepHang", label: "Điểm đóng hàng", type: "text" },
    { name: "soDiem", label: "Số điểm", type: "text" },
    { name: "diemDoHang", label: "Điểm giao hàng", type: "text" },
    { name: "trongLuong", label: "Trọng lượng", type: "text" },
  ];

  const parseISODate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split("-");
    return new Date(y, m - 1, d);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          {form._id ? "Sửa chuyến" : "Thêm chuyến mới"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Tên lái xe</label>
            <input
              type="text"
              name="tenLaiXe"
              value={form.tenLaiXe || ""}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (!driverSuggestions.length) return;

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setDriverIndex((i) =>
                    i < driverSuggestions.length - 1 ? i + 1 : 0
                  );
                }

                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setDriverIndex((i) =>
                    i > 0 ? i - 1 : driverSuggestions.length - 1
                  );
                }

                if (e.key === "Enter" && driverIndex >= 0) {
                  e.preventDefault();
                  setForm((prev) => ({
                    ...prev,
                    tenLaiXe: driverSuggestions[driverIndex].name,
                  }));
                  setDriverSuggestions([]);
                }
              }}
              onFocus={() => setIsDriverFocused(true)}
              onBlur={() => setTimeout(() => setIsDriverFocused(false), 150)}
              className="border p-2 w-full rounded"
              autoComplete="off"
            />

            {isDriverFocused && driverSuggestions.length > 0 && (
              <ul className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto mt-1 rounded shadow">
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
                      setForm((prev) => ({ ...prev, tenLaiXe: d.name }));
                      setDriverSuggestions([]);
                    }}
                  >
                    {d.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {fields.map((f) => (
            <div key={f.name} className="relative">
              <label className="block text-sm font-medium mb-1">
                {f.label}
              </label>

              {/* ===== DATE ===== */}
              {f.name === "ngayBocHang" || f.name === "ngayGiaoHang" ? (
                <DatePicker
                  locale="vi"
                  selected={form[f.name] ? parseISODate(form[f.name]) : null}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      [f.name]: date
                        ? `${date.getFullYear()}-${String(
                            date.getMonth() + 1
                          ).padStart(2, "0")}-${String(date.getDate()).padStart(
                            2,
                            "0"
                          )}`
                        : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 w-full rounded"
                />
              ) : f.name === "bienSoXe" ? (
                /* ===== BIỂN SỐ XE ===== */
                <>
                  <input
                    type="text"
                    name="bienSoXe"
                    value={form.bienSoXe || ""}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (!vehicleSuggestions.length) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setVehicleIndex((i) =>
                          i < vehicleSuggestions.length - 1 ? i + 1 : 0
                        );
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setVehicleIndex((i) =>
                          i > 0 ? i - 1 : vehicleSuggestions.length - 1
                        );
                      }

                      if (e.key === "Enter" && vehicleIndex >= 0) {
                        e.preventDefault();
                        setForm((prev) => ({
                          ...prev,
                          bienSoXe:
                            vehicleSuggestions[vehicleIndex].plateNumber,
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

                  {isVehicleFocused && vehicleSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto mt-1 rounded shadow">
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
                            setForm((prev) => ({
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
                </>
              ) : f.name === "diemXepHang" ? (
                <>
                  <input
                    type="text"
                    name="diemXepHang"
                    value={form.diemXepHang || ""}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (!pickupSuggestions.length) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setPickupIndex((i) =>
                          i < pickupSuggestions.length - 1 ? i + 1 : 0
                        );
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setPickupIndex((i) =>
                          i > 0 ? i - 1 : pickupSuggestions.length - 1
                        );
                      }

                      if (e.key === "Enter" && pickupIndex >= 0) {
                        e.preventDefault();
                        const a = pickupSuggestions[pickupIndex];
                        const diaChiMoi = getDiaChiMoi(a);

                        setForm((prev) => ({
                          ...prev,
                          diemXepHang: appendAddress(
                            prev.diemXepHang,
                            a.diaChi
                          ),
                          diemXepHangNew: appendAddress(
                            prev.diemXepHangNew,
                            diaChiMoi
                          ),
                        }));

                        setPickupSuggestions([]);
                      }

                      if (e.key === "Escape") {
                        setPickupSuggestions([]);
                      }
                    }}
                    onFocus={() => setIsPickupFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setIsPickupFocused(false), 150)
                    }
                    className="border p-2 w-full rounded"
                    placeholder="Nhập điểm đóng hàng (cách nhau bằng dấu ; )"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  {form.diemXepHangNew && (
                    <div className="text-xs text-gray-500 mt-1">
                      Địa chỉ mới:{" "}
                      <span className="italic">{form.diemXepHangNew}</span>
                    </div>
                  )}

                  {isPickupFocused && pickupSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white border w-full max-h-48 overflow-y-auto mt-1 rounded shadow">
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
                            setForm((prev) => ({
                              ...prev,
                              diemXepHang: appendAddress(
                                prev.diemXepHang,
                                a.diaChi
                              ),
                              diemXepHangNew: appendAddress(
                                prev.diemXepHangNew,
                                diaChiMoi
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
                </>
              ) : f.name === "diemDoHang" ? (
                <>
                  <input
                    type="text"
                    name="diemDoHang"
                    value={form.diemDoHang || ""}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (!dropSuggestions.length) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setDropIndex((i) =>
                          i < dropSuggestions.length - 1 ? i + 1 : 0
                        );
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setDropIndex((i) =>
                          i > 0 ? i - 1 : dropSuggestions.length - 1
                        );
                      }

                      if (e.key === "Enter" && dropIndex >= 0) {
                        e.preventDefault();
                        const a = dropSuggestions[dropIndex];
                        const diaChiMoi = getDiaChiMoi(a);

                        setForm((prev) => ({
                          ...prev,
                          diemDoHang: appendAddress(prev.diemDoHang, a.diaChi),
                          diemDoHangNew: appendAddress(
                            prev.diemDoHangNew,
                            diaChiMoi
                          ),
                        }));
                        setDropSuggestions([]);
                      }
                    }}
                    onFocus={() => setIsDropFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setIsDropFocused(false), 150)
                    }
                    placeholder="Nhập điểm giao hàng (cách nhau bằng dấu ; )"
                    className="border p-2 w-full rounded"
                    autoComplete="off"
                  />
                  {form.diemDoHangNew && (
                    <div className="text-xs text-gray-500 mt-1">
                      Địa chỉ mới:{" "}
                      <span className="italic">{form.diemDoHangNew}</span>
                    </div>
                  )}

                  {isDropFocused && dropSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white border w-full max-h-48 overflow-y-auto mt-1 rounded shadow">
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
                            setForm((prev) => ({
                              ...prev,
                              diemDoHang: appendAddress(
                                prev.diemDoHang,
                                a.diaChi
                              ),
                              diemDoHangNew: appendAddress(
                                prev.diemDoHangNew,
                                diaChiMoi
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
                </>
              ) : (
                /* ===== CÁC FIELD KHÁC ===== */
                <input
                  type={f.type}
                  name={f.name}
                  value={
                    moneyFields.includes(f.name)
                      ? formatMoney(form[f.name])
                      : form[f.name] || ""
                  }
                  onChange={handleChange}
                  onKeyDown={
                    f.name === "khachHang"
                      ? (e) => {
                          if (!customerSuggestions.length) return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setCustomerIndex((i) =>
                              i < customerSuggestions.length - 1 ? i + 1 : 0
                            );
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setCustomerIndex((i) =>
                              i > 0 ? i - 1 : customerSuggestions.length - 1
                            );
                          }

                          if (e.key === "Enter" && customerIndex >= 0) {
                            e.preventDefault();
                            const c = customerSuggestions[customerIndex];

                            setForm((prev) => ({
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
                        }
                      : undefined
                  }
                  className={`border p-2 w-full rounded ${f.className || ""}`}
                  {...(f.name === "khachHang"
                    ? {
                        onFocus: () => setIsCustomerFocused(true),
                        onBlur: () =>
                          setTimeout(() => setIsCustomerFocused(false), 150),
                        autoComplete: "off",
                      }
                    : {})}
                />
              )}

              {/* ===== KHÁCH HÀNG ===== */}
              {f.name === "khachHang" &&
                isCustomerFocused &&
                customerSuggestions.length > 0 && (
                  <ul className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto mt-1 rounded shadow">
                    {customerSuggestions.map((c, index) => (
                      <li
                        key={c._id}
                        className={`p-2 cursor-pointer
            ${index === customerIndex ? "bg-blue-100" : "hover:bg-gray-200"}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm((prev) => ({
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
          ))}

          {/* ===== KH ĐIỂM GIAO ===== */}
          <div className="relative col-span-2">
            <label className="block text-sm font-medium mb-1">
              KH điểm giao
            </label>

            <input
              type="text"
              name="KHdiemGiaoHang"
              value={form.KHdiemGiaoHang || ""}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (!customer2Suggestions.length) return;

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCustomer2Index((i) =>
                    i < customer2Suggestions.length - 1 ? i + 1 : 0
                  );
                }

                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCustomer2Index((i) =>
                    i > 0 ? i - 1 : customer2Suggestions.length - 1
                  );
                }

                if (e.key === "Enter" && customer2Index >= 0) {
                  e.preventDefault();
                  setForm((prev) => ({
                    ...prev,
                    KHdiemGiaoHang: customer2Suggestions[customer2Index].nameKH,
                  }));
                  setCustomer2Suggestions([]);
                }

                if (e.key === "Escape") {
                  setCustomer2Suggestions([]);
                }
              }}
              onFocus={() => setIsCustomer2Focused(true)}
              onBlur={() => setTimeout(() => setIsCustomer2Focused(false), 150)}
              className="border p-2 w-1/2 rounded"
              placeholder="Nhập tên KH điểm giao"
              autoComplete="off"
              spellCheck={false}
            />

            {isCustomer2Focused && customer2Suggestions.length > 0 && (
              <ul className="absolute z-50 bg-white border w-1/2 max-h-40 overflow-y-auto mt-1 rounded shadow">
                {customer2Suggestions.map((c, index) => (
                  <li
                    key={c._id}
                    className={`p-2 cursor-pointer
    ${index === customer2Index ? "bg-blue-100" : "hover:bg-gray-200"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm((prev) => ({
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

          {/* Cước phí và chi phí phụ */}
          <div className="col-span-2 flex items-start gap-10">
            <div className="w-60">
              <label className="block text-sm font-medium mb-1">
                Cước phí
                {form.cuocPhi && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({numberToVietnameseText(form.cuocPhi)})
                  </span>
                )}
              </label>
              <input
                type="text"
                name="cuocPhi"
                value={formatMoney(form.cuocPhi)}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-1">
                Chi phí phụ
              </label>
              <div className="flex flex-wrap items-center gap-6">
                {[
                  ["bocXep", "Bốc xếp"],
                  ["hangVe", "Hàng về"],
                  ["ve", "Vé"],
                  ["luuCa", "Lưu ca"],
                  ["luatChiPhiKhac", "Chi phí khác"],
                  ["laiXeThuCuoc", "Lái xe thu cước"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checkedFees[key]}
                      onChange={() => toggleFee(key)}
                    />
                    <span>
                      {label}
                      {checkedFees[key] && form[key] && (
                        <span className="text-[12px] text-gray-800 ml-1">
                          ({numberToVietnameseText(form[key])})
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Chi phí phụ hiển thị riêng */}
          <div className="col-span-2 flex items-center gap-4 mt-3">
            {Object.entries(checkedFees).map(
              ([key]) =>
                checkedFees[key] && (
                  <div
                    key={key}
                    className={`flex flex-col ${
                      key === "luatChiPhiKhac" ? "w-40" : "w-32"
                    }`}
                  >
                    <label className="text-xs mb-1">
                      {key === "bocXep"
                        ? "Bốc xếp"
                        : key === "hangVe"
                        ? "Hàng về"
                        : key === "ve"
                        ? "Vé"
                        : key === "luuCa"
                        ? "Lưu ca"
                        : key === "luatChiPhiKhac"
                        ? "Chi phí khác"
                        : "Lái xe thu cước"}
                    </label>
                    <input
                      type="text"
                      name={key}
                      value={formatMoney(form[key])}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      placeholder="0"
                    />
                  </div>
                )
            )}
          </div>

          {/* Ghi chú */}
          <div className="col-span-2 mt-1">
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              name="ghiChu"
              rows={2}
              value={form.ghiChu || ""}
              onChange={handleChange}
              placeholder="Nhập ghi chú..."
              className="border p-2 w-full rounded resize-y"
            />
          </div>

          {/* Actions */}
          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
