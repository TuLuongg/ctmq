import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

export default function RideEditRequestModal({
  ride,
  onClose,
  onSubmitEdit,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
  vehicles = [],
}) {
  const [form, setForm] = useState(ride || {});
  const [reason, setReason] = useState("");
  const [checkedFees, setCheckedFees] = useState({
    bocXep: false,
    hangVe: false,
    ve: false,
    luuCa: false,
    luatChiPhiKhac: false,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [changes, setChanges] = useState([]);

  const moneyFields = [
    "cuocPhi",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
  ];

  useEffect(() => {
    if (ride) {
      setForm(ride);
      setCheckedFees({
        bocXep: !!ride.bocXep,
        hangVe: !!ride.hangVe,
        ve: !!ride.ve,
        luuCa: !!ride.luuCa,
        luatChiPhiKhac: !!ride.luatChiPhiKhac,
      });
    }
  }, [ride]);

  const formatMoney = (value) =>
    value || value === 0
      ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      : "";

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

  const safeParseDate = (value) => {
    if (!value) return null;

    // Đã là Date
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    // ISO string hoặc string Date hợp lệ
    if (typeof value === "string") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // fallback yyyy-mm-dd
      const parts = value.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const d2 = new Date(y, m - 1, d);
        return isNaN(d2.getTime()) ? null : d2;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!currentUser || !dieuVanList.length) return;
    const selected =
      dieuVanList.find((d) => d._id === currentUser._id) ||
      dieuVanList.find((d) => d.username === currentUser.username);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        dieuVanID: prev.dieuVanID || selected._id,
        dieuVan: prev.dieuVan || selected.fullname || selected.username,
        createdByID: prev.createdByID || selected._id,
        createdBy: prev.createdBy || selected.fullname || selected.username,
      }));
    }
  }, [currentUser, dieuVanList]);

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);

  const [driverSuggestions, setDriverSuggestions] = useState([]);
  const [isDriverFocused, setIsDriverFocused] = useState(false);

  const [vehicleSuggestions, setVehicleSuggestions] = useState([]);
  const [isVehicleFocused, setIsVehicleFocused] = useState(false);

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

    // ===== DEFAULT – CÁC FIELD CÒN LẠI =====
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleFee = (key) => {
    setCheckedFees((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) setForm((p) => ({ ...p, [key]: "" }));
      return next;
    });
  };

  const fieldLabels = {
    dieuVanID: "Điều vận phụ trách",
    bienSoXe: "Biển số xe",
    khachHang: "Khách hàng",
    dienGiai: "Diễn giải",
    diemXepHang: "Điểm đóng hàng",
    ngayBocHang: "Ngày đóng hàng",
    diemDoHang: "Điểm giao hàng",
    ngayGiaoHang: "Ngày giao hàng",
    soDiem: "Số điểm",
    trongLuong: "Trọng lượng",
    cuocPhi: "Cước phí",
    bocXep: "Bốc xếp",
    hangVe: "Hàng về",
    ve: "Vé",
    luuCa: "Lưu ca",
    luatChiPhiKhac: "Chi phí khác",
    tenLaiXe: "Tên lái xe",
    keToanPhuTrach: "Kế toán phụ trách",
    accountUsername: "Tên tài khoản",
    dieuVan: "Điều vận",
    khachHang: "Khách hàng",
    // loại bỏ createdByID
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do chỉnh sửa!");
      return;
    }

    const changed = [];
    for (const key in form) {
      if (key === "createdByID") continue; // bỏ createdByID
      if (form[key] !== ride[key]) {
        changed.push({
          field: key,
          label: fieldLabels[key] || key,
          oldValue: ride[key],
          newValue: form[key],
        });
      }
    }
    if (changed.length === 0) {
      alert("Không có thay đổi nào!");
      return;
    }

    setChanges(changed);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const payload = {
      rideID: form._id,
      newData: form,
      editorID: currentUser._id,
      editorName: currentUser.fullname || currentUser.username,
      reason: reason.trim(),
    };
    onSubmitEdit(payload);
    setShowConfirm(false);
    setForm({});
    setReason("");
  };

  const handleCancelConfirm = () => setShowConfirm(false);
  const handleClose = () => {
    setForm({});
    setReason("");
    onClose();
  };

  const fields = [
    { name: "bienSoXe", label: "Biển số xe", type: "text", list: "bsxList" },
    {
      name: "khachHang",
      label: "Khách hàng",
      type: "text",
      list: "customerList",
    },
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "diemXepHang", label: "Điểm đóng hàng", type: "text" },
    { name: "ngayBocHang", label: "Ngày đóng hàng", type: "date" },
    { name: "diemDoHang", label: "Điểm giao hàng", type: "text" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "date" },
    { name: "soDiem", label: "Số điểm", type: "text" },
    { name: "trongLuong", label: "Trọng lượng", type: "text" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa chuyến</h2>

        {!showConfirm ? (
          <form className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                Tên lái xe
              </label>
              <input
                type="text"
                name="tenLaiXe"
                value={form.tenLaiXe || ""}
                onChange={handleChange}
                onFocus={() => setIsDriverFocused(true)}
                onBlur={() => setTimeout(() => setIsDriverFocused(false), 150)}
                className="border p-2 w-full rounded"
                placeholder="Nhập tên lái xe"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              {isDriverFocused && driverSuggestions.length > 0 && (
                <ul className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto mt-1 rounded shadow">
                  {driverSuggestions.map((d) => (
                    <li
                      key={d._id}
                      className="p-2 cursor-pointer hover:bg-gray-200"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm((prev) => ({
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

            {fields.map((f) => (
              <div key={f.name} className="relative">
                <label className="block text-sm font-medium mb-1">
                  {f.label}
                </label>

                {/* ===== DATE ===== */}
                {f.name === "ngayBocHang" || f.name === "ngayGiaoHang" ? (
                  <DatePicker
                    locale="vi"
                    selected={safeParseDate(form[f.name])}
                    onChange={(date) => {
                      setForm((prev) => ({
                        ...prev,
                        [f.name]: date
                          ? `${date.getFullYear()}-${String(
                              date.getMonth() + 1
                            ).padStart(2, "0")}-${String(
                              date.getDate()
                            ).padStart(2, "0")}`
                          : "",
                      }));
                    }}
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
                      onFocus={() => setIsVehicleFocused(true)}
                      onBlur={() =>
                        setTimeout(() => setIsVehicleFocused(false), 150)
                      }
                      className="border p-2 w-full rounded"
                      placeholder="Nhập biển số xe"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />

                    {isVehicleFocused && vehicleSuggestions.length > 0 && (
                      <ul className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto mt-1 rounded shadow">
                        {vehicleSuggestions.map((v) => (
                          <li
                            key={v._id}
                            className="p-2 cursor-pointer hover:bg-gray-200"
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
                      {customerSuggestions.map((c) => (
                        <li
                          key={c._id}
                          className="p-2 cursor-pointer hover:bg-gray-200"
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

            {/* Cước phí + chi phí phụ */}
            <div className="col-span-2 flex items-start gap-10">
              <div className="w-60">
                <label className="block text-sm font-medium mb-1">
                  Cước phí{" "}
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

            {/* Inputs chi phí phụ */}
            <div className="col-span-2 flex items-center gap-4 mt-3">
              {checkedFees.bocXep && (
                <div className="flex flex-col w-32">
                  <label className="text-xs mb-1">Bốc xếp</label>
                  <input
                    type="text"
                    name="bocXep"
                    value={formatMoney(form.bocXep)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
              {checkedFees.hangVe && (
                <div className="flex flex-col w-32">
                  <label className="text-xs mb-1">Hàng về</label>
                  <input
                    type="text"
                    name="hangVe"
                    value={formatMoney(form.hangVe)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
              {checkedFees.ve && (
                <div className="flex flex-col w-32">
                  <label className="text-xs mb-1">Vé</label>
                  <input
                    type="text"
                    name="ve"
                    value={formatMoney(form.ve)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
              {checkedFees.luuCa && (
                <div className="flex flex-col w-32">
                  <label className="text-xs mb-1">Lưu ca</label>
                  <input
                    type="text"
                    name="luuCa"
                    value={formatMoney(form.luuCa)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
              {checkedFees.luatChiPhiKhac && (
                <div className="flex flex-col w-40">
                  <label className="text-xs mb-1">Chi phí khác</label>
                  <input
                    type="text"
                    name="luatChiPhiKhac"
                    value={formatMoney(form.luatChiPhiKhac)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
              {checkedFees.laiXeThuCuoc && (
                <div className="flex flex-col w-40">
                  <label className="text-xs mb-1">Lái xe thu cước</label>
                  <input
                    type="text"
                    name="laiXeThuCuoc"
                    value={formatMoney(form.laiXeThuCuoc)}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Lý do chỉnh sửa */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Lý do chỉnh sửa
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border p-2 w-full rounded"
                rows={3}
                required
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
                type="button"
                onClick={handleSaveClick}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Lưu chỉnh sửa
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h3 className="text-lg font-bold mb-2">Xác nhận thay đổi</h3>
            <div className="mb-4 max-h-64 overflow-y-auto">
              {changes.map((c) => (
                <div key={c.field} className="mb-1">
                  <b>{c.label}:</b>{" "}
                  <span className="line-through text-red-500">
                    {c.oldValue || "—"}
                  </span>{" "}
                  → <span className="text-green-700">{c.newValue || "—"}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancelConfirm}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
