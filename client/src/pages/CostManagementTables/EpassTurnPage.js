import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function EpassTurnPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const baseUrl = `${API}/epass-turn`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  /* ================= FILTER BIỂN SỐ ================= */
  const [bsxOptions, setBsxOptions] = useState([]);
  const [bsxFilter, setBsxFilter] = useState([]);
  const [bsxSearch, setBsxSearch] = useState("");
  const [showBsxDropdown, setShowBsxDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  /* ================= FETCH FILTER ================= */
  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/unique-bsx`);
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

  const [page, setPage] = useState(1);
  const limit = 150;
  const [totalPages, setTotalPages] = useState(1);

  /* ================= FETCH DATA ================= */
const fetchData = async () => {
  setLoading(true);
  try {
    const params = { page, limit };

    // Nếu không chọn tất cả thì gửi filter
    if (bsxFilter.length > 0 && bsxFilter.length !== bsxOptions.length) {
      params.bienSoXe = bsxFilter;
    }

    const res = await axios.get(baseUrl, {
      params,
      // serialize array thành multiple query param
      paramsSerializer: (params) => {
        const qs = [];
        Object.keys(params).forEach((key) => {
          const value = params[key];
          if (Array.isArray(value)) {
            value.forEach((v) => qs.push(`${key}=${encodeURIComponent(v)}`));
          } else {
            qs.push(`${key}=${encodeURIComponent(value)}`);
          }
        });
        return qs.join("&");
      },
    });

    setData(Array.isArray(res.data.data) ? res.data.data : []);
    setTotalPages(res.data.totalPages || 1);
  } catch (err) {
    console.error(err);
    setData([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData();
    setEditing(null);
    setForm({});
  }, [page,bsxFilter.length, bsxFilter.join(",")]);

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
        headers: { "Content-Type": "multipart/form-data" },
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
        await axios.post(baseUrl, form);
      } else {
        await axios.put(`${baseUrl}/${editing}`, form);
      }
      fetchData();
      setEditing(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa dòng này?")) return;
    await axios.delete(`${baseUrl}/${id}`);
    fetchData();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Xóa toàn bộ dữ liệu?")) return;
    await axios.delete(baseUrl);
    fetchData();
  };

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

      {/* TABLE */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full table-auto border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 bg-blue-600 text-white">
            <tr>
              {[
                "STT",
                "MÃ GD",
                "TRẠM VÀO",
                "THỜI GIAN TRẠM VÀO",
                "TRẠM RA",
                "THỜI GIAN TRẠM RA",
                "THỜI GIAN THỰC HIỆN GD",
                "BIỂN SỐ XE",
                "HÌNH THỨC THU PHÍ",
                "LOẠI VÉ",
                "GIÁ TIỀN",
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
                      {/* DROPDOWN FILTER BSX */}
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
                                checked={
                                  bsxOptions.length > 0 &&
                                  bsxFilter.length === bsxOptions.length
                                }
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
                                        setBsxFilter((prev) =>
                                          e.target.checked
                                            ? [...prev, v]
                                            : prev.filter((x) => x !== v)
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
            {/* NEW ROW */}
            {editing === "new" && (
              <tr className="bg-green-100">
                <td />
                <td>
                  <input
                    name="maGD"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="TramVao"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    name="TimeIn"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="TramRa"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    name="TimeOut"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    name="TimeActions"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="bienSoXe"
                    onChange={handleChange}
                    className="border px-1"
                  />
                </td>
                <td>
                  <input
                    name="htThuPhi"
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
                    name="price"
                    onChange={handleChange}
                    className="border px-1 text-right"
                  />
                </td>
                <td className="text-center">
                  <button onClick={handleSave} className="text-green-600 mr-2">
                    Lưu
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-gray-600"
                  >
                    Huỷ
                  </button>
                </td>
              </tr>
            )}

            {/* DATA */}
            {data.map((r, i) => (
              <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                {editing === r._id ? (
                  <>
                    <td className="border text-center">{i + 1}</td>

                    <td className="border px-1">
                      <input
                        name="maGD"
                        value={form.maGD || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        name="TramVao"
                        value={form.TramVao || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        type="datetime-local"
                        name="TimeIn"
                        value={form.TimeIn ? form.TimeIn.slice(0, 16) : ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        name="TramRa"
                        value={form.TramRa || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        type="datetime-local"
                        name="TimeOut"
                        value={form.TimeOut ? form.TimeOut.slice(0, 16) : ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        type="datetime-local"
                        name="TimeActions"
                        value={
                          form.TimeActions ? form.TimeActions.slice(0, 16) : ""
                        }
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        name="bienSoXe"
                        value={form.bienSoXe || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        name="htThuPhi"
                        value={form.htThuPhi || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        name="loaiVe"
                        value={form.loaiVe || ""}
                        onChange={handleChange}
                        className="border px-1 w-full"
                      />
                    </td>

                    <td className="border px-1">
                      <input
                        type="number"
                        name="price"
                        value={form.price || 0}
                        onChange={handleChange}
                        className="border px-1 w-full text-right"
                      />
                    </td>

                    <td className="border text-center">
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
                    <td className="border text-center">{i + 1}</td>
                    <td className="border px-1">{r.maGD}</td>
                    <td className="border px-1">{r.TramVao}</td>
                    <td className="border px-1">
                      {r.TimeIn && new Date(r.TimeIn).toLocaleString("vi-VN")}
                    </td>
                    <td className="border px-1">{r.TramRa}</td>
                    <td className="border px-1">
                      {r.TimeOut && new Date(r.TimeOut).toLocaleString("vi-VN")}
                    </td>
                    <td className="border px-1">
                      {r.TimeActions &&
                        new Date(r.TimeActions).toLocaleString("vi-VN")}
                    </td>
                    <td className="border px-1">{r.bienSoXe}</td>
                    <td className="border px-1">{r.htThuPhi}</td>
                    <td className="border px-1">{r.loaiVe}</td>
                    <td className="border px-1 text-right font-semibold">
                      {r.price?.toLocaleString("vi-VN")}
                    </td>
                    <td className="border text-center">
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
      <div className="flex gap-2 justify-center mt-3 text-xs items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="border px-2 py-1"
        >
          ◀ Trước
        </button>

        <span>
          Trang {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="border px-2 py-1"
        >
          Sau ▶
        </button>
      </div>
    </div>
  );
}
