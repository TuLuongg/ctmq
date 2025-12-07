import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";

export default function TripPaymentModal({ maChuyenCode, onClose }) {
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CaNhan");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Load lịch sử thanh toán
  const loadPayments = async () => {
    if (!maChuyenCode) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/payment-history/trip/${maChuyenCode}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPayments(res.data);
    } catch (err) {
      console.error("Lỗi tải lịch sử thanh toán:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [maChuyenCode]);

  // Thêm thanh toán mới
  const handleAddPayment = async () => {
    if (!amount) return alert("Nhập số tiền!");
    try {
      const res = await axios.post(
        `${API}/payment-history/trip/add`,
        { maChuyenCode, amount: Number(amount), method, note },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAmount("");
      setNote("");
      setMethod("CaNhan");
      loadPayments(); // reload danh sách
    } catch (err) {
      console.error("Lỗi thêm thanh toán:", err);
      alert("Không thể thêm thanh toán");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow-lg w-[600px] max-h-[80vh] overflow-auto p-4">
        <h2 className="text-lg font-bold mb-4">Thanh toán chuyến {maChuyenCode}</h2>

        {/* Form thêm thanh toán */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Số tiền"
              className="border p-1 flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className="border p-1"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CaNhan">CaNhan</option>
              <option value="VCB">VCB</option>
              <option value="TCB">TCB</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Ghi chú"
            className="border p-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={handleAddPayment}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Thêm thanh toán
          </button>
        </div>

        {/* Danh sách thanh toán */}
        {loading ? (
          <p>Đang tải...</p>
        ) : payments.length === 0 ? (
          <p>Chưa có thanh toán nào.</p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-1">Ngày tạo</th>
                <th className="border p-1">Số tiền</th>
                <th className="border p-1">Phương thức</th>
                <th className="border p-1">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="border p-1">
                    {new Date(p.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="border p-1 text-right">{p.amount.toLocaleString()}</td>
                  <td className="border p-1">{p.method}</td>
                  <td className="border p-1">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-3 py-1 rounded"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
