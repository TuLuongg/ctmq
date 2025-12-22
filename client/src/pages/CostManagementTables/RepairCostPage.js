import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function RepairCostPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/repair`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [unitFilterOptions, setUnitFilterOptions] = useState([]);

  const [vehicleFilter, setVehicleFilter] = useState([]); // mảng giá trị đã chọn
  const [unitFilter, setUnitFilter] = useState([]);

  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [unitFilterSearch, setUnitFilterSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  /* ================= FETCH FILTER OPTIONS ================= */
  const fetchFilterOptions = async () => {
    try {
      const [vehiclesRes, unitsRes] = await Promise.all([
        axios.get(`${baseUrl}/unique-vehiclePlates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/unique-repairUnits`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const vehicles = vehiclesRes.data || [];
      const units = unitsRes.data || [];

      setVehicleFilterOptions(vehicles);
      setUnitFilterOptions(units);

      setVehicleFilter(vehicles); // mặc định chọn tất cả
      setUnitFilter(units); // mặc định chọn tất cả
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedData = res.data || [];

      // ⬇️ APPLY VEHICLE FILTER
      if (vehicleFilter && vehicleFilter.length > 0) {
        fetchedData = fetchedData.filter((r) =>
          vehicleFilter.includes(r.vehiclePlate)
        );
      } else {
        // 🔹 mảng trống = không show dòng nào
        fetchedData = [];
      }

      // ⬇️ APPLY UNIT FILTER
      if (unitFilter && unitFilter.length > 0) {
        fetchedData = fetchedData.filter((r) =>
          unitFilter.includes(r.repairUnit)
        );
      } else {
        fetchedData = [];
      }

      setData(fetchedData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setEditing(null);
    setForm({});
    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [vehicleFilter, unitFilter]);

  /* ================= IMPORT ================= */
  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return alert("Chưa chọn file");

    const formData = new FormData();
    formData.append("file", importFile);

    setImporting(true);
    setImportTotal(0);
    setImportDone(0);

    try {
      const res = await axios.post(`${baseUrl}/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setImportTotal(res.data.totalValid || 0);
      setImportDone(res.data.inserted || 0);
      await fetchData();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || // lấy message từ BE
        err.message || // fallback JS error
        "Import thất bại";
      alert(msg);
    } finally {
      setImporting(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => {
        setImportTotal(0);
        setImportDone(0);
      }, 2000);
    }
  };

  /* ================= CRUD ================= */
  const handleEdit = (row) => {
    setEditing(row._id);
    setForm({ ...row });
  };
  const handleCancel = () => {
    setEditing(null);
    setForm({});
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const handleAddNew = () => {
    setEditing("new");
    setForm({});
  };
  const handleSave = async () => {
    try {
      if (editing === "new") {
        await axios.post(baseUrl, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${baseUrl}/${editing}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchData();
      handleCancel();
    } catch (err) {
      console.error(err);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa dòng này?")) return;
    await axios.delete(`${baseUrl}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };
  const handleDeleteAll = async () => {
    if (!window.confirm("Xóa toàn bộ dữ liệu?")) return;
    await axios.delete(baseUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  /* ================= RENDER ================= */
  const renderNewRow = () => {
    if (editing !== "new") return null;

    // Tính tổng tiền tự động
    const quantity = Number(form.quantity || 0);
    const unitPrice = Number(form.unitPrice || 0);
    const totalAmount = quantity * unitPrice;

    return (
      <tr className="bg-green-100">
        {/* STT */}
        <td className="text-center">-</td>

        {/* Đơn vị */}
        <td>
          <input
            name="repairUnit"
            value={form.repairUnit || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Ngày sửa */}
        <td>
          <input
            type="date"
            name="repairDate"
            value={form.repairDate?.slice(0, 10) || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Biển số xe */}
        <td>
          <input
            name="vehiclePlate"
            value={form.vehiclePlate || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Chi tiết sửa */}
        <td>
          <input
            name="repairDetails"
            value={form.repairDetails || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* ĐVT */}
        <td>
          <input
            name="unit"
            value={form.unit || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* SL */}
        <td>
          <input
            name="quantity"
            type="number"
            value={form.quantity || 0}
            onChange={(e) =>
              setForm((p) => ({ ...p, quantity: Number(e.target.value) }))
            }
            className="w-full border px-1 text-right"
          />
        </td>

        {/* Đơn giá */}
        <td>
          <input
            name="unitPrice"
            type="number"
            value={form.unitPrice || 0}
            onChange={(e) =>
              setForm((p) => ({ ...p, unitPrice: Number(e.target.value) }))
            }
            className="w-full border px-1 text-right"
          />
        </td>

        {/* Thành tiền (tự động) */}
        <td className="text-right font-semibold">
          {totalAmount.toLocaleString("vi-VN")}
        </td>

        {/* Khuyến mãi */}
        <td>
          <input
            name="discount"
            value={form.discount || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Số ngày BH */}
        <td>
          <input
            name="warrantyDays"
            type="number"
            value={form.warrantyDays || 0}
            onChange={handleChange}
            className="w-full border px-1 text-right"
          />
        </td>

        {/* Ngày hết BH */}
        <td>
          <input
            type="date"
            name="warrantyEndDate"
            value={form.warrantyEndDate?.slice(0, 10) || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Ghi chú */}
        <td>
          <input
            name="note"
            value={form.note || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Ngày thanh toán */}
        <td>
          <input
            type="date"
            name="paymentDate"
            value={form.paymentDate?.slice(0, 10) || ""}
            onChange={handleChange}
            className="w-full border px-1"
          />
        </td>

        {/* Hành động */}
        <td>
          <button onClick={handleSave} className="text-green-600">
            Lưu
          </button>
          <button onClick={handleCancel} className="ml-2 text-gray-600">
            Huỷ
          </button>
        </td>
      </tr>
    );
  };

  const renderTable = () => {
    const totalMoney = data.reduce(
      (sum, r) => sum + Number(r.totalAmount || 0),
      0
    );

    return (
      <>
        {/* SUMMARY */}
        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{data.length}</b>
          </div>
          <div>
            Tổng tiền:{" "}
            <b className="text-red-600">{totalMoney.toLocaleString("vi-VN")}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="min-w-[1400px] w-full table-auto border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 bg-blue-600 z-20">
              <tr>
                {[
                  "STT",
                  "ĐƠN VỊ SỬA CHỮA",
                  "NGÀY SỬA CHỮA",
                  "BIỂN SỐ XE",
                  "CHI TIẾT SỬA CHỮA",
                  "ĐVT",
                  "SL",
                  "ĐƠN GIÁ",
                  "THÀNH TIỀN",
                  "KHUYẾN MÃI",
                  "SỐ NGÀY BẢO HÀNH",
                  "NGÀY HẾT BẢO HÀNH",
                  "GHI CHÚ",
                  "NGÀY THANH TOÁN",
                  "HÀNH ĐỘNG",
                ].map((h) => (
                  <th
                    key={h}
                    className="border px-2 py-2 font-semibold text-white whitespace-nowrap relative text-center"
                  >
                    {h === "ĐƠN VỊ SỬA CHỮA" || h === "BIỂN SỐ XE" ? (
                      <div className="flex flex-col relative">
                        <span
                          className="cursor-pointer select-none"
                          onClick={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                            });
                            if (h === "ĐƠN VỊ SỬA CHỮA")
                              setShowUnitDropdown((p) => !p);
                            else setShowVehicleDropdown((p) => !p);
                          }}
                        >
                          {h}
                        </span>

                        {(h === "ĐƠN VỊ SỬA CHỮA" && showUnitDropdown) ||
                        (h === "BIỂN SỐ XE" && showVehicleDropdown) ? (
                          <div
                            className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                            style={{
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                            }}
                          >
                            <input
                              type="text"
                              placeholder={
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? "Tìm đơn vị..."
                                  : "Tìm biển số..."
                              }
                              className="w-full border rounded px-1 mb-1"
                              value={
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? unitFilterSearch
                                  : vehicleFilterSearch
                              }
                              onChange={(e) =>
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? setUnitFilterSearch(e.target.value)
                                  : setVehicleFilterSearch(e.target.value)
                              }
                            />
                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  h === "ĐƠN VỊ SỬA CHỮA"
                                    ? unitFilter.length ===
                                      unitFilterOptions.length
                                    : vehicleFilter.length ===
                                      vehicleFilterOptions.length
                                }
                                onChange={(e) => {
                                  if (h === "ĐƠN VỊ SỬA CHỮA") {
                                    setUnitFilter(
                                      e.target.checked
                                        ? [...unitFilterOptions]
                                        : []
                                    );
                                  } else {
                                    setVehicleFilter(
                                      e.target.checked
                                        ? [...vehicleFilterOptions]
                                        : []
                                    );
                                  }
                                }}
                              />
                              <span>Chọn tất cả</span>
                            </label>

                            <div className="max-h-40 overflow-auto">
                              {(h === "ĐƠN VỊ SỬA CHỮA"
                                ? unitFilterOptions
                                : vehicleFilterOptions
                              )
                                .filter((v) =>
                                  v
                                    .toLowerCase()
                                    .includes(
                                      (h === "ĐƠN VỊ SỬA CHỮA"
                                        ? unitFilterSearch
                                        : vehicleFilterSearch
                                      ).toLowerCase()
                                    )
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1 mb-1"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        h === "ĐƠN VỊ SỬA CHỮA"
                                          ? unitFilter.includes(v)
                                          : vehicleFilter.includes(v)
                                      }
                                      onChange={(e) => {
                                        if (h === "ĐƠN VỊ SỬA CHỮA") {
                                          setUnitFilter((p) =>
                                            e.target.checked
                                              ? [...p, v]
                                              : p.filter((x) => x !== v)
                                          );
                                        } else {
                                          setVehicleFilter((p) =>
                                            e.target.checked
                                              ? [...p, v]
                                              : p.filter((x) => x !== v)
                                          );
                                        }
                                      }}
                                    />
                                    <span>{v}</span>
                                  </label>
                                ))}
                            </div>

                            <button
                              onClick={() =>
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? setShowUnitDropdown(false)
                                  : setShowVehicleDropdown(false)
                              }
                              className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                            >
                              Đóng
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {renderNewRow()}
              {data.map((r, idx) => (
                <tr
                  key={r._id}
                  className="even:bg-gray-50 hover:bg-blue-50 text-xs"
                >
                  {editing === r._id ? (
                    <>
                      <td className="border px-2 py-1 text-center">
                        {idx + 1}
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="repairUnit"
                          value={form.repairUnit || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="date"
                          name="repairDate"
                          value={form.repairDate?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="vehiclePlate"
                          value={form.vehiclePlate || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="repairDetails"
                          value={form.repairDetails || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="unit"
                          value={form.unit || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="quantity"
                          type="number"
                          value={form.quantity || ""}
                          onChange={handleChange}
                          className="w-full border px-1 text-right"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="unitPrice"
                          type="number"
                          value={form.unitPrice || ""}
                          onChange={handleChange}
                          className="w-full border px-1 text-right"
                        />
                      </td>
                      <td className="border px-2 py-1 text-right font-semibold">
                        {(
                          Number(form.quantity || 0) *
                          Number(form.unitPrice || 0)
                        ).toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="discount"
                          value={form.discount || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="warrantyDays"
                          type="number"
                          value={form.warrantyDays || ""}
                          onChange={handleChange}
                          className="w-full border px-1 text-right"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="date"
                          name="warrantyEndDate"
                          value={form.warrantyEndDate?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          name="note"
                          value={form.note || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="date"
                          name="paymentDate"
                          value={form.paymentDate?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={handleSave}
                          className="text-green-600 mr-2"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-gray-600"
                        >
                          Huỷ
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-2 py-1 text-center">
                        {idx + 1}
                      </td>
                      <td className="border px-2 py-1">{r.repairUnit}</td>
                      <td className="border px-2 py-1">
                        {new Date(r.repairDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2 py-1">{r.vehiclePlate}</td>
                      <td className="border px-2 py-1">{r.repairDetails}</td>
                      <td className="border px-2 py-1">{r.unit}</td>
                      <td className="border px-2 py-1 text-right">
                        {r.quantity?.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.unitPrice?.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right font-semibold">
                        {r.totalAmount?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 py-1">{r.discount}</td>
                      <td className="border px-2 py-1 text-right">
                        {r.warrantyDays}
                      </td>
                      <td className="border px-2 py-1">
                        {r.warrantyEndDate &&
                          new Date(r.warrantyEndDate).toLocaleDateString(
                            "vi-VN"
                          )}
                      </td>
                      <td className="border px-2 py-1">{r.note}</td>
                      <td className="border px-2 py-1">
                        {r.paymentDate &&
                          new Date(r.paymentDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-blue-600 mr-2"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="text-red-600"
                        >
                          Xóa
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* ================= TOOLBAR ================= */
  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current.click()}
        className="border px-2 py-1"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>
      {importFile && <span className="text-xs">{importFile.name}</span>}
      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1 disabled:opacity-50"
      >
        Import
      </button>
      <button
        onClick={handleAddNew}
        className="bg-green-600 text-white px-2 py-1"
      >
        + Thêm
      </button>
      <button
        onClick={handleDeleteAll}
        className="bg-red-500 text-white px-2 py-1"
      >
        Xóa tất cả
      </button>
      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}
      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}
    </div>
  );

  return (
    <div className="p-4">
      <Toolbar />
      {loading && <p>Đang tải...</p>}
      {renderTable()}
    </div>
  );
}
