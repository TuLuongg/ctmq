import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import VehicleModal from "../../components/VehicleModal";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API = "https://ctmq.onrender.com/api/vehicles";

export default function ManageVehicle() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const location = useLocation();
  const user = location.state?.user;
  const permissions = user.permissions || [];
  const canEditVehicle = permissions.includes("edit_vehicle"); 

  const fetch = async (search = "") => {
    try {
      const url = search ? `${API}?q=${encodeURIComponent(search)}` : API;
      const res = await axios.get(url);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy vehicles:", err);
      setVehicles([]);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleImportExcel = async () => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền thêm xe!");
    if (!file) return alert("Vui lòng chọn file Excel!");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`Import thành công ${res.data.imported || 0} xe!`);
      fetch();
      setFile(null);
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = () => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền thêm xe!");
    setEditVehicle(null);
    setShowModal(true);
  };

  const handleEdit = (v) => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền sửa xe!");
    setEditVehicle(v);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditVehicle) return alert("Bạn chưa có quyền xóa xe!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = (saved) => {
    setVehicles((prev) => {
      const found = prev.find((v) => v._id === saved._id);
      if (found) return prev.map((v) => (v._id === saved._id ? saved : v));
      return [saved, ...prev];
    });
  };

  const exportExcel = () => {
    if (!vehicles.length) return alert("Không có dữ liệu để xuất");
    const headers = [
      "Biển số",
      "Đơn vị",
      "Loại xe",
      "Dài",
      "rộng",
      "cao",
      "ĐỊNH MỨC",
      "Ảnh đăng ký",
      "Ảnh đăng kiểm",
    ];
    const data = vehicles.map((v) => ({
      "Biển số": v.plateNumber || "",
      "Đơn vị": v.company || "",
      "Loại xe": v.vehicleType || "",
      "Dài": v.length || "",
      "rộng": v.width || "",
      "cao": v.height || "",
      "ĐỊNH MỨC": v.norm || "",
      "Ảnh đăng ký": v.registrationImage ? `${window.location.origin}${v.registrationImage}` : "",
      "Ảnh đẳng kiếm": v.inspectionImage ? `${window.location.origin}${v.inspectionImage}` : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `vehicles_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    );
  };

  const filtered = vehicles
  .filter(
    (v) =>
      v.plateNumber?.toLowerCase().includes(q.toLowerCase()) ||
      v.company?.toLowerCase().includes(q.toLowerCase()) ||
      v.vehicleType?.toLowerCase().includes(q.toLowerCase())
  )
  .sort((a, b) => {
    // Đưa xe công ty "Minh Quân" lên đầu
    if (a.company === "Minh Quân" && b.company !== "Minh Quân") return -1;
    if (a.company !== "Minh Quân" && b.company === "Minh Quân") return 1;
    return 0; // giữ nguyên thứ tự cho các xe khác
  });


  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-400 text-white px-3 py-1 rounded mb-2"
      >
        ← Quay lại
      </button>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Quản lý Xe</h1>

        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm biển số, đơn vị, loại..."
            className="border p-2 rounded"
          />
          <button onClick={() => fetch(q)} className="bg-blue-500 text-white px-3 py-1 rounded">
            Tìm
          </button>
          <button onClick={() => { setQ(""); fetch(); }} className="bg-gray-200 px-3 py-1 rounded">
            Reset
          </button>
          <button onClick={handleAdd} className="bg-green-500 px-3 py-1 text-white rounded">
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
              importing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={importing}
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-1">STT</th>
              <th className="border p-1">Biển số xe</th>
              <th className="border p-1">Đơn vị Vận tải</th>
              <th className="border p-1">Loại xe</th>
              <th className="border p-1">Dài</th>
              <th className="border p-1">Rộng</th>
              <th className="border p-1">Cao</th>
              <th className="border p-1">Định mức</th>
              <th className="border p-1">Ảnh đăng ký</th>
              <th className="border p-1">Ảnh đăng kiểm</th>
              <th className="border p-1">Hành động</th>
            </tr>
          </thead>
<tbody>
  {filtered.map((v, idx) => (
    <tr key={v._id}>
      <td className="border p-1 text-center">{idx + 1}</td>
      <td className="border p-1 text-center">{v.plateNumber}</td>
      <td className="border p-1 text-center">{v.company}</td>
      <td className="border p-1 text-center">{v.vehicleType}</td>
      <td className="border p-1 text-center">{v.length}</td>
      <td className="border p-1 text-center">{v.width}</td>
      <td className="border p-1 text-center">{v.height}</td>
      <td className="border p-1 text-center">{v.norm}</td>

      {/* Ảnh đăng ký */}
      <td className="border p-1">
        <div className="flex justify-center items-center">
          {v.registrationImage ? (
            <img
              src={v.registrationImage}
              alt="Đăng ký xe"
              className="w-36 h-24 object-cover rounded"
            />
          ) : (
            "-"
          )}
        </div>
      </td>

      {/* Ảnh đăng kiểm */}
      <td className="border p-1">
        <div className="flex justify-center items-center">
          {v.inspectionImage ? (
            <img
              src={v.inspectionImage}
              alt="Đăng kiểm xe"
              className="w-36 h-24 object-cover rounded"
            />
          ) : (
            "-"
          )}
        </div>
      </td>

      {/* Hành động */}
      <td className="border p-1">
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handleEdit(v)}
            className="bg-yellow-400 px-3 py-1 text-white rounded"
          >
            Sửa
          </button>
          <button
            onClick={() => handleDelete(v._id)}
            className="bg-red-600 px-3 py-1 text-white rounded"
          >
            Xóa
          </button>
        </div>
      </td>
    </tr>
  ))}

  {filtered.length === 0 && (
    <tr>
      <td colSpan={7} className="text-center p-4 text-gray-500">
        Không có dữ liệu
      </td>
    </tr>
  )}
</tbody>



        </table>
      </div>

      {showModal && (
        <VehicleModal
          initialData={editVehicle}
          onClose={() => { setShowModal(false); setEditVehicle(null); }}
          onSave={handleSave}
          apiBase={API}
        />
      )}
    </div>
  );
}
