import { useState, useEffect } from "react";

export default function RideModal({
  initialData,
  onClose,
  onSave,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
  vehicles = [],
}) {
  const [form, setForm] = useState(initialData || {});
  console.log(initialData)

  useEffect(() => {
    if (!currentUser || !dieuVanList.length) return;
    let selected = dieuVanList.find((d) => d._id === currentUser._id);
    if (!selected)
      selected = dieuVanList.find((d) => d.username === currentUser.username);

    if (selected) {
      setForm((prev) => ({
        ...prev,
        dieuVanID: prev.dieuVanID || selected._id,
        dieuVan: prev.dieuVan || selected.fullname || selected.username,
        createdByID: prev.createdByID || selected._id,
        createdBy: prev.createdBy || selected.fullname || selected.username,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        dieuVanID: prev.dieuVanID || currentUser._id || "",
        dieuVan: prev.dieuVan || currentUser.fullname || currentUser.username,
        createdByID: prev.createdByID || currentUser._id || "",
        createdBy: prev.createdBy || currentUser.fullname || currentUser.username,
      }));
    }
  }, [currentUser, dieuVanList]);

const handleChange = (e) => {
  const { name, value } = e.target;

  // Khi thay đổi khách hàng → tự động lấy accountant tương ứng
  if (name === "khachHang") {
    const matchedCustomer = customers.find(
      (c) =>
        (c.name || c.tenKhachHang)?.trim()?.toLowerCase() === value.trim().toLowerCase()
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

  // Trường hợp bình thường
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

  const handleCreatedByChange = (e) => {
    const selectedId = e.target.value;
    const selected = dieuVanList.find((d) => d._id === selectedId);
    setForm((prev) => ({
      ...prev,
      createdByID: selected?._id || "",
      createdBy: selected?.fullname || selected?.username || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

     // Kiểm tra khách hàng có tồn tại trong danh sách không
  const matchedCustomer = customers.find(
    (c) => (c.tenKhachHang || c.name) === form.khachHang
  );
  if (!matchedCustomer) {
    alert("Vui lòng chọn khách hàng từ danh sách có sẵn!");
    return;
  }
    const payload = {
      ...form,
      dieuVanID: form.dieuVanID || currentUser._id,
      dieuVan: form.dieuVan || currentUser.fullname || currentUser.username,
      createdByID: form.createdByID || currentUser._id,
      createdBy: form.createdBy || currentUser.fullname || currentUser.username,
    };
    onSave(payload);
    setForm({});
  };

  const handleClose = () => {
    setForm({});
    onClose();
  };

  const fields = [
    { name: "tenLaiXe", label: "Tên lái xe", type: "text", list: "driverList" },
    { name: "bienSoXe", label: "Biển số xe", type: "text", list: "vehicleList" },
    { name: "khachHang", label: "Khách hàng", type: "text", list: "customerList" },
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "ngayBocHang", label: "Ngày bốc hàng", type: "date" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "date" },
    { name: "diemXepHang", label: "Điểm xếp hàng", type: "text" },
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
    { name: "ngayBoc", label: "Ngày nhập", type: "date" },
    { name: "ghiChu", label: "Ghi chú", type: "textarea" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          {form._id ? "Sửa chuyến" : "Thêm chuyến mới"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {/* Điều vận phụ trách */}
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

          {/* Người nhập chuyến */}
          <div>
            <label className="block text-sm font-medium mb-1">Người nhập chuyến</label>
            <select
              name="createdByID"
              value={form.createdByID || ""}
              onChange={handleCreatedByChange}
              className="border p-2 w-full rounded"
            >
              <option value="">-- Chọn người nhập --</option>
              {dieuVanList.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullname || d.username}
                </option>
              ))}
            </select>
          </div>

          {/* Các trường còn lại */}
          {fields.map((f) => (
            <div key={f.name} className={f.type === "textarea" ? "col-span-2" : ""}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  value={form[f.name] || ""}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                  rows={3}
                />
              ) : (
                <>
                  <input
                    type={f.type}
                    name={f.name}
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    list={f.list || undefined}
                    className="border p-2 w-full rounded"
                  />
                  {/* Các datalist cho gợi ý */}
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
                    <datalist id="vehicleList">
                      {vehicles.map((v) => (
                        <option key={v._id} value={v.bienSoXe || v.plateNumber} />
                      ))}
                    </datalist>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Nút hành động */}
          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
