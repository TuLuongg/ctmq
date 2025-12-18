import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

function numberToVietnameseText(num) {
  if (!num || isNaN(num)) return "";

  const units = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];

  function readTriple(n) {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let result = "";

    if (hundred > 0) {
      result += units[hundred] + " trăm";
      if (ten === 0 && unit > 0) result += " lẻ";
    }

    if (ten > 1) {
      result += " " + units[ten] + " mươi";
      if (unit === 1) result += " mốt";
      else if (unit === 5) result += " lăm";
      else if (unit > 0) result += " " + units[unit];
    } else if (ten === 1) {
      result += " mười";
      if (unit === 5) result += " lăm";
      else if (unit > 0) result += " " + units[unit];
    } else if (ten === 0 && unit > 0 && hundred === 0) {
      result += units[unit];
    }

    return result.trim();
  }

  const levels = ["", " nghìn", " triệu", " tỷ"];
  let text = "";
  let level = 0;

  while (num > 0) {
    const triple = num % 1000;
    if (triple > 0) {
      text = readTriple(triple) + levels[level] + (text ? " " + text : "");
    }
    num = Math.floor(num / 1000);
    level++;
  }

  return text.charAt(0).toUpperCase() + text.slice(1) + " VNĐ";
}

const formatMoneyInput = (value) => {
  if (!value) return "";
  const num = Number(value);
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
};

export default function PaymentHistoryModal({
  debtCode,
  customerCode,
  onClose,
  onPaymentAdded,
}) {
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState(""); // số THẬT (100000)
  const [amountView, setAmountView] = useState(""); // hiển thị (100.000)

  const [method, setMethod] = useState("PERSONAL_VCB");
  const [note, setNote] = useState("");
  const token = localStorage.getItem("token");

  const METHOD_LABEL = {
    PERSONAL_VCB: "TK cá nhân - VCB",
    PERSONAL_TCB: "TK cá nhân - TCB",
    COMPANY_VCB: "VCB công ty",
    COMPANY_TCB: "TCB công ty",
    CASH: "Tiền mặt",
    OTHER: "Khác",
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
          amount: Number(amount),
          method,
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
            type="text"
            placeholder="Số tiền"
            className="border p-2 flex-1 rounded"
            value={amountView}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, ""); // bỏ dấu chấm
              setAmount(raw);
              setAmountView(formatMoneyInput(raw));
            }}
          />

          <select
            className="border p-2 rounded"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="PERSONAL_VCB">TK cá nhân - VCB</option>
            <option value="PERSONAL_TCB">TK cá nhân - TCB</option>
            <option value="COMPANY_VCB">VCB công ty</option>
            <option value="COMPANY_TCB">TCB công ty</option>
            <option value="CASH">Tiền mặt</option>
            <option value="OTHER">Khác</option>
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
        {amount && (
          <div className="text-xs text-red-600 italic mt-[-10px] mb-2">
            {numberToVietnameseText(Number(amount))}
          </div>
        )}

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
                    {METHOD_LABEL[h.method] || h.method}
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
