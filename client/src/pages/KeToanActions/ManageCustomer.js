import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import CustomerModal from "../../components/CustomerModal";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API = "https://ctmq.onrender.com/api/customers";

export default function ManageCustomer() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const token = localStorage.getItem("token");
  const location = useLocation();
  const user = location.state?.user;
  const permissions = user.permissions || [];
  const canEditCustomer = permissions.includes("edit_customer"); 

  // 🔹 Lấy danh sách KH
  const fetch = async (search = "") => {
    try {
      const url = search ? `${API}?q=${encodeURIComponent(search)}` : API;
      const res = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách KH:", err.response?.data || err.message);
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  // 🔹 Import Excel
  const handleImportExcel = async () => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền thêm khách hàng!");
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
      alert(`Import thành công ${res.data.imported} khách hàng!`);
      setFile(null);
      fetch();
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
    }
  };

  // 🔹 Thêm / sửa
  const handleAdd = () => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền thêm khách hàng!");
    setEditCustomer(null);
    setShowModal(true);
  };
  const handleEdit = (c) => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền sửa khách hàng!");
    setEditCustomer(c);
    setShowModal(true);
  };

  // 🔹 Xóa
  const handleDelete = async (id) => {
    if (!canEditCustomer) return alert("Bạn chưa có quyền xóa khách hàng!");
    if (!window.confirm("Xác nhận xóa khách hàng này?")) return;
    try {
      await axios.delete(`${API}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setCustomers((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert("Không thể xoá: " + (err.response?.data?.error || err.message));
    }
  };

  // 🔹 Lưu lại khi thêm/sửa
  const handleSave = (saved) => {
    setCustomers((prev) => {
      const found = prev.find((p) => p._id === saved._id);
      if (found) return prev.map((p) => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  // 🔹 Xuất Excel
  const exportExcel = () => {
    if (!customers.length) return alert("Không có dữ liệu để xuất!");
    const headers = ["Tên KH", "Tên kế toán phụ trách", "Mã KH"];
    const data = customers.map((c) => ({
      "Tên KH": c.name || "",
      "Tên kế toán phụ trách": c.accountant || "",
      "Mã KH": c.code || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `customers_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-400 text-white px-3 py-1 rounded mb-4"
      >
        ← Quay lại
      </button>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Quản lý Khách hàng</h1>

        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, kế toán, mã KH..."
            className="border p-2 rounded"
          />
          <button
            onClick={() => fetch(q)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
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
            className="bg-green-500 px-3 py-1 text-white rounded"
          >
            + Thêm KH
          </button>
          <button
            onClick={exportExcel}
            className="bg-blue-600 px-3 py-1 text-white rounded"
          >
            Xuất Excel
          </button>

          {/* 👇 Import Excel */}
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
              <th className="border p-1">Mã KH</th>
              <th className="border p-1">Tên KH</th>
              <th className="border p-1">Tên kế toán phụ trách</th>
              <th className="border p-1">USERNAME</th>
              <th className="border p-1">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c._id}>
                <td className="border p-1 text-center">{c.code}</td>
                <td className="border p-1">{c.name}</td>
                <td className="border p-1">{c.accountant}</td>
                <td className="border p-1">{c.accUsername}</td>
                <td className="border p-1">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-blue-600"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-4 text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CustomerModal
          initialData={editCustomer}
          onClose={() => {
            setShowModal(false);
            setEditCustomer(null);
          }}
          onSave={handleSave}
          apiBase={API}
        />
      )}
    </div>
  );
}
