import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function PaymentHistoryModal({
  debtCode,
  customerCode,
  onClose,
  onPaymentAdded,
}) {
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cá nhân");
  const [note, setNote] = useState("");
  const token = localStorage.getItem("token");

  const displayMap = {
    CaNhan: "Cá nhân",
    VCB: "VCB Công ty",
    TCB: "TCB Công ty",
  };

  const methodMap = {
    "Cá nhân": "CaNhan",
    "VCB công ty": "VCB",
    "TCB công ty": "TCB",
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(
        `${API}/payment-history/receipt/${customerCode}/${debtCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setHistory(res.data);
    } catch (err) {
      console.error("Lỗi load history", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [customerCode]);

  const addPayment = async () => {
    if (!amount) return alert("Nhập số tiền!");

    try {
      await axios.post(
        `${API}/payment-history/add-receipt`, // Gọi đúng API backend addPaymentReceipt
        {
          debtCode,
          customerCode,
          amount: parseFloat(amount),
          method: methodMap[method],
          note,
          createdBy: localStorage.getItem("username") || "unknown",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 🔹 reload danh sách công nợ
      if (onPaymentAdded) onPaymentAdded();

      setAmount("");
      setNote("");
      loadHistory();
    } catch (err) {
      console.error("Lỗi thêm thanh toán", err);
      alert(err.response?.data?.error || "Không thể thêm thanh toán");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[700px] max-h-[90vh] p-5 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">
            Lịch sử thanh toán — KH {customerCode}
          </h2>
          <button onClick={onClose} className="text-red-500 font-semibold">
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="number"
            placeholder="Số tiền"
            className="border p-2 flex-1 rounded"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <select
            className="border p-2 rounded"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>Cá nhân</option>
            <option>VCB công ty</option>
            <option>TCB công ty</option>
          </select>

          <input
            type="text"
            placeholder="Ghi chú"
            className="border p-2 flex-1 rounded"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white px-4 rounded"
            onClick={addPayment}
          >
            Thêm
          </button>
        </div>

        <div
          className="overflow-y-auto border rounded-lg"
          style={{ maxHeight: "60vh" }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="p-2 border">Ngày</th>
                <th className="p-2 border">Số tiền</th>
                <th className="p-2 border">Phương thức</th>
                <th className="p-2 border">Ghi chú</th>
                <th className="p-2 border">Chi tiết kỳ đã trừ</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.receiptId}>
                  <td className="p-2 border">
                    {new Date(h.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-2 border font-semibold text-blue-600">
                    {h.amount.toLocaleString()}
                  </td>
                  <td className="p-2 border">
                    {displayMap[h.method] || h.method}
                  </td>
                  <td className="p-2 border">{h.note}</td>
                  <td className="p-2 border">
                    {h.allocations.map((a, idx) => (
                      <div key={idx} className="mb-1">
                        {a.debtCode || "?"}: {a.amount?.toLocaleString() || 0}{" "}
                        (Còn lại: {a.remainAmountAfter?.toLocaleString() || 0})
                      </div>
                    ))}
                  </td>
                  {/* Nút xoá phiếu thu */}
                  <td className="p-2 border text-center">
                    <button
                      className="text-red-500 font-bold"
                      onClick={async () => {
                        if (
                          !window.confirm("Bạn có chắc muốn huỷ phiếu thu này?")
                        )
                          return;
                        try {
                          await axios.delete(
                            `${API}/payment-history/receipt/${h.receiptId}`,
                            {
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                          alert("Đã huỷ phiếu thu");
                          loadHistory(); // reload lịch sử
                          if (onPaymentAdded) onPaymentAdded(); // reload bảng công nợ ở cha nếu có
                        } catch (err) {
                          console.error(err);
                          alert(
                            err.response?.data?.error ||
                              "Không thể huỷ phiếu thu"
                          );
                        }
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
