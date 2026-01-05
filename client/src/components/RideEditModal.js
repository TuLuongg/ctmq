import React, { useEffect, useState } from "react";

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

export default function RideEditModal({
  ride,
  onSubmit,
  onClose,
  drivers = [],
  customers = [],
  vehicles = [],
  addresses = [],
  customers2 = [],
}) {
  const [formData, setFormData] = useState({});

  const moneyFields = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "chiPhiKhac",
    "daThanhToan",
  ];

  const formatMoney = (value) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    if (ride) {
      setFormData({ ...ride, reason: "" });
    }
  }, [ride]);

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

  if (!ride) return null;

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
        removeVietnameseTones(d.name).includes(removeVietnameseTones(value))
      );
      setDriverSuggestions(filtered);
      return;
    }

    // ===== BIỂN SỐ XE =====
    if (name === "bienSoXe") {
      setFormData((prev) => ({ ...prev, bienSoXe: value }));

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
      setFormData((prev) => {
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
      setFormData((prev) => {
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
      setFormData((prev) => ({ ...prev, KHdiemGiaoHang: value }));

      const filtered = customers2.filter((c) =>
        removeVietnameseTones(c.nameKH).includes(removeVietnameseTones(value))
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

  const formatDate = (value) => {
    if (!value) return "";
    return value.split("T")[0] || value;
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  /* ==========================
      CHECKBOX: CÓ tick → hiện input
     ========================== */
  const feeItems = [
    { key: "bocXep", label: "Bốc xếp" },
    { key: "hangVe", label: "Hàng về" },
    { key: "ve", label: "Vé" },
    { key: "luuCa", label: "Lưu ca" },
    { key: "luatChiPhiKhac", label: "Luật Chi phí khác", full: true },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh] w-3/4">
        <h2 className="text-xl font-bold mb-4">
          Chỉnh sửa chuyến: {ride.maChuyen || ride._id}
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {/* ======================== BÊN TRÁI ========================== */}
          <div className="border rounded p-4">
            {/* LT – ONL – OFF */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="font-semibold">LT</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.ltState || ""}
                  onChange={(e) => handleChange("ltState", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">ONL</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.onlState || ""}
                  onChange={(e) => handleChange("onlState", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">OFF</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.offState || ""}
                  onChange={(e) => handleChange("offState", e.target.value)}
                />
              </div>
            </div>

            {/* Mã KH – Khách hàng (không cho sửa) */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="font-semibold">Mã KH</label>
                <input
                  className="border rounded w-full p-2 mt-1 bg-gray-200"
                  value={formData.maKH || ""}
                  readOnly
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
                  className="border p-2 w-full rounded mt-1"
                  autoComplete="off"
                />
                {isCustomerFocused && customerSuggestions.length > 0 && (
                  <ul className="absolute left-0 w-full z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
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

            {/* Điểm đóng hàng */}
            <div className="mb-1 relative">
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

                    setFormData((prev) => ({
                      ...prev,
                      diemXepHang: appendAddress(prev.diemXepHang, a.diaChi),
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
                onBlur={() => setTimeout(() => setIsPickupFocused(false), 150)}
                className="border p-2 w-full rounded mt-1"
                placeholder="Nhập điểm đóng hàng (cách nhau bằng dấu ; )"
                autoComplete="off"
                spellCheck={false}
              />

              {isPickupFocused && pickupSuggestions.length > 0 && (
                <ul className="absolute left-0 w-full z-50 bg-white border max-h-48 overflow-y-auto mt-1 rounded shadow">
                  {pickupSuggestions.map((a, index) => (
                    <li
                      key={a._id}
                      className={`p-2 cursor-pointer text-xs
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
            </div>
            {formData.diemXepHangNew && (
              <div className="text-xs text-gray-500 mb-2">
                Địa chỉ mới:{" "}
                <span className="italic">{formData.diemXepHangNew}</span>
              </div>
            )}

            {/* Điểm giao hàng */}
            <div className="mb-1 relative">
              <label className="font-semibold">Điểm giao hàng</label>
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

                    setFormData((prev) => ({
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
                onBlur={() => setTimeout(() => setIsDropFocused(false), 150)}
                placeholder="Nhập điểm giao hàng (cách nhau bằng dấu ; )"
                className="border p-2 w-full rounded mt-1"
                autoComplete="off"
              />
              {isDropFocused && dropSuggestions.length > 0 && (
                <ul className="absolute left-0 top-full w-full z-50 bg-white border max-h-48 overflow-y-auto mt-1 rounded shadow">
                  {dropSuggestions.map((a, index) => (
                    <li
                      key={a._id}
                      className={`p-2 cursor-pointer text-xs ${
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
            </div>
            {formData.diemDoHangNew && (
              <div className="text-xs text-gray-500 mb-2">
                Địa chỉ mới:{" "}
                <span className="italic">{formData.diemDoHangNew}</span>
              </div>
            )}

            <div className="relative">
              {/* ===== KH ĐIỂM GIAO ===== */}
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
                className="border p-2 w-full rounded mb-3 mt-1"
                placeholder="Nhập tên KH điểm giao"
                autoComplete="off"
                spellCheck={false}
              />

              {isCustomer2Focused && customer2Suggestions.length > 0 && (
                <ul className="absolute left-0 top-full w-full z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
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

            {/* Số điểm – Trọng lượng */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Số điểm</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.soDiem || ""}
                  onChange={(e) => handleChange("soDiem", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Trọng lượng</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.trongLuong || ""}
                  onChange={(e) => handleChange("trongLuong", e.target.value)}
                />
              </div>
            </div>

            {/* Cước phí – Đã thanh toán */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Cước phí</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formatMoney(formData.cuocPhi)}
                  onChange={(e) => handleChange("cuocPhi", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Đã thanh toán</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.daThanhToan || ""}
                  onChange={(e) => handleChange("daThanhToan", e.target.value)}
                />
              </div>
            </div>

            {/* Kế toán PT – Mã hóa đơn */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Kế toán PT</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.keToanPhuTrach || ""}
                  onChange={(e) =>
                    handleChange("keToanPhuTrach", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="font-semibold">Mã hóa đơn</label>
                <input
                  className="border rounded w-full p-2 mt-1"
                  value={formData.maHoaDon || ""}
                  onChange={(e) => handleChange("maHoaDon", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========================= BÊN PHẢI ========================= */}
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

                {isVehicleFocused && vehicleSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full w-full z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
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

                {isDriverFocused && driverSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full w-full z-50 bg-white border max-h-40 overflow-y-auto mt-1 rounded shadow">
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

            <div className="mb-3">
              <label className="font-semibold">Diễn giải</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.dienGiai || ""}
                onChange={(e) => handleChange("dienGiai", e.target.value)}
              />
            </div>

            {/* Ngày đóng – Ngày giao */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-semibold">Ngày đóng hàng</label>
                <input
                  type="date"
                  className="border rounded w-full p-2 mt-1"
                  value={formatDate(formData.ngayBocHang)}
                  onChange={(e) => handleChange("ngayBocHang", e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold">Ngày giao hàng</label>
                <input
                  type="date"
                  className="border rounded w-full p-2 mt-1"
                  value={formatDate(formData.ngayGiaoHang)}
                  onChange={(e) => handleChange("ngayGiaoHang", e.target.value)}
                />
              </div>
            </div>

            {/* ===== CƯỚC PHÍ PHỤ ===== */}
            <div className="mb-3">
              <label className="font-semibold">Cước phí phụ BĐ</label>

              {/* Dòng 1: Bốc xếp – Hàng về */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                {/* BỐC XẾP */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!formData.bocXepEnabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bocXepEnabled: e.target.checked,
                        bocXep: e.target.checked
                          ? prev.bocXep || ride.bocXep || ""
                          : prev.bocXep, // ẩn nhưng giữ nguyên
                      }))
                    }
                  />
                  <span className="whitespace-nowrap">Bốc xếp</span>

                  {formData.bocXepEnabled && (
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.bocXep || "")}
                      onChange={(e) => handleChange("bocXep", e.target.value)}
                    />
                  )}
                </div>

                {/* HÀNG VỀ */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!formData.hangVeEnabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hangVeEnabled: e.target.checked,
                        hangVe: e.target.checked
                          ? prev.hangVe || ride.hangVe || ""
                          : prev.hangVe,
                      }))
                    }
                  />
                  <span className="whitespace-nowrap">Hàng về</span>

                  {formData.hangVeEnabled && (
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.hangVe || "")}
                      onChange={(e) => handleChange("hangVe", e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Dòng 2: Vé – Lưu ca */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                {/* VÉ */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!formData.veEnabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        veEnabled: e.target.checked,
                        ve: e.target.checked
                          ? prev.ve || ride.ve || ""
                          : prev.ve,
                      }))
                    }
                  />
                  <span className="whitespace-nowrap">Vé</span>

                  {formData.veEnabled && (
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.ve || "")}
                      onChange={(e) => handleChange("ve", e.target.value)}
                    />
                  )}
                </div>

                {/* LƯU CA */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!formData.luuCaEnabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        luuCaEnabled: e.target.checked,
                        luuCa: e.target.checked
                          ? prev.luuCa || ride.luuCa || ""
                          : prev.luuCa,
                      }))
                    }
                  />
                  <span className="whitespace-nowrap">Lưu ca</span>

                  {formData.luuCaEnabled && (
                    <input
                      className="border rounded p-2 w-full"
                      value={formatMoney(formData.luuCa || "")}
                      onChange={(e) => handleChange("luuCa", e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Dòng 3: Chi phí khác full width */}
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!formData.chiPhiKhacEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      chiPhiKhacEnabled: e.target.checked,
                      chiPhiKhac: e.target.checked
                        ? prev.chiPhiKhac || ride.chiPhiKhac || ""
                        : prev.chiPhiKhac,
                    }))
                  }
                />
                <span className="whitespace-nowrap">Chi phí khác</span>

                {formData.chiPhiKhacEnabled && (
                  <input
                    className="border rounded p-2 w-full"
                    value={formatMoney(formData.chiPhiKhac || "")}
                    onChange={(e) => handleChange("chiPhiKhac", e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Điều vận */}
            <div className="mb-3">
              <label className="font-semibold">Ghi chú</label>
              <input
                className="border rounded w-full p-2 mt-1"
                value={formData.ghiChu || ""}
                onChange={(e) => handleChange("dieuVan", e.target.value)}
              />
            </div>

            {/* Ngày nhập – KHÔNG CHO SỬA */}
            <div className="mb-3">
              <label className="font-semibold">Ngày nhập</label>
              <input
                type="date"
                className="border rounded w-full p-2 mt-1 bg-gray-200"
                value={formatDate(formData.ngayBoc)}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Lý do chỉnh sửa */}
        <div className="mt-4">
          <label className="font-semibold">Lý do chỉnh sửa</label>
          <textarea
            rows={3}
            className="w-full border rounded p-2 mt-1"
            value={formData.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder="Nhập lý do..."
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}
