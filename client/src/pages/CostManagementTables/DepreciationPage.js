import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function DepreciationPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/depreciation`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  /* ================= FILTER ================= */
  const [maTSCDOptions, setMaTSCDOptions] = useState([]);
  const [maTSCDFilter, setMaTSCDFilter] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/unique-matscd`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const maTSCD = res.data || [];
      setMaTSCDOptions(maTSCD);
      setMaTSCDFilter(maTSCD); // mặc định chọn tất cả
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

      let fetched = res.data || [];

      if (maTSCDFilter.length > 0) {
        fetched = fetched.filter((r) => maTSCDFilter.includes(r.maTSCD));
      } else {
        fetched = [];
      }

      setData(fetched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setEditing(null);
    setForm({});
  }, [maTSCDFilter]);

  /* ================= IMPORT ================= */
  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
  };

  const handleImport = async (mode = 1) => {
    if (!importFile) return alert("Chưa chọn file");

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", mode); // 1 ghi đè | 2 thêm mới

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
      alert(err.response?.data?.message || "Import thất bại");
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
  /* ================= RESIZE COLUMN ================= */
  const [colWidths, setColWidths] = useState({
    tenTSCD: 260,
  });

  const startResize = (e, key) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[key];

    const onMove = (ev) => {
      setColWidths((p) => ({
        ...p,
        [key]: Math.max(40, startWidth + ev.clientX - startX),
      }));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* ================= RENDER ================= */
  const renderNewRow = () => {
    if (editing !== "new") return null;

    return (
      <tr className="bg-green-100">
        <td className="text-center">-</td>
        {[
          ["maTSCD", "Mã TSCĐ"],
          ["tenTSCD", "Tên TSCĐ"],
          ["ngayGhiTang", "date"],
          ["soCT", "Số CT"],
          ["ngayStart", "date"],
          ["timeSD", "number"],
          ["timeSDremaining", "number"],
          ["price", "number"],
          ["valueKH", "number"],
        ].map(([name, type]) => (
          <td
            key={name}
            className="min-w-0 overflow-hidden"
            style={
              name === "tenTSCD" ? { width: colWidths.tenTSCD } : undefined
            }
          >
            <input
              type={
                type === "date" ? "date" : type === "number" ? "number" : "text"
              }
              name={name}
              value={
                type === "date"
                  ? form[name]?.slice?.(0, 10) || ""
                  : form[name] || ""
              }
              onChange={handleChange}
              className="min-w-0 border px-1 overflow-hidden"
            />
          </td>
        ))}
        <td className="text-center">
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
    const totalKH = data.reduce((sum, r) => sum + Number(r.valueKH || 0), 0);

    return (
      <>
        <div className="flex justify-between text-sm mb-2">
          <div>
            Tổng dòng: <b>{data.length}</b>
          </div>
          <div>
            Tổng KH/tháng:{" "}
            <b className="text-red-600">{totalKH.toLocaleString("vi-VN")}</b>
          </div>
        </div>

        <div className="border rounded overflow-auto max-h-[70vh]">
          <table className="text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-blue-600 text-white">
              <tr>
                {[
                  "STT",
                  "MÃ TSCĐ",
                  "TÊN TSCĐ",
                  "NGÀY GHI TĂNG",
                  "SỐ CT",
                  "NGÀY BẮT ĐẦU KH",
                  "THỜI GIAN SD",
                  "THỜI GIAN CÒN LẠI",
                  "NGUYÊN GIÁ",
                  "KH/THÁNG",
                  "HÀNH ĐỘNG",
                ].map((h) => (
                  <th
                    key={h}
                    className="border px-2 py-1 relative min-w-0 overflow-hidden"
                    style={
                      h === "TÊN TSCĐ"
                        ? { width: colWidths.tenTSCD }
                        : undefined
                    }
                  >
                    {h === "MÃ TSCĐ" ? (
                      <div className="flex flex-col relative">
                        <span
                          className="cursor-pointer select-none"
                          onClick={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                            });
                            setShowDropdown((p) => !p);
                          }}
                        >
                          {h}
                        </span>

                        {showDropdown && (
                          <div
                            className="fixed z-[999] w-48 border rounded bg-white text-black text-xs p-2 shadow-lg max-h-60 overflow-auto"
                            style={{
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Tìm biển số..."
                              className=" border rounded px-1 mb-1"
                              value={filterSearch}
                              onChange={(e) => setMaTSCDFilter(e.target.value)}
                            />
                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  maTSCDFilter.length === maTSCDOptions.length
                                }
                                onChange={(e) =>
                                  setMaTSCDFilter(
                                    e.target.checked ? [...maTSCDOptions] : []
                                  )
                                }
                              />
                              <span>Chọn tất cả</span>
                            </label>

                            <div className="max-h-40 overflow-auto">
                              {maTSCDOptions
                                .filter((v) =>
                                  v
                                    .toLowerCase()
                                    .includes(filterSearch.toLowerCase())
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1 mb-1"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={maTSCDFilter.includes(v)}
                                      onChange={(e) =>
                                        setMaTSCDFilter((p) =>
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
                              onClick={() => setShowDropdown(false)}
                              className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                            >
                              Đóng
                            </button>
                          </div>
                        )}
                      </div>
                    ) : h === "TÊN TSCĐ" ? (
                      /* ===== CỘT CÓ KÉO ===== */
                      <>
                        <span>{h}</span>
                        <div
                          onMouseDown={(e) => startResize(e, "tenTSCD")}
                          className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-300"
                        />
                      </>
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
                <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                  {editing === r._id ? (
                    <>
                      <td className="border px-2 text-center">{idx + 1}</td>

                      <td className="border px-2">
                        <input
                          name="maTSCD"
                          value={form.maTSCD || ""}
                          onChange={handleChange}
                          className=" border px-1"
                        />
                      </td>

                      <td
                        className="border px-2 min-w-0 overflow-hidden"
                        style={{ width: colWidths.tenTSCD }}
                      >
                        <input
                          name="tenTSCD"
                          value={form.tenTSCD || ""}
                          onChange={handleChange}
                          className="border px-1 overflow-hidden"
                          style={{
                            width: "100%",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="date"
                          name="ngayGhiTang"
                          value={form.ngayGhiTang?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className="border px-1"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          name="soCT"
                          value={form.soCT || ""}
                          onChange={handleChange}
                          className=" border px-1"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="date"
                          name="ngayStart"
                          value={form.ngayStart?.slice(0, 10) || ""}
                          onChange={handleChange}
                          className=" border px-1"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="number"
                          name="timeSD"
                          value={form.timeSD || 0}
                          onChange={handleChange}
                          className=" border px-1 text-right"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="number"
                          name="timeSDremaining"
                          value={form.timeSDremaining || 0}
                          onChange={handleChange}
                          className=" border px-1 text-right"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="number"
                          name="price"
                          value={form.price || 0}
                          onChange={handleChange}
                          className=" border px-1 text-right"
                        />
                      </td>

                      <td className="border px-2">
                        <input
                          type="number"
                          name="valueKH"
                          value={form.valueKH || 0}
                          onChange={handleChange}
                          className=" border px-1 text-right"
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
                      <td className="border px-2 text-center">{idx + 1}</td>
                      <td className="border px-2">{r.maTSCD}</td>
                      <td
                        className="border px-2 overflow-hidden"
                        style={{ width: colWidths.tenTSCD, minWidth: 0 }}
                      >
                        <div
                          style={{  
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.tenTSCD}
                        </div>
                      </td>

                      <td className="border px-2">
                        {r.ngayGhiTang &&
                          new Date(r.ngayGhiTang).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2">{r.soCT}</td>
                      <td className="border px-2">
                        {r.ngayStart &&
                          new Date(r.ngayStart).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right">{r.timeSD}</td>
                      <td className="border px-2 text-right">
                        {r.timeSDremaining}
                      </td>
                      <td className="border px-2 text-right">
                        {r.price?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-right font-semibold">
                        {r.valueKH?.toLocaleString("vi-VN")}
                      </td>
                      <td className="border px-2 text-center">
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
      <button
        onClick={() => handleImport(1)}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1"
      >
        Import (Ghi đè)
      </button>
      <button
        onClick={() => handleImport(2)}
        disabled={!importFile || importing}
        className="bg-purple-600 text-white px-2 py-1"
      >
        Import (Thêm mới)
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
      {importing && <span className="text-blue-600">Đang nhập…</span>}
      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal}
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
