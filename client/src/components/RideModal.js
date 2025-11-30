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

  // các trường tiền để format và xử lý
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

  // Khi mở modal: nếu có currentUser thì set createdBy (mặc định, không show)
  // và nếu currentUser là 1 điều vận trong danh sách thì cũng set dieuVan mặc định (giữ khả năng chọn)
  useEffect(() => {
    if (!currentUser) return;

    // set createdBy fields mặc định (UI sẽ không hiển thị select)
    setForm((prev) => ({
      ...prev,
      createdByID: prev.createdByID || currentUser._id,
      createdBy: prev.createdBy || currentUser.fullname || currentUser.username,
    }));

    // nếu currentUser khớp 1 điều vận trong list -> set dieuVanID nếu chưa có
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

  // thay đổi input chung
  const handleChange = (e) => {
    const { name, value } = e.target;

    // xử lý tiền: lưu dạng thô (không có dấu .)
    if (moneyFields.includes(name)) {
      const raw = value.replace(/\./g, "");
      if (raw !== "" && isNaN(raw)) return;
      setForm((prev) => ({ ...prev, [name]: raw }));
      return;
    }

    // khách hàng -> auto lấy kế toán
    if (name === "khachHang") {
      const matched = customers.find(
        (c) =>
          (c.tenKhachHang || c.name)?.trim()?.toLowerCase() ===
          value.trim().toLowerCase()
      );
      if (matched) {
        setForm((prev) => ({
          ...prev,
          khachHang: value,
          keToanPhuTrach: matched.accountant || "",
          accountUsername: matched.accUsername || "",
        }));
        return;
      }
    }

    // biển số -> tự fill tên lái xe từ drivers.bsx
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

    // default
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // chọn điều vận (select)
  const handleDieuVanChange = (e) => {
    const selectedId = e.target.value;
    const selected = dieuVanList.find((d) => d._id === selectedId);
    setForm((prev) => ({
      ...prev,
      dieuVanID: selected?._id || "",
      dieuVan: selected?.fullname || selected?.username || "",
    }));
  };

  // toggle checkbox cho từng loại chi phí
  const toggleFee = (key) => {
    setCheckedFees((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // nếu bỏ tick -> xóa giá trị trong form
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

  // 🔥 fix lệch ngày VN
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

    // 🔥 dùng ngày VN, KHÔNG xài ISO nữa
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

  // giữ nguyên các input khác, loại bỏ tenLaiXe, ghiChu, ngayBoc khỏi fields
  const fields = [
    { name: "bienSoXe", label: "Biển số xe", type: "text", list: "vehicleList" },
    { name: "khachHang", label: "Khách hàng", type: "text", list: "customerList" },
    { name: "ngayBocHang", label: "Ngày bốc hàng", type: "text"},
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "text"},
    { name: "diemXepHang", label: "Điểm xếp hàng", type: "text" },
    { name: "diemDoHang", label: "Điểm dỡ hàng", type: "text" },
    { name: "soDiem", label: "Số điểm", type: "number" },
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
          {/* Điều vận: VẪN LÀ SELECT (có thể chọn) */}
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

          {/* Người nhập: BỎ UI - vẫn lưu createdBy mặc định trong payload */}
          {/* Nếu bạn muốn hiển thị người nhập nhưng không cho sửa, có thể hiện readonly. Hiện tôi không render lên UI */}

          {/* Các input giữ nguyên (loại trừ những field bị loại) */}
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>

              {/* DatePicker cho ngày */}
{(f.name === "ngayBocHang" || f.name === "ngayGiaoHang") ? (
<DatePicker
  locale="vi"
  selected={form[f.name] ? parseISODate(form[f.name]) : null}
  onChange={(date) =>
    setForm((prev) => ({
      ...prev,
      [f.name]: date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(date.getDate()).padStart(2, "0")}`
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
  />
)}


              {/* datalist biển số từ drivers.bsx */}
              {f.name === "bienSoXe" && (
                <datalist id="vehicleList">
                  {drivers
                    .filter((d) => d.bsx)
                    .map((d) => (
                      <option key={d._id} value={d.bsx} />
                    ))}
                </datalist>
              )}

              {/* datalist khách hàng */}
              {f.name === "khachHang" && (
                <datalist id="customerList">
                  {customers.map((c) => (
                    <option key={c._id} value={c.tenKhachHang || c.name} />
                  ))}
                </datalist>
              )}
            </div>
          ))}
{/* ============================
    Cước phí + Chi phí phụ cùng 1 hàng
============================ */}
<div className="col-span-2 flex items-start gap-10">

  {/* === Cước phí === */}
  <div className="w-60">
    <label className="block text-sm font-medium mb-1">Cước phí</label>
    <input
      type="text"
      name="cuocPhi"
      value={formatMoney(form.cuocPhi)}
      onChange={handleChange}
      className="border p-2 w-full rounded"
    />
  </div>

  {/* === Chi phí phụ === */}
  <div className="flex flex-col">
    <label className="block text-sm font-medium mb-1">Chi phí phụ</label>

    <div className="flex flex-wrap items-center gap-6">
      {[
        ["bocXep", "Bốc xếp"],
        ["hangVe", "Hàng về"],
        ["ve", "Vé"],
        ["luuCa", "Lưu ca"],
        ["luatChiPhiKhac", "Chi phí khác"],
      ].map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checkedFees[key]}
            onChange={() => toggleFee(key)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  </div>
</div>
{/* ============ Tất cả input chi phí phụ hiển thị 1 hàng ngang ============ */}
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
