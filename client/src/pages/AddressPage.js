import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API from "../api";

const LIMIT = 200;

export default function AddressPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false); // load bảng
  const [importing, setImporting] = useState(false); // import excel
  const [file, setFile] = useState(null);

  const [importMode, setImportMode] = useState("insert"); // insert | overwrite
  const [importResult, setImportResult] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [typingTimeout, setTypingTimeout] = useState(null);

  const fetchData = async (page, search = keyword) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/address`, {
        params: {
          page,
          limit: LIMIT,
          keyword: search || undefined,
        },
      });

      setAddresses(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      alert("Lỗi tải danh sách địa chỉ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const handleImport = async () => {
    if (!file || importing) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", importMode);

    try {
      setImporting(true);
      setImportResult(null);

      const res = await axios.post(`${API}/address/import-excel`, formData);

      setImportResult(res.data);

      setFile(null);
      setPage(1);
      fetchData(1);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi import Excel");
    } finally {
      setImporting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Xoá TOÀN BỘ địa chỉ?")) return;

    try {
      setLoading(true);
      await axios.delete(`${API}/address/clear`);
      alert("Đã xoá toàn bộ");
      setPage(1);
      fetchData(1);
    } catch (err) {
      alert("Lỗi xoá địa chỉ");
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
      <h1 className="text-xl font-semibold mb-4">Danh sách địa chỉ</h1>

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-4 rounded shadow">
        <input
          type="text"
          placeholder="Tìm địa chỉ / ghi chú..."
          value={keyword}
          onChange={(e) => {
            const value = e.target.value;
            setKeyword(value);

            if (typingTimeout) clearTimeout(typingTimeout);

            const timeout = setTimeout(() => {
              setPage(1);
              fetchData(1, value);
            }, 300);

            setTypingTimeout(timeout);
          }}
          className="border rounded px-3 py-2 text-xs w-64"
        />

        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={importing}
          onChange={(e) => setFile(e.target.files[0])}
          className="text-xs"
        />

        <select
          value={importMode}
          onChange={(e) => setImportMode(e.target.value)}
          disabled={importing}
          className="border rounded px-2 py-1 text-xs"
        >
          <option value="insert">Thêm mới</option>
          <option value="overwrite">Ghi đè</option>
        </select>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className={`px-4 py-2 rounded text-xs text-white
            ${importing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}
          `}
        >
          {importing ? "Đang import..." : "Import Excel"}
        </button>
        {importResult && (
          <div className="text-xs bg-green-50 border border-green-200 rounded p-3">
            <div className="font-semibold text-green-700">
              {importResult.message}
            </div>

            <div className="mt-1 text-gray-700">
              {importResult.inserted !== undefined && (
                <div>✔ Thêm mới: {importResult.inserted}</div>
              )}
              {importResult.updated !== undefined && (
                <div>♻ Ghi đè: {importResult.updated}</div>
              )}
              {importResult.skipped !== undefined && (
                <div className="text-orange-600">
                  ⚠ Bỏ qua (trùng): {importResult.skipped}
                </div>
              )}
              <div>Tổng xử lý: {importResult.total}</div>
            </div>
          </div>
        )}

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
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-center w-1/6">ĐỊA CHỈ CŨ</th>
            <th className="border px-3 py-2 text-center w-1/6">ĐỊA CHỈ MỚI</th>
            <th className="border px-3 py-2 text-center w-4/6">GHI CHÚ</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} className="text-center py-8 text-gray-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : addresses.length ? (
            addresses.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50 align-top">
                <td className="border px-3 py-2 break-words">{item.diaChi}</td>
                <td className="border px-3 py-2 break-words text-blue-700">
                  {item.diaChiMoi || ""}
                </td>
                <td className="border px-3 py-2 break-words text-gray-700">
                  {item.ghiChu || ""}
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

      {/* PAGINATION */}
      <div className="flex justify-center items-center gap-3 mt-5">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          ‹
        </button>

        <span className="text-xs text-gray-600">
          Trang {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
