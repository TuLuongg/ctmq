import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

const fieldMap = [
  { key: "maCCDC", label: "Mã CCDC" },
  { key: "tenCCDE", label: "Tên CCDC" },
  { key: "bienSoXe", label: "Biển số xe" },
  { key: "typeCCDC", label: "Loại CCDC" },
  { key: "reason", label: "Lý do ghi tăng" },
  { key: "ngayGhiTang", label: "Ngày ghi tăng" },
  { key: "soCT", label: "Số CT ghi tăng" },
  { key: "soKyPB", label: "Số kỳ phân bổ" },
  { key: "soKyPBconlai", label: "Số kỳ PB còn lại" },
  { key: "valueCCDC", label: "Giá trị CCDC" },
  { key: "valuePB", label: "Giá trị PB" },
  { key: "pbk", label: "Lũy kế đã PB" },
  { key: "lkPB", label: "LK PB" },
  { key: "valueOld", label: "Giá trị còn lại" },
  { key: "tkPB", label: "TK chờ phân bổ" },
];

export default function VehicleLegalPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/vehicle-legal`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const [monthFilter, setMonthFilter] = useState("");

  // Filter biển số xe
  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState([]);
  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Fetch các biển số xe duy nhất
  const fetchVehicleOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/vehicleNos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vehicles = res.data || [];
      setVehicleFilterOptions(vehicles);
      setVehicleFilter(vehicles); // mặc định chọn tất cả
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicleOptions();
  }, []);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedData = res.data || [];

      // lọc theo tháng
      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          if (!r.ngayGhiTang) return false;
          const d = new Date(r.ngayGhiTang);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          return ym === monthFilter;
        });
      }

      // lọc theo biển số xe
      if (vehicleFilter && vehicleFilter.length > 0) {
        fetchedData = fetchedData.filter((r) =>
          vehicleFilter.includes(r.bienSoXe)
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
  }, [monthFilter, vehicleFilter]);

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
      alert(err.response?.data?.message || err.message || "Import thất bại");
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
  const handleEdit = (row) => setEditing(row._id) || setForm({ ...row });
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

  /* ================= TOOLBAR ================= */
  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center">
      <input
        type="month"
        value={monthFilter}
        onChange={(e) => setMonthFilter(e.target.value)}
        className="border px-2 py-1"
      />

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
    </div>
  );

  /* ================= TABLE ================= */
  const renderTable = () => (
    <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
      <table className="min-w-[1400px] w-full table-auto border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 bg-blue-600 z-10 text-white text-center">
          <tr>
            {fieldMap.map((f) => (
              <th key={f.key} className="border px-2 py-1 whitespace-nowrap relative">
                {f.key === "bienSoXe" ? (
                  <div className="flex flex-col relative">
                    <span
                      className="cursor-pointer select-none"
                      onClick={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setDropdownPos({
                          top: rect.bottom + window.scrollY,
                          left: rect.left + window.scrollX,
                        });
                        setShowVehicleDropdown((p) => !p);
                      }}
                    >
                      {f.label}
                    </span>
                    {showVehicleDropdown && (
                      <div
                        className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                        style={{
                          top: `${dropdownPos.top}px`,
                          left: `${dropdownPos.left}px`,
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Tìm biển số..."
                          className="w-full border rounded px-1 mb-1"
                          value={vehicleFilterSearch}
                          onChange={(e) => setVehicleFilterSearch(e.target.value)}
                        />
                        <label className="flex items-center gap-1 mb-1">
                          <input
                            type="checkbox"
                            checked={
                              vehicleFilter.length === vehicleFilterOptions.length
                            }
                            onChange={(e) =>
                              setVehicleFilter(
                                e.target.checked
                                  ? [...vehicleFilterOptions]
                                  : []
                              )
                            }
                          />
                          <span>Chọn tất cả</span>
                        </label>
                        <div className="max-h-40 overflow-auto">
                          {vehicleFilterOptions
                            .filter((v) =>
                              v.toLowerCase().includes(vehicleFilterSearch.toLowerCase())
                            )
                            .map((v) => (
                              <label key={v} className="flex items-center gap-1 mb-1">
                                <input
                                  type="checkbox"
                                  checked={vehicleFilter.includes(v)}
                                  onChange={(e) =>
                                    setVehicleFilter((p) =>
                                      e.target.checked
                                        ? [...p, v]
                                        : p.filter((x) => x !== v)
                                    )
                                  }
                                />
                                <span>{v}</span>
                              </label>
                            ))}
                        </div>
                        <button
                          onClick={() => setShowVehicleDropdown(false)}
                          className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                        >
                          Đóng
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  f.label
                )}
              </th>
            ))}
            <th className="border px-2 py-1">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
            <tr className="bg-green-100">
              {fieldMap.map((f) => (
                <td key={f.key} className="border px-1 py-0.5">
                  <input
                    type={f.key.includes("ngay") ? "date" : "text"}
                    name={f.key}
                    value={form[f.key] || ""}
                    onChange={handleChange}
                    className="w-full border px-1 py-0.5 text-sm"
                  />
                </td>
              ))}
              <td className="border px-2 py-1 text-center">
                <button onClick={handleSave} className="text-green-600 mr-2">
                  Lưu
                </button>
                <button onClick={handleCancel} className="text-gray-600">
                  Huỷ
                </button>
              </td>
            </tr>
          )}
          {data.map((r) => (
            <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
              {editing === r._id
                ? fieldMap.map((f) => (
                    <td key={f.key} className="border px-1 py-0.5">
                      <input
                        type={f.key.includes("ngay") ? "date" : "text"}
                        name={f.key}
                        value={
                          f.key.includes("ngay") && form[f.key]
                            ? form[f.key].slice(0, 10)
                            : form[f.key] ?? ""
                        }
                        onChange={handleChange}
                        className="w-full border px-1 py-0.5 text-sm"
                      />
                    </td>
                  ))
                : fieldMap.map((f) => (
                    <td
                      key={f.key}
                      className={`border px-2 py-1 ${
                        typeof r[f.key] === "number" ? "text-right" : "text-left"
                      }`}
                    >
                      {f.key.includes("ngayGhiTang") && r[f.key]
                        ? new Date(r[f.key]).toLocaleDateString("vi-VN")
                        : typeof r[f.key] === "number"
                        ? r[f.key].toLocaleString()
                        : r[f.key]}
                    </td>
                  ))}
              <td className="border px-2 py-1 text-center">
                {editing === r._id ? (
                  <>
                    <button onClick={handleSave} className="text-green-600 mr-2">
                      Lưu
                    </button>
                    <button onClick={handleCancel} className="text-gray-600">
                      Huỷ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-blue-600 mr-2 hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-red-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
