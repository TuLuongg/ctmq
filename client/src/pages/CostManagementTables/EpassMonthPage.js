import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function EpassMonthPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/epass-month`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  /* ================= FILTER ================= */
  const [bsxOptions, setBsxOptions] = useState([]);
  const [bsxFilter, setBsxFilter] = useState([]);
  const [bsxSearch, setBsxSearch] = useState("");
  const [showBsxDropdown, setShowBsxDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  /* ================= FETCH FILTER ================= */
  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/unique-bsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bsx = res.data || [];
      setBsxOptions(bsx);
      setBsxFilter(bsx); // mặc định chọn tất cả
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

      // ⬇️ FILTER GIỐNG RepairCost
      if (bsxFilter && bsxFilter.length > 0) {
        fetched = fetched.filter((r) => bsxFilter.includes(r.bienSoXe));
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
  }, [bsxFilter]);

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
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Import thất bại");
    } finally {
      setImporting(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ================= CRUD ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddNew = () => {
    setEditing("new");
    setForm({});
  };

  const handleEdit = (row) => {
    setEditing(row._id);
    setForm({ ...row });
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
      setEditing(null);
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

  const totalMoney = data.reduce(
    (sum, r) => sum + Number(r.moneyAmount || 0),
    0
  );

  /* ================= TABLE ================= */
  return (
    <div className="p-4">
      {/* TOOLBAR */}
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
          Chọn file
        </button>
        {importFile && <span className="text-xs">{importFile.name}</span>}
        <button
          onClick={handleImport}
          disabled={!importFile || importing}
          className="bg-blue-600 text-white px-2 py-1"
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
          className="bg-red-600 text-white px-2 py-1"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="flex justify-between items-center mb-2 text-xs">
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
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full table-auto text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 bg-blue-600 text-white">
            <tr>
              {[
                "STT",
                "BIỂN SỐ XE",
                "TRẠM / ĐOẠN",
                "LOẠI VÉ",
                "SỐ TIỀN",
                "NGÀY MUA",
                "TỪ NGÀY",
                "ĐẾN NGÀY",
                "HÀNH ĐỘNG",
              ].map((h) => (
                <th key={h} className="border px-2 py-2 text-center">
                  {h === "BIỂN SỐ XE" ? (
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer"
                        onClick={(e) => {
                          const r = e.target.getBoundingClientRect();
                          setDropdownPos({
                            top: r.bottom + window.scrollY,
                            left: r.left + window.scrollX,
                          });
                          setShowBsxDropdown((p) => !p);
                        }}
                      >
                        {h}
                      </span>
                      {/* ===== DROPDOWN FILTER BSX ===== */}
                      {showBsxDropdown && (
                        <div
                          className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm biển số..."
                            className="w-full border rounded px-1 mb-1"
                            value={bsxSearch}
                            onChange={(e) => setBsxSearch(e.target.value)}
                          />

                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={bsxFilter.length === bsxOptions.length}
                              onChange={(e) =>
                                setBsxFilter(
                                  e.target.checked ? [...bsxOptions] : []
                                )
                              }
                            />
                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {bsxOptions
                              .filter((v) =>
                                v
                                  .toLowerCase()
                                  .includes(bsxSearch.toLowerCase())
                              )
                              .map((v) => (
                                <label
                                  key={v}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={bsxFilter.includes(v)}
                                    onChange={(e) =>
                                      setBsxFilter((p) =>
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
                            onClick={() => setShowBsxDropdown(false)}
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
                <td />
                <td>
                  <input
                    name="bienSoXe"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="tramDoan"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="loaiVe"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="moneyAmount"
                    onChange={handleChange}
                    className="border px-1 text-right"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="dayBuy"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="dayFrom"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="dayTo"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td className="text-center">
                  <button onClick={handleSave} className="text-green-600 mr-2">
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setForm({});
                    }}
                    className="text-gray-600"
                  >
                    Huỷ
                  </button>
                </td>
              </tr>
            )}

            {data.map((r, i) => (
              <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                {editing === r._id ? (
                  <>
                    <td className="border px-2 text-center">{i + 1}</td>

                    <td className="border px-2">
                      <input
                        name="bienSoXe"
                        value={form.bienSoXe || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        name="tramDoan"
                        value={form.tramDoan || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        name="loaiVe"
                        value={form.loaiVe || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        type="number"
                        name="moneyAmount"
                        value={form.moneyAmount || 0}
                        onChange={handleChange}
                        className="border px-1 w-full text-right"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        type="date"
                        name="dayBuy"
                        value={form.dayBuy?.slice(0, 10) || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        type="date"
                        name="dayFrom"
                        value={form.dayFrom?.slice(0, 10) || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-2">
                      <input
                        type="date"
                        name="dayTo"
                        value={form.dayTo?.slice(0, 10) || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
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
                        onClick={() => {
                          setEditing(null);
                          setForm({});
                        }}
                        className="text-gray-600"
                      >
                        Huỷ
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border px-2 text-center">{i + 1}</td>
                    <td className="border px-2">{r.bienSoXe}</td>
                    <td className="border px-2">{r.tramDoan}</td>
                    <td className="border px-2">{r.loaiVe}</td>
                    <td className="border px-2 text-right">
                      {r.moneyAmount?.toLocaleString("vi-VN")}
                    </td>
                    <td className="border px-2 text-center">
                      {r.dayBuy &&
                        new Date(r.dayBuy).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="border px-2 text-center">
                      {r.dayFrom &&
                        new Date(r.dayFrom).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="border px-2 text-center">
                      {r.dayTo && new Date(r.dayTo).toLocaleDateString("vi-VN")}
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
    </div>
  );
}
