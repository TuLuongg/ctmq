import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function FuelCostPage() {
  const [source, setSource] = useState("vinh-khuc");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");

  const baseUrl =
    source === "vinh-khuc" ? `${API}/fuel-vinh-khuc` : `${API}/fuel-ngoc-long`;

  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]); // danh sách số xe duy nhất

  const fetchVehicleFilterOptions = async () => {
    try {
      const url =
        source === "vinh-khuc"
          ? `${API}/fuel-vinh-khuc/fuel-vehicle`
          : `${API}/fuel-ngoc-long/fuel-vehicle`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const options = res.data || [];
      setVehicleFilterOptions(options);

      // 🔹 Mặc định chọn tất cả
      setVehicleFilter(options);
    } catch (err) {
      console.error(err);
    }
  };

  // Gọi khi đổi source hoặc load lần đầu
  useEffect(() => {
    fetchVehicleFilterOptions();
  }, [source]);

  /* ================= STATE FILTER ================= */
  const [monthFilter, setMonthFilter] = useState(""); // format YYYY-MM
  const [vehicleFilter, setVehicleFilter] = useState([]); // mảng số xe đang lọc
  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [showVehicleFilterDropdown, setShowVehicleFilterDropdown] =
    useState(false);

  /* ================= FETCH + FILTER ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedData = res.data || [];

      // ⬇️ APPLY MONTH FILTER
      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          if (!r.dateFull) return false;
          const rMonth = new Date(r.dateFull).toISOString().slice(0, 7); // "YYYY-MM"
          return rMonth === monthFilter;
        });
      }

      // ⬇️ APPLY VEHICLE FILTER (mảng)
      if (vehicleFilter && vehicleFilter.length > 0) {
        fetchedData = fetchedData.filter((r) => {
          if (source === "vinh-khuc")
            return vehicleFilter.includes(r.vehicleNo);
          if (source === "ngoc-long")
            return vehicleFilter.includes(r.vehiclePlate);
          return true;
        });
      } else {
        // 🔹 nếu mảng trống => không show dòng nào
        fetchedData = [];
      }

      setData(fetchedData);
    } finally {
      setLoading(false);
    }
  };

  /* ================= USE EFFECT ================= */
  useEffect(() => {
    fetchData();
    setEditing(null);
    setForm({});

    // ⬇️ RESET IMPORT KHI ĐỔI BẢNG
    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [source, monthFilter, vehicleFilter]); // 🔹 thêm filter vào dependency

  /* ================= IMPORT ================= */
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Chưa chọn file");
      return;
    }

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
      setImportDone(res.data.processed || 0);

      await fetchData(); // ⬅️ đảm bảo data mới
    } catch (err) {
      console.error(err);
    } finally {
      // ⬇️ RESET TOÀN BỘ IMPORT STATE
      setImporting(false);
      setImportFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ⬅️ QUAN TRỌNG
      }

      // ⬇️ TỰ XOÁ THÔNG BÁO SAU 2 GIÂY (UX xịn)
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
    if (editing === "new") {
      // 👉 THÊM MỚI
      await axios.post(baseUrl, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      // 👉 SỬA
      await axios.put(`${baseUrl}/${editing}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    fetchData();
    handleCancel();
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

  const renderNewRowVinhKhuc = () => {
    if (editing !== "new") return null;

    return (
      <tr className="bg-green-100">
        <td>
          <input
            type="date"
            name="dateFull"
            value={form.dateFull?.slice(0, 10) || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input name="day" value={form.day || ""} onChange={handleChange} />
        </td>
        <td>
          <input
            name="vehicleNo"
            value={form.vehicleNo || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="vehicleCode"
            value={form.vehicleCode || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="amount"
            value={form.amount || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="liter"
            value={form.liter || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="outsideLiter"
            value={form.outsideLiter || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="outsideAmount"
            value={form.outsideAmount || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="totalAmount"
            value={form.totalAmount || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="fuelPriceChanged"
            value={form.fuelPriceChanged || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input name="note" value={form.note || ""} onChange={handleChange} />
        </td>
        <td>
          <button onClick={handleSave} className="text-green-700 font-semibold">
            Lưu
          </button>
          <button onClick={handleCancel} className="ml-2 text-gray-600">
            Huỷ
          </button>
        </td>
      </tr>
    );
  };
  const renderNewRowNgocLong = () => {
    if (editing !== "new") return null;

    return (
      <tr className="bg-green-100">
        <td>
          <input
            type="date"
            name="dateFull"
            value={form.dateFull?.slice(0, 10) || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input name="day" value={form.day || ""} onChange={handleChange} />
        </td>
        <td>
          <input
            name="vehiclePlate"
            value={form.vehiclePlate || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="vehicleCode"
            value={form.vehicleCode || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="amount"
            value={form.amount || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="liter"
            value={form.liter || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input name="note" value={form.note || ""} onChange={handleChange} />
        </td>
        <td>
          <input
            name="cumulativeMechanical1"
            value={form.cumulativeMechanical1 || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="cumulativeMechanical2"
            value={form.cumulativeMechanical2 || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="cumulativeElectronic1"
            value={form.cumulativeElectronic1 || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="cumulativeElectronic2"
            value={form.cumulativeElectronic2 || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="internalFuelPrice"
            value={form.internalFuelPrice || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <input
            name="fuelRemaining"
            value={form.fuelRemaining || ""}
            onChange={handleChange}
          />
        </td>
        <td>
          <button onClick={handleSave} className="text-green-700 font-semibold">
            Lưu
          </button>
          <button onClick={handleCancel} className="ml-2 text-gray-600">
            Huỷ
          </button>
        </td>
      </tr>
    );
  };

  /* ================= TABLE VINH KHÚC ================= */
  const renderVinhKhuc = () => {
    const totalRows = data.length;
    const totalMoney = data.reduce(
      (sum, r) => sum + Number(r.totalAmount || 0),
      0
    );

    return (
      <>
        {/* SUMMARY */}
        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{totalRows}</b>
          </div>
          <div>
            Tổng tiền:{" "}
            <b className="text-red-600">{totalMoney.toLocaleString("vi-VN")}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-blue-600">
              <tr>
                {[
                  "Ngày Tháng Năm",
                  "Ngày",
                  "Số Xe",
                  "Mã xe",
                  "Số tiền",
                  "Số lít",
                  "Tiền đổ dầu ngoài",
                  "Số lít đổ ngoài",
                  "Tổng cộng",
                  "Giá dầu",
                  "Ghi chú",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    className="border bg-blue-600 px-2 py-2 font-semibold text-white whitespace-nowrap relative"
                  >
                    {h === "Số Xe" ? (
                      <div className="flex flex-col relative">
                        <span
                          className="cursor-pointer"
                          onClick={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left,
                            });
                            setShowVehicleFilterDropdown(
                              !showVehicleFilterDropdown
                            );
                          }}
                        >
                          {h}
                        </span>

                        {showVehicleFilterDropdown && (
                          <div
                            className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                            style={{
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                            }}
                          >
                            {/* Input search */}
                            <input
                              type="text"
                              placeholder="Tìm số xe..."
                              className="w-full border rounded px-1 mb-1"
                              value={vehicleFilterSearch}
                              onChange={(e) =>
                                setVehicleFilterSearch(e.target.value)
                              }
                            />

                            {/* Checkbox chọn tất cả */}
                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  vehicleFilterOptions.length > 0 &&
                                  vehicleFilter.length ===
                                    vehicleFilterOptions.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setVehicleFilter([...vehicleFilterOptions]);
                                  else setVehicleFilter([]);
                                }}
                              />
                              <span>Chọn tất cả</span>
                            </label>

                            {/* Checkbox từng số xe */}
                            <div className="max-h-40 overflow-auto">
                              {vehicleFilterOptions
                                .filter((v) =>
                                  v
                                    .toLowerCase()
                                    .includes(vehicleFilterSearch.toLowerCase())
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={vehicleFilter.includes(v)}
                                      onChange={(e) => {
                                        if (e.target.checked)
                                          setVehicleFilter([
                                            ...vehicleFilter,
                                            v,
                                          ]);
                                        else
                                          setVehicleFilter(
                                            vehicleFilter.filter((x) => x !== v)
                                          );
                                      }}
                                    />
                                    <span>{v}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {renderNewRowVinhKhuc()}
              {data.map((r) => (
                <tr
                  key={r._id}
                  className={`even:bg-gray-50 hover:bg-blue-50 ${
                    editing === r._id ? "bg-yellow-100" : ""
                  }`}
                >
                  {editing === r._id ? (
                    <>
                      <td className="border px-1">
                        <input
                          type="date"
                          name="dateFull"
                          value={form.dateFull?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="day"
                          value={form.day || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="vehicleNo"
                          value={form.vehicleNo || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="vehicleCode"
                          value={form.vehicleCode || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="amount"
                          value={form.amount || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="liter"
                          value={form.liter || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="outsideAmount"
                          value={form.outsideAmount || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="outsideLiter"
                          value={form.outsideLiter || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="totalAmount"
                          value={form.totalAmount || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="fuelPriceChanged"
                          value={form.fuelPriceChanged || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="note"
                          value={form.note || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            className="text-green-600"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600"
                          >
                            Huỷ
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-2">
                        {r.dateFull &&
                          new Date(r.dateFull).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2">{r.day}</td>
                      <td className="border px-2">{r.vehicleNo}</td>
                      <td className="border px-2">{r.vehicleCode}</td>
                      <td className="border px-2 text-right">
                        {r.amount?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.liter?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.outsideLiter?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.outsideAmount?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right font-semibold">
                        {r.totalAmount?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.fuelPriceChanged?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2">{r.note}</td>
                      <td className="border px-2">
                        <div className="flex justify-center">
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
                        </div>
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

  /* ================= TABLE NGỌC LONG ================= */
  const renderNgocLong = () => {
    const totalRows = data.length;
    const totalMoney = data.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
      <>
        {/* SUMMARY */}
        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{totalRows}</b>
          </div>
          <div>
            Tổng tiền:{" "}
            <b className="text-red-600">{totalMoney.toLocaleString("vi-VN")}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-blue-600">
              <tr>
                {[
                  "Ngày Tháng năm",
                  "Ngày",
                  "Biển số xe",
                  "Mã xe",
                  "Số tiền",
                  "Số lít",
                  "Ghi chú",
                  "cộng dồn lít số cơ máy 1",
                  "cộng dồn lít số cơ máy 2",
                  "cộng dồn lít số điện tử máy 1",
                  "cộng dồn lít số điện tử máy 2",
                  "Giá dầu Nội bộ đã gồm VAT",
                  "Tồn dầu",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    className="border bg-blue-600 px-2 py-2 font-semibold text-white whitespace-nowrap relative"
                  >
                    {h === "Biển số xe" ? (
                      <div className="flex flex-col">
                        <span
                          className="cursor-pointer"
                          onClick={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left,
                            });
                            setShowVehicleFilterDropdown(
                              !showVehicleFilterDropdown
                            );
                          }}
                        >
                          {h}
                        </span>

                        {showVehicleFilterDropdown && (
                          <div
                            className="fixed w-48 border rounded bg-white text-black p-2 shadow-lg z-[999]"
                            style={{
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                            }}
                          >
                            {/* Input search */}
                            <input
                              type="text"
                              placeholder="Tìm số xe..."
                              className="w-full border rounded px-1 mb-1"
                              value={vehicleFilterSearch}
                              onChange={(e) =>
                                setVehicleFilterSearch(e.target.value)
                              }
                            />

                            {/* Checkbox chọn tất cả */}
                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  vehicleFilterOptions.length > 0 &&
                                  vehicleFilter.length ===
                                    vehicleFilterOptions.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setVehicleFilter([...vehicleFilterOptions]);
                                  else setVehicleFilter([]);
                                }}
                              />
                              <span>Chọn tất cả</span>
                            </label>

                            {/* Checkbox từng số xe */}
                            <div className="max-h-40 overflow-auto">
                              {vehicleFilterOptions
                                .filter((v) =>
                                  v
                                    .toLowerCase()
                                    .includes(vehicleFilterSearch.toLowerCase())
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={vehicleFilter.includes(v)}
                                      onChange={(e) => {
                                        if (e.target.checked)
                                          setVehicleFilter([
                                            ...vehicleFilter,
                                            v,
                                          ]);
                                        else
                                          setVehicleFilter(
                                            vehicleFilter.filter((x) => x !== v)
                                          );
                                      }}
                                    />
                                    <span>{v}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {renderNewRowNgocLong()}
              {data.map((r) => (
                <tr
                  key={r._id}
                  className={`even:bg-gray-50 hover:bg-blue-50 ${
                    editing === r._id ? "bg-yellow-100" : ""
                  }`}
                >
                  {editing === r._id ? (
                    <>
                      <td className="border px-1">
                        <input
                          type="date"
                          name="dateFull"
                          value={form.dateFull?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="day"
                          value={form.day || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="vehiclePlate"
                          value={form.vehiclePlate || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="vehicleCode"
                          value={form.vehicleCode || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="amount"
                          value={form.amount || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="liter"
                          value={form.liter || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="note"
                          value={form.note || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="cumulativeMechanical1"
                          value={form.cumulativeMechanical1 || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="cumulativeMechanical2"
                          value={form.cumulativeMechanical2 || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="cumulativeElectronic1"
                          value={form.cumulativeElectronic1 || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="cumulativeElectronic2"
                          value={form.cumulativeElectronic2 || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="internalFuelPrice"
                          value={form.internalFuelPrice || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-1">
                        <input
                          name="fuelRemaining"
                          value={form.fuelRemaining || ""}
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                      <td className="border px-2 text-center">
                        <button
                          onClick={handleSave}
                          className="text-green-600 mr-2"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600"
                        >
                          Huỷ
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-2">
                        {r.dateFull &&
                          new Date(r.dateFull).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2 text-center">{r.day}</td>
                      <td className="border px-2 text-center">
                        {r.vehiclePlate}
                      </td>
                      <td className="border px-2 text-center">
                        {r.vehicleCode}
                      </td>
                      <td className="border px-2 text-right">
                        {r.amount?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.liter?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-center">{r.note}</td>
                      <td className="border px-2 text-right">
                        {r.cumulativeMechanical1?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.cumulativeMechanical2?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.cumulativeElectronic1?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.cumulativeElectronic2?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.internalFuelPrice?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">
                        {r.fuelRemaining?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2">
                        <div className="flex justify-center">
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
                        </div>
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

  const Toolbar = () => (
    <div className="flex gap-3 mb-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm">Tháng:</label>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border py-1 text-xs"
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current.click()}
        className="border px-3 py-1 bg-gray-100"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      {importFile && (
        <span className="text-xs text-gray-600">{importFile.name}</span>
      )}

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
      <div className="flex gap-6 mb-4">
        <label>
          <input
            type="radio"
            checked={source === "vinh-khuc"}
            onChange={() => setSource("vinh-khuc")}
          />{" "}
          Vĩnh Khúc
        </label>
        <label>
          <input
            type="radio"
            checked={source === "ngoc-long"}
            onChange={() => setSource("ngoc-long")}
          />{" "}
          Ngọc Long
        </label>
      </div>

      <Toolbar />

      {loading && <p>Đang tải...</p>}

      {source === "vinh-khuc" ? renderVinhKhuc() : renderNgocLong()}
    </div>
  );
}
