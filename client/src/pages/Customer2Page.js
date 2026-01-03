import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from "../api";

export default function Customer2Page() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false); // load bảng
  const [importing, setImporting] = useState(false); // import excel
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/customer2/all`);
      setCustomers(res.data.data || []);
    } catch (err) {
      alert("Lỗi tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || importing) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setImporting(true);
      await axios.post(`${API}/customer2/import-excel`, formData);
      alert("Import thành công");

      setFile(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi import Excel");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá khách hàng này?")) return;

    try {
      setLoading(true);
      await axios.delete(`${API}/customer2/${id}`);
      fetchData();
    } catch (err) {
      alert("Lỗi xoá khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("⚠️ Xoá TOÀN BỘ khách hàng?")) return;

    try {
      setLoading(true);
      await axios.delete(`${API}/customer2/clear`);
      alert("Đã xoá toàn bộ khách hàng");
      fetchData();
    } catch (err) {
      alert("Lỗi xoá dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex gap-2 items-center mb-4">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white text-xs bg-blue-500"
        >
          Trang chính
        </button>
      </div>

      <h1 className="text-xl font-semibold mb-4">Danh sách khách hàng</h1>

      {/* ACTION BAR */}
      <div className="flex flex-wrap justify-center items-center gap-3 mb-4 bg-white p-4 rounded shadow">
        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={importing}
          onChange={(e) => setFile(e.target.files[0])}
          className="text-xs"
        />

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className={`px-4 py-2 rounded text-xs text-white
            ${importing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}
          `}
        >
          {importing ? "Đang import..." : "Import Excel"}
        </button>

        <button
          onClick={handleClear}
          disabled={loading || importing}
          className="px-4 py-2 rounded text-xs text-red-600 border border-red-300 hover:bg-red-50 disabled:opacity-50"
        >
          Xoá tất cả
        </button>

        {importing && (
          <span className="text-xs text-gray-500 italic">
            Vui lòng chờ import hoàn tất…
          </span>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-auto flex justify-center">
        <table className="w-1/2 border-collapse text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-center w-16">#</th>
              <th className="border px-3 py-2 text-left">TÊN KHÁCH HÀNG</th>
              <th className="border px-3 py-2 text-center w-24">HÀNH ĐỘNG</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : customers.length ? (
              customers.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 text-center">{index + 1}</td>
                  <td className="border px-3 py-2 break-words">
                    {item.nameKH}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:underline"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
