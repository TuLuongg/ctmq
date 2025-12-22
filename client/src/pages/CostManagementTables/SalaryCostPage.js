import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export const SALARY_FIELDS = [
  // ===== THỜI GIAN =====
  { key: "ngayThang", label: "Ngày tháng", type: "date" },

  // ===== XE =====
  { key: "bienSoXe", label: "Biển số xe" },

  // ===== NHÂN SỰ =====
  { key: "stt", label: "STT", type: "number" },
  { key: "tenNhanVien", label: "Tên nhân viên" },
  { key: "soTaiKhoan", label: "Số TK" },
  { key: "tenNganHang", label: "Ngân hàng" },

  // ===== LƯƠNG CƠ BẢN =====
  { key: "luongThoaThuan", label: "Lương thỏa thuận", type: "number" },
  { key: "donGiaNgayCong", label: "Đơn giá ngày công", type: "number" },

  // ===== CÔNG =====
  { key: "soNgayCongDiLam", label: "Số ngày công đi làm", type: "number" },
  { key: "tienCongDiLam", label: "Tiền công đi làm", type: "number" },
  { key: "tienDienThoai", label: "Tiền điện thoại", type: "number" },

  { key: "soNgayCongNghi", label: "Số ngày công nghỉ", type: "number" },
  { key: "tienCongNghi", label: "Tiền công nghỉ", type: "number" },

  // ===== PHỤ CẤP / TRỪ =====
  { key: "muoiPhanTramLuong", label: "10% lương", type: "number" },
  { key: "tongSo", label: "Tổng số", type: "number" },
  { key: "soTienTamUng", label: "Số tiền tạm ứng", type: "number" },
  { key: "bhxh", label: "BHXH", type: "number" },

  { key: "hoTroTienDienThoai", label: "Hỗ trợ ĐT", type: "number" },
  { key: "thuongLeTet", label: "Thưởng lễ tết", type: "number" },
  { key: "diMuonVeSom", label: "Đi muộn / về sớm", type: "number" },
  { key: "damHieu", label: "Đám hiếu", type: "number" },
  { key: "chuyenCan", label: "Chuyên cần", type: "number" },

  // ===== TỔNG & THANH TOÁN =====
  { key: "soTienConDuocLinh", label: "Số tiền còn được lĩnh", type: "number" },

  // ===== KHÁC =====
  { key: "ghiChu", label: "Ghi chú" },
  { key: "soTienLuongDaGiu", label: "Số tiền lương đã giữ", type: "number" },
  {
    key: "soTienLuongConPhaiGiu",
    label: "Số tiền lương còn phải giữ",
    type: "number",
  },
];

const STICKY_COLS = {
  stt: { left: 0, width: 60 },
  tenNhanVien: { left: 60, width: 160 },
};

export default function SalaryCostPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/salary`;

  /* ================= FILTER DRIVER ================= */
  const [driverOptions, setDriverOptions] = useState([]);
  const [driverFilter, setDriverFilter] = useState([]);
  const [driverFilterSearch, setDriverFilterSearch] = useState("");
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  /* ================= MONTH FILTER ================= */
  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  /* ================= IMPORT ================= */
  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  /* ================= FETCH FILTER OPTIONS ================= */
  const fetchDriverOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data || [];
      setDriverOptions(list);
      setDriverFilter([]); // mặc định chọn tất cả
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDriverOptions();
  }, []);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};

      if (monthFilter) params.month = monthFilter;
      if (driverFilter.length > 0)
        params.drivers = JSON.stringify(driverFilter);

      const res = await axios.get(baseUrl, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data || []);
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
  }, [monthFilter, driverFilter]);

  /* ================= IMPORT ================= */
  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (file) setImportFile(file);
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
      alert(err.response?.data?.message || "Import lỗi");
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
    if (!monthFilter) return alert("Chọn tháng trước khi xóa toàn bộ");
    if (!window.confirm("Xóa toàn bộ dữ liệu tháng này?")) return;

    await axios.delete(baseUrl, {
      params: { month: monthFilter },
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };
  const [visibleCols, setVisibleCols] = useState(
    SALARY_FIELDS.map((f) => f.key)
  );
  const [showColFilter, setShowColFilter] = useState(false);

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
        Xóa tất cả (theo tháng)
      </button>

      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}
      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal}
        </span>
      )}
    </div>
  );

  /* ================= TABLE ================= */
  const renderTable = () => (
    <div className="border rounded-lg relative overflow-auto max-h-[80vh]">
      <table className="min-w-[1800px] w-full text-xs border-separate border-spacing-0">
        <thead className=" bg-blue-600 text-white text-xs">
          <tr>
            {SALARY_FIELDS.filter((f) => visibleCols.includes(f.key)).map(
              (f) => (
                <th
                  key={f.key}
                  className={`border px-2 py-1 whitespace-nowrap
    ${
      STICKY_COLS[f.key]
        ? "sticky bg-blue-600 z-[60]"
        : "sticky bg-blue-600 z-[40]"
    }
  `}
                  style={{
                    top: 0,
                    ...(STICKY_COLS[f.key]
                      ? {
                          left: STICKY_COLS[f.key].left,
                          minWidth: STICKY_COLS[f.key].width,
                        }
                      : {}),
                  }}
                >
                  {f.key === "tenNhanVien" ? (
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setDropdownPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });
                          setShowDriverDropdown((p) => !p);
                        }}
                      >
                        {f.label}
                      </span>

                      {showDriverDropdown && (
                        <div
                          className="fixed z-[999] w-56 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: `${dropdownPos.top}px`,
                            left: `${dropdownPos.left}px`,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm lái xe..."
                            className="w-full border rounded px-1 mb-1 text-xs"
                            value={driverFilterSearch}
                            onChange={(e) =>
                              setDriverFilterSearch(e.target.value)
                            }
                          />

                          <label className="flex items-center gap-1 mb-1 text-xs">
                            <input
                              type="checkbox"
                              checked={
                                driverFilter.length === driverOptions.length
                              }
                              onChange={(e) =>
                                setDriverFilter(
                                  e.target.checked ? [...driverOptions] : []
                                )
                              }
                            />
                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {driverOptions
                              .filter((d) =>
                                d
                                  .toLowerCase()
                                  .includes(driverFilterSearch.toLowerCase())
                              )
                              .map((d) => (
                                <label
                                  key={d}
                                  className="flex items-center gap-1 mb-1 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={driverFilter.includes(d)}
                                    onChange={(e) =>
                                      setDriverFilter((p) =>
                                        e.target.checked
                                          ? [...p, d]
                                          : p.filter((x) => x !== d)
                                      )
                                    }
                                  />
                                  <span>{d}</span>
                                </label>
                              ))}
                          </div>

                          <button
                            onClick={() => setShowDriverDropdown(false)}
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
              )
            )}
            <th className="sticky top-0 z-40 bg-blue-600 border px-2">Hành động</th>
          </tr>
        </thead>

        <tbody>
          {/* ===== DÒNG THÊM / SỬA ===== */}
          {(editing === "new" || editing) && (
            <tr className="bg-yellow-50">
              {SALARY_FIELDS.filter((f) => visibleCols.includes(f.key)).map(
                (f) => (
                  <td key={f.key} className="border px-1">
                    <input
                      type={f.type === "date" ? "date" : "number"}
                      name={f.key}
                      value={
                        f.type === "date" && form[f.key]
                          ? form[f.key].slice(0, 10)
                          : form[f.key] ?? ""
                      }
                      onChange={handleChange}
                      className="w-full border px-1 text-right"
                    />
                  </td>
                )
              )}
              <td className="border px-2 text-center whitespace-nowrap">
                <button
                  onClick={handleSave}
                  className="text-green-600 font-semibold"
                >
                  Lưu
                </button>
                <button onClick={handleCancel} className="text-gray-600 ml-2">
                  Hủy
                </button>
              </td>
            </tr>
          )}

          {/* ===== DATA ===== */}
          {data.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50">
              {SALARY_FIELDS.filter((f) => visibleCols.includes(f.key)).map(
                (f) => (
                  <td
                    key={f.key}
                    className={`border px-2 whitespace-nowrap ${
                      STICKY_COLS[f.key] ? "sticky bg-white z-[20]" : ""
                    }`}
                    style={
                      STICKY_COLS[f.key]
                        ? {
                            left: STICKY_COLS[f.key].left,
                            minWidth: STICKY_COLS[f.key].width,
                          }
                        : {}
                    }
                  >
                    {f.type === "date" && r[f.key]
                      ? (() => {
                          const d = new Date(r[f.key]);
                          return `${String(d.getMonth() + 1).padStart(
                            2,
                            "0"
                          )}/${d.getFullYear()}`;
                        })()
                      : typeof r[f.key] === "number"
                      ? r[f.key].toLocaleString()
                      : r[f.key]}
                  </td>
                )
              )}
              <td className="border px-2 text-center whitespace-nowrap">
                <button onClick={() => handleEdit(r)} className="text-blue-600">
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(r._id)}
                  className="text-red-600 ml-2"
                >
                  Xóa
                </button>
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
      <button
        onClick={() => setShowColFilter((p) => !p)}
        className="border px-2 py-1"
      >
        Cột hiển thị
      </button>
      {showColFilter && (
        <div className="absolute z-[999] bg-white border rounded shadow p-2 text-xs w-56">
          {/* ===== HEADER ===== */}
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Hiển thị cột</span>
            <button
              onClick={() => setShowColFilter(false)}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          {/* ===== CHỌN TẤT CẢ ===== */}
          <label className="flex items-center gap-2 mb-2 border-b pb-1">
            <input
              type="checkbox"
              checked={SALARY_FIELDS.every(
                (f) => visibleCols.includes(f.key) || STICKY_COLS[f.key]
              )}
              onChange={(e) => {
                if (e.target.checked) {
                  setVisibleCols(SALARY_FIELDS.map((f) => f.key));
                } else {
                  // chỉ giữ lại cột sticky
                  setVisibleCols(Object.keys(STICKY_COLS));
                }
              }}
            />
            <span className="font-medium">Chọn tất cả</span>
          </label>

          {/* ===== DANH SÁCH CỘT (SCROLL) ===== */}
          <div className="max-h-60 overflow-y-auto pr-1">
            {SALARY_FIELDS.map((f) => {
              const isSticky = !!STICKY_COLS[f.key];
              return (
                <label key={f.key} className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    disabled={isSticky}
                    checked={visibleCols.includes(f.key)}
                    onChange={(e) =>
                      setVisibleCols((p) =>
                        e.target.checked
                          ? [...p, f.key]
                          : p.filter((x) => x !== f.key)
                      )
                    }
                  />
                  <span className={isSticky ? "text-gray-400" : ""}>
                    {f.label}
                    {isSticky && " (cố định)"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {loading && <p>Đang tải...</p>}
      {renderTable()}
    </div>
  );
}
