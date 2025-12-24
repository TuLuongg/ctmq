import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
registerLocale("vi", vi);

export default function RideModal({
  initialData,
  onClose,
  onSave,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (moneyFields.includes(name)) {
      const raw = value.replace(/\./g, "");
      setForm((prev) => ({ ...prev, [name]: raw }));
      return;
    }

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

    if (name === "bienSoXe") {
      const matchedDriver = drivers.find(
        (d) => d.bsx && d.bsx.toLowerCase() === value.toLowerCase()
      );
      if (matchedDriver) {
        setForm((prev) => ({
          ...prev,
          bienSoXe: value,
          tenLaiXe: matchedDriver.name || matchedDriver.tenLaiXe || "",
        }));
      } else {
        setForm((prev) => ({ ...prev, bienSoXe: value, tenLaiXe: "" }));
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDieuVanChange = (e) => {
    const selectedId = e.target.value;
    const selected = dieuVanList.find((d) => d._id === selectedId);
    setForm((prev) => ({
      ...prev,
      dieuVanID: selected?._id || "",
      dieuVan: selected?.fullname || selected?.username || "",
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

    onSave(payload);
    setForm({});
  };

  const handleClose = () => {
    setForm({});
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
          <div>
            <label className="block text-sm font-medium mb-1">
              Điều vận phụ trách
            </label>
            <select
              name="dieuVanID"
              value={form.dieuVanID || ""}
              onChange={handleDieuVanChange}
              className="border p-2 w-full rounded"
            >
              <option value="">-- Chọn điều vận --</option>
              {dieuVanList.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullname || d.username}
                </option>
              ))}
            </select>
          </div>

          {fields.map((f) => (
            <div key={f.name} className="relative">
              <label className="block text-sm font-medium mb-1">
                {f.label}
              </label>

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
                  popperPlacement="right-start"
                />
              ) : (
                <input
                  type={f.type}
                  name={f.name}
                  value={
                    moneyFields.includes(f.name)
                      ? formatMoney(form[f.name])
                      : form[f.name] || ""
                  }
                  onChange={handleChange}
                  list={f.list}
                  className={`border p-2 w-full rounded ${f.className || ""}`}
                  {...(f.name === "khachHang"
                    ? {
                        onFocus: () => setIsCustomerFocused(true),
                        onBlur: () =>
                          setTimeout(() => setIsCustomerFocused(false), 150),
                      }
                    : {})}
                />
              )}

              {f.name === "bienSoXe" && (
                <datalist id="vehicleList">
                  {drivers
                    .filter((d) => d.bsx)
                    .map((d) => (
                      <option key={d._id} value={d.bsx} />
                    ))}
                </datalist>
              )}

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
