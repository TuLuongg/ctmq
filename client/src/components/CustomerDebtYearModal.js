import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";

export default function CustomerDebtYearModal({
  customer,
  year,
  token,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    if (!customer?.maKH || !year) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API}/payment-history/customer/${customer.maKH}/debt-periods-by-year?year=${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPeriods(res.data || []);
      } catch (err) {
        console.error(err);
        alert("Không lấy được kỳ công nợ theo năm");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customer, year, token]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white w-[1100px] max-h-[80vh] rounded p-4 overflow-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">
            Công nợ năm {year} – {customer.tenKH} ({customer.maKH})
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-400 text-white rounded"
          >
            Đóng
          </button>
        </div>

        {/* TABLE */}
        <div className="border overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                <th className="border p-2">Mã CN</th>
                <th className="border p-2">Kỳ</th>
                <th className="border p-2">Từ ngày</th>
                <th className="border p-2">Đến ngày</th>
                <th className="border p-2">Hoá đơn</th>
                <th className="border p-2">Tiền mặt</th>
                <th className="border p-2">Khác</th>
                <th className="border p-2">VAT</th>
                <th className="border p-2">Tổng tiền</th>
                <th className="border p-2">Đã TT</th>
                <th className="border p-2">Còn lại</th>
                <th className="border p-2">Trạng thái</th>
                <th className="border p-2">Khoá</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12} className="text-center p-4">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}

              {!loading && periods.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center p-4 text-gray-500">
                    Không có kỳ công nợ
                  </td>
                </tr>
              )}

              {periods.map((p) => {
                let color = "bg-green-500";
                if (p.remainAmount > 0) {
                  const rate =
                    p.totalAmount === 0
                      ? 0
                      : p.remainAmount / p.totalAmount;
                  color = rate <= 0.2 ? "bg-yellow-400" : "bg-red-500";
                }

                return (
                  <tr key={p.debtCode}>
                    <td className="border p-2 font-mono">{p.debtCode}</td>
                    <td className="border p-2">{p.manageMonth}</td>
                    <td className="border p-2">
                      {new Date(p.fromDate).toLocaleDateString()}
                    </td>
                    <td className="border p-2">
                      {new Date(p.toDate).toLocaleDateString()}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(p.totalAmountInvoice || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(p.totalAmountCash || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(p.totalOther || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center">
                      {p.vatPercent || 0}%
                    </td>
                    <td className="border p-2 text-right font-bold">
                      {Number(p.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(p.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-right text-red-600 font-bold">
                      {Number(p.remainAmount || 0).toLocaleString()}
                    </td>
                    <td className="border p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${color}`}
                        ></span>
                        <span>
                          {p.status === "HOAN_TAT"
                            ? "Hoàn tất"
                            : p.status === "TRA_MOT_PHAN"
                            ? "Trả một phần"
                            : "Chưa trả"}
                        </span>
                      </div>
                    </td>
                    <td className="border p-2 text-center">
                      {p.isLocked ? "Đóng" : "Mở"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
