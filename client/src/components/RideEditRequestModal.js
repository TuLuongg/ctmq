import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

export default function RideEditModal({
  ride,
  onClose,
  onSubmitEdit,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
}) {
  const [form, setForm] = useState(ride || {});
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (ride) setForm(ride);
  }, [ride]);

  // ==============================
  // SAFE DATE (KHÔNG BAO GIỜ INVALID)
  // ==============================
  const safeDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const toISO = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Auto gán điều vận
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "khachHang") {
      const matchedCustomer = customers.find(
        (c) =>
          (c.name || c.tenKhachHang)?.trim()?.toLowerCase() ===
          value.trim().toLowerCase()
      );
      if (matchedCustomer) {
        setForm((prev) => ({
          ...prev,
          khachHang: value,
          keToanPhuTrach: matchedCustomer.accountant || "",
          accountUsername: matchedCustomer.accUsername || "",
        }));
        return;
      }
    }

    if (name === "bienSoXe") {
      const matched = drivers.find(
        (d) => d.bsx?.toLowerCase() === value.toLowerCase()
      );
      setForm((prev) => ({
        ...prev,
        bienSoXe: value,
        tenLaiXe: matched ? matched.name || matched.tenLaiXe : "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDieuVanChange = (e) => {
    const selected = dieuVanList.find((d) => d._id === e.target.value);
    setForm((prev) => ({
      ...prev,
      dieuVanID: selected?._id || "",
      dieuVan: selected?.fullname || selected?.username || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert("Vui lòng nhập lý do chỉnh sửa!");
      return;
    }

    const payload = {
      rideID: form._id,
      newData: form,
      editorID: currentUser._id,
      editorName: currentUser.fullname || currentUser.username,
      reason: reason.trim(),
    };

    onSubmitEdit(payload);
    setForm({});
    setReason("");
  };

  const handleClose = () => {
    setForm({});
    setReason("");
    onClose();
  };

  // List fields
  const fields = [
    { name: "tenLaiXe", label: "Tên lái xe", type: "text", list: "driverList" },
    { name: "bienSoXe", label: "Biển số xe", type: "text", list: "bsxList" },
    { name: "khachHang", label: "Khách hàng", type: "text", list: "customerList" },
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "ngayBocHang", label: "Ngày bốc hàng", type: "date" },
    { name: "diemXepHang", label: "Điểm xếp hàng", type: "text" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "date" },
    { name: "diemDoHang", label: "Điểm dỡ hàng", type: "text" },
    { name: "soDiem", label: "Số điểm", type: "number" },
    { name: "trongLuong", label: "Trọng lượng", type: "text" },
    { name: "cuocPhi", label: "Cước phí", type: "text" },
    { name: "laiXeThuCuoc", label: "Lái xe thu cước", type: "text" },
    { name: "bocXep", label: "Bốc xếp", type: "text" },
    { name: "ve", label: "Vé", type: "text" },
    { name: "hangVe", label: "Hàng về", type: "text" },
    { name: "luuCa", label: "Lưu ca", type: "text" },
    { name: "luatChiPhiKhac", label: "Luật CP khác", type: "text" },
    { name: "ghiChu", label: "Ghi chú", type: "textarea" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa chuyến</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {/* Điều vận */}
          <div>
            <label className="block text-sm font-medium mb-1">Điều vận phụ trách</label>
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

          {/* Render fields */}
          {fields.map((f) => (
            <div
              key={f.name}
              className={f.type === "textarea" ? "col-span-2" : ""}
            >
              <label className="block text-sm font-medium mb-1">{f.label}</label>

              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  value={form[f.name] || ""}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                  rows={3}
                />
              ) : f.type === "date" ? (
                <DatePicker
                  locale="vi"
                  selected={safeDate(form[f.name])}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      [f.name]: toISO(date),
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 w-full rounded"
                  popperPlacement="right-start"
                  placeholderText="dd/mm/yyyy"
                />
              ) : (
                <>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    list={f.list}
                    className="border p-2 w-full rounded"
                  />

                  {f.name === "tenLaiXe" && (
                    <datalist id="driverList">
                      {drivers.map((d) => (
                        <option key={d._id} value={d.name || d.tenLaiXe} />
                      ))}
                    </datalist>
                  )}

                  {f.name === "khachHang" && (
                    <datalist id="customerList">
                      {customers.map((c) => (
                        <option key={c._id} value={c.tenKhachHang || c.name} />
                      ))}
                    </datalist>
                  )}

                  {f.name === "bienSoXe" && (
                    <datalist id="bsxList">
                      {drivers
                        .filter((d) => d.bsx)
                        .map((d) => (
                          <option key={d._id} value={d.bsx} />
                        ))}
                    </datalist>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Reason */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Lý do chỉnh sửa</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border p-2 w-full rounded"
              rows={3}
              required
            />
          </div>

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
              Lưu chỉnh sửa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
