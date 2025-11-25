import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import DriverModal from "../../components/DriverModal";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API = "http://localhost:4000/api/drivers";

export default function ManageDriver() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user = location.state?.user;
  const permissions = user?.permissions || [];
  const canEditDriver = permissions.includes("edit_driver");

  // 🔹 Cột hiển thị
  const allColumns = [
    { key: "name", label: "Họ tên lái xe" },
    { key: "nameZalo", label: "Tên Zalo" },
    { key: "birthYear", label: "Ngày sinh" },
    { key: "company", label: "Đơn vị" },
    { key: "bsx", label: "Biển số xe" },
    { key: "phone", label: "SĐT" },
    { key: "hometown", label: "Quê quán" },
    { key: "resHometown", label: "HKTT" },
    { key: "address", label: "Nơi ở hiện tại" },
    { key: "cccd", label: "CCCD" },
    { key: "cccdIssuedAt", label: "Ngày cấp CCCD" },
    { key: "cccdExpiryAt", label: "Ngày hết hạn CCCD" },
    { key: "licenseImageCCCD", label: "Ảnh CCCD" },
    { key: "licenseClass", label: "Hạng BL" },
    { key: "licenseIssuedAt", label: "Ngày cấp BL" },
    { key: "licenseExpiryAt", label: "Ngày hết hạn BL" },
    { key: "licenseImage", label: "Ảnh BL" },
    { key: "numberHDLD", label: "Số HĐLĐ" },
    { key: "dayStartWork", label: "Ngày vào làm" },
    { key: "dayEndWork", label: "Ngày nghỉ" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(allColumns.map(c => c.key));

  const fetch = async (search = "") => {
    try {
      const url = search ? `${API}?q=${encodeURIComponent(search)}` : API;
      const res = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setDrivers(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy drivers:", err.response?.data || err.message);
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  // 🔹 Thêm / Sửa / Xóa
  const handleAdd = () => {
    if (!canEditDriver) return alert("Bạn chưa có quyền thêm lái xe!");
    setEditDriver(null);
    setShowModal(true);
  };

  const handleEdit = (d) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền sửa lái xe!");
    setEditDriver(d);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền xóa lái xe!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${API}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setDrivers(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = (saved) => {
    setDrivers(prev => {
      const found = prev.find(p => p._id === saved._id);
      if (found) return prev.map(p => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  // 🔹 Import Excel
  const handleImportExcel = async () => {
    if (!canEditDriver) return alert("Bạn chưa có quyền import lái xe!");
    if (!file) return alert("Vui lòng chọn file Excel!");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      alert(`Import thành công ${res.data.imported} lái xe!`);
      setFile(null);
      fetch();
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
    }
  };

  // 🔹 Export Excel
  const exportExcel = () => {
    if (!drivers.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns.map(c => c.label);
    const data = drivers.map(d => {
      const row = {};
      allColumns.forEach(c => {
        if (c.key.endsWith("At") || c.key === "dayStartWork" || c.key === "dayEndWork") {
          row[c.label] = d[c.key] ? format(new Date(d[c.key]), "dd/MM/yyyy") : "";
        } else if (c.key === "licenseImage") {
          row[c.label] = d[c.key] ? `${window.location.origin}${d[c.key]}` : "";
        } else {
          row[c.label] = d[c.key] || "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `drivers_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    );
  };

  // 🔹 Lọc
  const filteredDrivers = drivers.filter(d =>
    d.name?.toLowerCase().includes(q.toLowerCase()) ||
    d.phone?.toLowerCase().includes(q.toLowerCase()) ||
    d.cccd?.toLowerCase().includes(q.toLowerCase())
  );

  const displayDrivers = filteredDrivers.sort((a, b) => {
    const companyA = (a.company || "").toLowerCase();
    const companyB = (b.company || "").toLowerCase();
    if (companyA === "ct minh quân" && companyB !== "ct minh quân") return -1;
    if (companyA !== "ct minh quân" && companyB === "ct minh quân") return 1;
    return 0;
  });

  // 🔹 Toggle cột
  const toggleColumn = (key) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <button onClick={() => navigate(-1)} className="bg-gray-400 text-white px-3 py-1 rounded">
        ← Quay lại
      </button>

      <div className="flex justify-between items-center mb-4 mt-2">
        <h1 className="text-xl font-bold">Quản lý Lái xe</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, sđt, cccd..."
            className="border p-2 rounded"
          />
          <button onClick={() => fetch(q)} className="bg-blue-500 text-white px-3 py-1 rounded">
            Tìm
          </button>
          <button
            onClick={() => {
              setQ("");
              fetch();
            }}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            Reset
          </button>
          <button
            onClick={handleAdd}
            className={`bg-green-500 px-3 py-1 text-white rounded ${
              !canEditDriver ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canEditDriver}
          >
            + Thêm
          </button>
          <button onClick={exportExcel} className="bg-blue-600 px-3 py-1 text-white rounded">
            Xuất Excel
          </button>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-1 rounded"
          />
          <button
            onClick={handleImportExcel}
            className={`bg-purple-600 text-white px-3 py-1 rounded ${
              !canEditDriver || importing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canEditDriver || importing}
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* 🔹 Chọn cột hiển thị */}
      <div className="mb-3 flex flex-wrap gap-2">
        {allColumns.map(c => (
          <label key={c.key} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.includes(c.key)}
              onChange={() => toggleColumn(c.key)}
            />
            {c.label}
          </label>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-1">#</th>
              {allColumns
                .filter(c => visibleColumns.includes(c.key))
                .map(c => (
                  <th key={c.key} className="border p-1">{c.label}</th>
                ))}
              <th className="border p-1">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {displayDrivers.map((d, idx) => (
              <tr key={d._id}>
                <td className="border p-1 text-center">{idx + 1}</td>
                {allColumns
                  .filter(c => visibleColumns.includes(c.key))
                  .map(c => (
                    <td key={c.key} className="border p-1">
                      {c.key.endsWith("At") || c.key === "dayStartWork" || c.key === "dayEndWork"
                        ? d[c.key] ? format(new Date(d[c.key]), "dd/MM/yyyy") : ""
                        : c.key === "licenseImage"
                        ? d[c.key] && <a target="_blank" rel="noreferrer" href={`${window.location.origin}${d[c.key]}`}>Xem</a>
                        : d[c.key] || ""}
                    </td>
                  ))}
                <td className="border p-1 flex gap-2 justify-center">
                  {canEditDriver ? (
                    <>
                      <button onClick={() => handleEdit(d)} className="text-blue-600">Sửa</button>
                      <button onClick={() => handleDelete(d._id)} className="text-red-600">Xóa</button>
                    </>
                  ) : (
                    <span className="text-gray-400">Không có quyền</span>
                  )}
                </td>
              </tr>
            ))}
            {displayDrivers.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="text-center p-4 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <DriverModal
          initialData={editDriver}
          onClose={() => { setShowModal(false); setEditDriver(null); }}
          onSave={handleSave}
          apiBase={API}
        />
      )}
    </div>
  );
}
