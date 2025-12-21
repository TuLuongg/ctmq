import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function TireCostPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/tire`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState([]);
  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  /* ================= FETCH FILTER OPTIONS ================= */
  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/unique-plates`, {
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
    fetchFilterOptions();
  }, []);

  const [monthFilter, setMonthFilter] = useState(""); // format YYYY-MM

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedData = res.data || [];
      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          const d = new Date(r.ngay);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          return ym === monthFilter;
        });
      }

      // ⬇️ APPLY VEHICLE FILTER
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
    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
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
      const res = await axios.post(`${baseUrl}/import-excel`, formData, {
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
        err.response?.data?.message || err.message || "Import thất bại";
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
      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}
      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}
    </div>
  );

  /* ================= TABLE ================= */
  const renderTable = () => {
    return (
      <>
        {" "}
        <div className="flex justify-between items-center mb-2 text-xs">
          <div>
            Tổng số dòng: <b>{data.length}</b>
          </div>
        </div>
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="min-w-[1200px] w-full table-auto border-collapse text-xs">
            <thead className="sticky top-0 bg-blue-600 z-20 text-white text-center">
              <tr>
                {[
                  "Nhà cung cấp",
                  "Ngày",
                  "Biển số xe",
                  "Rửa xe",
                  "Bơm mỡ",
                  "Cân hơi",
                  "Cắt thảm",
                  "Chi phí khác",
                  "Thay/Đổi lốp",
                  "Số lượng lốp",
                  "Đơn giá lốp",
                  "Thành tiền lốp",
                  "Tổng chi phí",
                  "Ghi chú",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    className="border px-2 py-1 whitespace-nowrap relative"
                  >
                    {h === "Biển số xe" ? (
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
                          {h}
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
                              onChange={(e) =>
                                setVehicleFilterSearch(e.target.value)
                              }
                            />
                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  vehicleFilter.length ===
                                  vehicleFilterOptions.length
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
                                  v
                                    .toLowerCase()
                                    .includes(vehicleFilterSearch.toLowerCase())
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1 mb-1"
                                  >
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
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {editing === "new" && (
                <tr className="bg-green-100">
                  {[
                    "nhaCungCap",
                    "ngay",
                    "bienSoXe",
                    "ruaXe",
                    "bomMo",
                    "canHoi",
                    "catTham",
                    "chiPhiKhac",
                    "thayLopDoiLop",
                    "soLuongLop",
                    "donGiaLop",
                    "thanhTienLop",
                    "tongChiPhi",
                    "ghiChu",
                  ].map((key) => (
                    <td key={key} className="border px-1 py-0.5">
                      <input
                        type={key === "ngay" ? "date" : "text"}
                        name={key}
                        value={form[key] || ""}
                        onChange={handleChange}
                        className="w-full border px-1 text-right"
                      />
                    </td>
                  ))}
                  <td className="text-center">
                    <button
                      onClick={handleSave}
                      className="text-green-600 mr-2"
                    >
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
                  {editing === r._id ? (
                    <>
                      {[
                        "nhaCungCap",
                        "ngay",
                        "bienSoXe",
                        "ruaXe",
                        "bomMo",
                        "canHoi",
                        "catTham",
                        "chiPhiKhac",
                        "thayLopDoiLop",
                        "soLuongLop",
                        "donGiaLop",
                        "thanhTienLop",
                        "tongChiPhi",
                        "ghiChu",
                      ].map((key) => (
                        <td key={key} className="border px-1 py-0.5">
                          <input
                            type={key === "ngay" ? "date" : "text"}
                            name={key}
                            value={
                              key === "ngay" && form[key]
                                ? form[key].slice(0, 10)
                                : form[key] ?? ""
                            }
                            onChange={handleChange}
                            className="w-full border px-1 text-right"
                          />
                        </td>
                      ))}
                      <td className="border text-center">
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
                      <td className="border px-2 py-1">{r.nhaCungCap}</td>
                      <td className="border px-2 py-1">
                        {new Date(r.ngay).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2 py-1">{r.bienSoXe}</td>
                      <td className="border px-2 py-1 text-right">
                        {r.ruaXe.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.bomMo.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.canHoi.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.catTham.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.chiPhiKhac.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.thayLopDoiLop}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.soLuongLop}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.donGiaLop.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.thanhTienLop.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {r.tongChiPhi.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1">{r.ghiChu}</td>
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

  return (
    <div className="p-4">
      <Toolbar />
      {loading && <p>Đang tải...</p>}
      {renderTable()}
    </div>
  );
}
