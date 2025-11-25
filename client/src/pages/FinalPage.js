import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function FinalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data) {
    return (
      <div className="p-4">
        <h2>Không có dữ liệu để hiển thị.</h2>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => navigate("/user")}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const columns = [
    "Biển số xe",
    "Tên khách hàng",
    "Giấy tờ (Có/Không)",
    "Nơi đi",
    "Nơi đến",
    "Trọng lượng hàng",
    "Số điểm",
    "2 chiều & lưu ca (Ghi rõ số lượng hàng trả về)",
    "Ăn",
    "Tăng ca",
    "Bốc xếp",
    "Vé",
    "Tiền chuyến (2+3+4+5 nếu có)",
    "Chi phí khác (Ghi rõ)",
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Xác nhận dữ liệu đã gửi</h1>

      <div className="mb-4">
        <p>
          <strong>Tên lái xe:</strong> {data.tenLaiXe}
        </p>
        <p>
          <strong>Ngày đi:</strong> {new Date(data.ngayDi).toLocaleString()}
        </p>
        <p>
          <strong>Ngày về:</strong> {new Date(data.ngayVe).toLocaleString()}
        </p>
        <p>
          <strong>Tổng tiền lịch trình:</strong> {data.tongTienLichTrinh}
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">Danh sách chuyến</h2>

      <table className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border-r px-4 py-2 text-left">STT</th>
            {columns.map((column, colIndex) => (
              <th key={colIndex} className="border-r px-4 py-2 text-left">
                {column}
              </th>
            ))}
            <th className="border-r px-4 py-2 text-left">Tiền thu khách</th>
            <th className="px-4 py-2 text-left">Phương án</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index}>
              <td className="border-t border-r px-4 py-2">{index + 1}</td>
              {row.values.map((val, i) => (
                <td key={i} className="border-t border-r px-4 py-2">
                  {val}
                </td>
              ))}
              <td className="border-t border-r px-4 py-2">
                {row.laiXeThuKhach}
              </td>
              <td className="border-t px-4 py-2">{row.phuongAn}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => navigate("/user")}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Quay lại trang nhập
      </button>
    </div>
  );
}

export default FinalPage;
