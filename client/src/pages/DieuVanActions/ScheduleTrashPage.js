import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API from "../../api";


const API_URL = `${API}/schedule-admin`;

export default function ScheduleTrashPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");

  // Tải danh sách
  const loadTrash = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/trash/list`, {
        params: { page, limit: 50, search },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setData(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);

      setLoading(false);
    } catch (err) {
      console.error("Lỗi lấy thùng rác:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, [page, search]);

  // Chọn nhiều
  const toggleSelect = (maChuyen) => {
    setSelected((prev) =>
      prev.includes(maChuyen)
        ? prev.filter((m) => m !== maChuyen)
        : [...prev, maChuyen]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === data.length) setSelected([]);
    else setSelected(data.map((d) => d.maChuyen));
  };

  // Khôi phục
const handleRestore = async () => {
  if (selected.length === 0) return alert("Chưa chọn chuyến");
  if (!window.confirm("Khôi phục các chuyến đã chọn?")) return;

  try {
    const res = await axios.post(
      `${API_URL}/trash/restore`,
      { maChuyenList: selected },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    alert(res.data.message || "Khôi phục thành công!");
    loadTrash();
    setSelected([]);
  } catch (err) {
    console.error("Lỗi khôi phục:", err);
    alert(err.response?.data?.error || "Lỗi khi khôi phục!");
  }
};


  // Xoá vĩnh viễn
const handleDeletePermanent = async () => {
  if (selected.length === 0) return alert("Chưa chọn chuyến");
  if (!window.confirm("Xoá VĨNH VIỄN các chuyến này? Không thể hoàn tác!"))
    return;

  try {
    const res = await axios.delete(`${API_URL}/trash/force`, {
      data: { maChuyenList: selected },
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    alert(res.data.message || "Đã xoá vĩnh viễn!");
    loadTrash();
    setSelected([]);
  } catch (err) {
    console.error("Lỗi xoá vĩnh viễn:", err);
    alert(err.response?.data?.error || "Lỗi khi xoá vĩnh viễn!");
  }
};


  return (
    <div className="p-4 text-xs">
      <div className="flex gap-2 items-center mb-4">
        <button onClick={() => navigate("/tonghop")} className="px-3 py-1 rounded text-white bg-blue-500">Quay lại trang tổng hợp</button>
      </div>
      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-4 text-red-600">
        DANH SÁCH CHUYẾN ĐÃ XOÁ
      </h1>

      {/* SEARCH */}
      <div className="mb-3 flex">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã chuyến hoặc tài xế..."
          className="border p-2 rounded w-80"
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={handleRestore}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ♻️ Khôi phục
        </button>

        <button
          onClick={handleDeletePermanent}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          ❌ Xóa vĩnh viễn
        </button>
      </div>

{/* TABLE */}
<div className="border rounded overflow-x-auto" style={{ maxHeight: "600px", overflowY: "auto" }}>
  <table className="min-w-full border">
    <thead className="bg-gray-200 sticky top-0 z-10">
      <tr>
        <th className="p-2 border">
          <input
            type="checkbox"
            checked={selected.length === data.length}
            onChange={toggleSelectAll}
          />
        </th>
        <th className="p-2 border">MÃ CHUYẾN</th>
        <th className="p-2 border">MÃ KH</th>
        <th className="p-2 border">KHÁCH HÀNG</th>
        <th className="p-2 border">DIỄN GIẢI</th>
        <th className="p-2 border">NGÀY BỐC HÀNG</th>
        <th className="p-2 border">NGÀY GIAO HÀNG</th>
        <th className="p-2 border">ĐIỂM XẾP HÀNG</th>
        <th className="p-2 border">ĐIỂM DỠ HÀNG</th>
        <th className="p-2 border">SỐ ĐIỂM</th>
        <th className="p-2 border">TRỌNG LƯỢNG</th>
        <th className="p-2 border">TÊN LÁI XE</th>
        <th className="p-2 border">BIỂN SỐ XE</th>
        <th className="p-2 border">CƯỚC PHÍ</th>
        <th className="p-2 border">CÒN LẠI</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="20" className="text-center p-4">
            Đang tải...
          </td>
        </tr>
      ) : data.length === 0 ? (
        <tr>
          <td colSpan="20" className="text-center p-4">
            Không có chuyến nào trong thùng rác
          </td>
        </tr>
      ) : (
        data.map((item) => (
          <tr key={item.maChuyen} className="hover:bg-gray-50">
            <td className="p-2 border text-center">
              <input
                type="checkbox"
                checked={selected.includes(item.maChuyen)}
                onChange={() => toggleSelect(item.maChuyen)}
              />
            </td>
            <td className="p-2 border">{item.maChuyen}</td>
            <td className="p-2 border">{item.maKH}</td>
            <td className="p-2 border">{item.khachHang}</td>
            <td className="p-2 border">{item.dienGiai}</td>
            <td className="p-2 border">
              {item.ngayBocHang
                ? new Date(item.ngayBocHang).toLocaleDateString("vi-VN")
                : ""}
            </td>
            <td className="p-2 border">
              {item.ngayGiaoHang
                ? new Date(item.ngayGiaoHang).toLocaleDateString("vi-VN")
                : ""}
            </td>
            <td className="p-2 border">{item.diemXepHang}</td>
            <td className="p-2 border">{item.diemDoHang}</td>
            <td className="p-2 border">{item.soDiem}</td>
            <td className="p-2 border">{item.trongLuong}</td>
            <td className="p-2 border">{item.tenLaiXe}</td>
            <td className="p-2 border">{item.bienSoXe}</td>
            <td className="p-2 border">{item.cuocPhi}</td>
            <td className="p-2 border text-red-600">{item.daysLeft} ngày</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>


      {/* PAGINATION */}
      <div className="flex justify-center mt-4 gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          ← Trước
        </button>

        <span className="px-3 py-1">
          Trang {page}/{totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Sau →
        </button>
      </div>
    </div>
  );
}
