import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function TripListModal({ customer, onClose }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const debtCode = customer?.debtCode;

const loadTrips = async () => {
  if (!debtCode) {
    setTrips([]);
    return;
  }

  setLoading(true);
  try {
    const res = await axios.get(
      `${API}/payment-history/debt-period/${debtCode}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setTrips(res.data.trips || []);
    console.log("Trips:", res.data.trips);
  } catch (err) {
    console.error("Lỗi load trips", err);
    setTrips([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtCode]);

  const pick = (bs, base) => {
  const bsVal = parseFloat(bs);
  if (!isNaN(bsVal) && bsVal !== 0) return bsVal;
  return parseFloat(base) || 0;
};


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[10px]">
      <div className="bg-white rounded-xl w-[95vw] max-w-[1400px] max-h-[90vh] p-5 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">
  Danh sách chuyến — KH {customer?.maKH} ({customer?.debtCode})
</h2>

          <button onClick={onClose} className="text-red-500 font-semibold">✕</button>
        </div>

        <div className="overflow-auto border rounded-lg" style={{ maxHeight: "70vh" }}>
          {loading ? (
            <div className="p-4">Đang tải...</div>
          ) : !debtCode ? (
            <div className="p-4 text-gray-500">Không có mã khách để hiện chuyến.</div>
          ) : trips.length === 0 ? (
            <div className="p-4 text-gray-500">Không có chuyến cho mã này.</div>
          ) : (
            <table className="w-full text-xs min-w-[1500px]">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="p-2 border">Tên lái xe</th>
                  <th className="p-2 border">Mã KH</th>
                  <th className="p-2 border">Khách hàng</th>
                  <th className="p-2 border">Diễn giải</th>
                  <th className="p-2 border">Ngày đóng</th>
                  <th className="p-2 border">Ngày giao</th>
                  <th className="p-2 border">Đóng hàng</th>
                  <th className="p-2 border">Giao hàng</th>
                  <th className="p-2 border">Điểm</th>
                  <th className="p-2 border">Trọng lượng</th>
                  <th className="p-2 border">Biển số xe</th>
                  <th className="p-2 border">Mã chuyến</th>
                  <th className="p-2 border">Tổng tiền</th>
                  <th className="p-2 border">Đã thanh toán</th>
                  <th className="p-2 border">Còn lại</th>
                  <th className="p-2 border">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const tongTien =
  pick(t.cuocPhiBS, t.cuocPhi) +
  pick(t.bocXepBS, t.bocXep) +
  pick(t.veBS, t.ve) +
  pick(t.hangVeBS, t.hangVe) +
  pick(t.luuCaBS, t.luuCa) +
  pick(t.cpKhacBS, t.luatChiPhiKhac);

const paid = parseFloat(t.daThanhToan || 0);
const remain = tongTien - paid;


                  return (
                    <tr key={t._id}>
                      <td className="p-2 border">{t.tenLaiXe}</td>
                      <td className="p-2 border">{t.maKH}</td>
                      <td className="p-2 border">{t.khachHang}</td>
                      <td className="p-2 border">{t.dienGiai}</td>
                      <td className="p-2 border">{t.ngayBocHang ? new Date(t.ngayBocHang).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-2 border">{t.ngayGiaoHang ? new Date(t.ngayGiaoHang).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-2 border">{t.diemXepHang}</td>
                      <td className="p-2 border">{t.diemDoHang}</td>
                      <td className="p-2 border">{t.soDiem}</td>
                      <td className="p-2 border">{t.trongLuong}</td>
                      <td className="p-2 border">{t.bienSoXe}</td>
                      <td className="p-2 border">{t.maChuyen}</td>
                      <td className="p-2 border font-semibold text-blue-600">
                        {tongTien.toLocaleString()}
                      </td>

                      <td className="p-2 border">{paid.toLocaleString()}</td>

                      <td className="p-2 border font-semibold text-red-600">
                        {remain.toLocaleString()}
                      </td>

                      <td className="p-2 border">
                        {paid >= tongTien ? "Đủ" : "Thiếu"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
