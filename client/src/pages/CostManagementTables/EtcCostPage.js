import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

const fieldMap = [
  { key: "bsx", label: "Biển số xe" },
  { key: "xecoCB", label: "Xe có CB" },
  { key: "dayBuy", label: "Ngày mua" },
  { key: "dayExp", label: "Ngày hết hạn" },
  { key: "timeUse", label: "Thời gian sử dụng" },
  { key: "phiGPS", label: "Phí GPS" },
  { key: "DVmaychu", label: "DV máy chủ" },
  { key: "DVsimcard", label: "DV simcard" },
  { key: "camBienDau", label: "Cảm biến dầu" },
  { key: "camHT", label: "Cam hành trình" },
  { key: "suaChua", label: "Sửa chữa" },
  { key: "ghiChu", label: "Ghi chú" },
  { key: "nameDV", label: "Tên dịch vụ" },
  { key: "nameCompany", label: "Tên công ty" },
  { key: "soHoaDon", label: "Số hóa đơn" },
  { key: "soHD", label: "Số hợp đồng" },
  { key: "dayBill", label: "Ngày chuyển tiền" },
];

export default function ETCPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/etc`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const [monthFilter, setMonthFilter] = useState("");

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
          const d = new Date(r.dayBill);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          return ym === monthFilter;
        });
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
  }, [monthFilter]);

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
    const fields = [
      "bsx",
      "xecoCB",
      "dayBuy",
      "dayExp",
      "timeUse",
      "phiGPS",
      "DVmaychu",
      "DVsimcard",
      "camBienDau",
      "camHT",
      "suaChua",
      "ghiChu",
      "nameDV",
      "nameCompany",
      "soHoaDon",
      "soHD",
      "dayBill",
    ];

    return (
      <>
        <div className="flex justify-between items-center mb-2 text-xs">
          <div>
            Tổng số dòng: <b>{data.length}</b>
          </div>
        </div>
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="min-w-[1400px] w-full table-auto border-separate border-spacing-0 text-xs">
            <thead className="bg-blue-600 text-white sticky top-0 z-10">
              <tr>
                {fieldMap.map((f) => (
                  <th
                    key={f.key}
                    className="border px-2 py-1 text-center whitespace-nowrap"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="border px-2 py-1 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {editing === "new" && (
                <tr className="bg-green-100">
                  {fieldMap.map((f) => (
                    <td key={f.key} className="border px-1 py-0.5">
                      <input
                        type={f.key.includes("day") ? "date" : "text"}
                        name={f.key}
                        value={form[f.key] || ""}
                        onChange={handleChange}
                        className="w-full border px-1 py-0.5 text-sm"
                      />
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={handleSave}
                      className="text-green-600 mr-2 hover:underline"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-gray-600 hover:underline"
                    >
                      Huỷ
                    </button>
                  </td>
                </tr>
              )}

              {data.map((r) => (
                <tr
                  key={r._id}
                  className="even:bg-gray-50 hover:bg-blue-50 transition-colors duration-150"
                >
                  {fieldMap.map((f) => {
                    const isMoney = [
                      "phiGPS",
                      "DVmaychu",
                      "DVsimcard",
                      "camBienDau",
                      "camHT",
                      "suaChua",
                    ].includes(f.key);

                    const isDate = f.key.includes("day");

                    return (
                      <td
                        key={f.key}
                        className={`border px-2 py-1 ${
                          isMoney ? "text-right" : "text-left"
                        }`}
                      >
                        {editing === r._id ? (
                          <input
                            type={isDate ? "date" : "text"}
                            name={f.key}
                            value={
                              form[f.key] !== undefined
                                ? form[f.key]
                                : isMoney
                                ? 0
                                : ""
                            }
                            onChange={handleChange}
                            className="w-full border px-1 py-0.5 text-sm text-right"
                          />
                        ) : isMoney ? (
                          Number(r[f.key] || 0).toLocaleString("vi-VN")
                        ) : isDate && r[f.key] ? (
                          new Date(r[f.key]).toLocaleDateString("vi-VN")
                        ) : (
                          r[f.key]
                        )}
                      </td>
                    );
                  })}
                  <td className="border px-2 py-1 text-center">
                    {editing === r._id ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="text-green-600 mr-2 hover:underline"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:underline"
                        >
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
