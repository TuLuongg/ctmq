import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";

const PAYMENT_METHODS = [
  { value: "PERSONAL_VCB", label: "TK cá nhân - VCB" },
  { value: "PERSONAL_TCB", label: "TK cá nhân - TCB" },
  { value: "COMPANY_VCB", label: "VCB công ty" },
  { value: "COMPANY_TCB", label: "TCB công ty" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "OTHER", label: "Khác" },
];

const formatMoneyInput = (value) => {
  if (!value) return "";
  const num = value.replace(/[^\d]/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyToNumber = (value) => {
  if (!value) return 0;
  return Number(value.replace(/\./g, ""));
};

const numberToVietnameseWords = (num) => {
  if (!num || num <= 0) return "";

  const units = [
    "",
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

  const scales = ["", "nghìn", "triệu", "tỷ"];

  const readTriple = (n) => {
    let str = "";
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;

    if (hundred > 0) {
      str += units[hundred] + " trăm";
      if (ten === 0 && unit > 0) str += " lẻ";
    }

    if (ten > 1) {
      str += " " + units[ten] + " mươi";
      if (unit === 1) str += " mốt";
      else if (unit === 5) str += " lăm";
      else if (unit > 0) str += " " + units[unit];
    } else if (ten === 1) {
      str += " mười";
      if (unit === 5) str += " lăm";
      else if (unit > 0) str += " " + units[unit];
    } else if (ten === 0 && unit > 0 && hundred === 0) {
      str += units[unit];
    }

    return str.trim();
  };

  let result = "";
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const chunkText = readTriple(chunk);
      result = chunkText + " " + scales[scaleIndex] + " " + result;
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return (
    result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + " đồng"
  );
};

export default function TripPaymentModal({
  maChuyenCode,
  onClose,
  onChange,
  onReloadPayment,
}) {
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdDay, setCreatedDay] = useState();

  const PAYMENT_METHOD_LABEL_MAP = {
    PERSONAL_VCB: "TK cá nhân - VCB",
    PERSONAL_TCB: "TK cá nhân - TCB",
    COMPANY_VCB: "VCB công ty",
    COMPANY_TCB: "TCB công ty",
    CASH: "Tiền mặt",
    OTHER: "Khác",
  };

  // Load lịch sử thanh toán
  const loadPayments = async () => {
    if (!maChuyenCode) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/odd-debt/payment/${maChuyenCode}`, {
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

    const numericAmount = parseMoneyToNumber(amount);
    if (!numericAmount) return alert("Số tiền không hợp lệ");

    try {
      await axios.post(
        `${API}/odd-debt/payment`,
        {
          maChuyenCode,
          amount: numericAmount,
          method,
          note,
          createdDay,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setAmount("");
      setNote("");
      setMethod("CASH");

      loadPayments();
      onReloadPayment();
      if (onChange) onChange();
    } catch (err) {
      console.error("Lỗi thêm thanh toán:", err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Không thể thêm thanh toán";

      alert(msg);
    }
  };

  // Xoá thanh toán
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Bạn có chắc muốn xoá thanh toán này?")) return;
    try {
      await axios.delete(`${API}/odd-debt/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      loadPayments(); // reload danh sách sau khi xoá
      onReloadPayment();

      if (onChange) onChange(); // <- báo parent reload bảng
    } catch (err) {
      console.error("Lỗi xoá thanh toán:", err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Không thể xoá thanh toán";

      alert(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow-lg w-[600px] max-h-[80vh] overflow-auto p-4">
        <h2 className="text-lg font-bold mb-4">
          Thanh toán chuyến {maChuyenCode}
        </h2>

        {/* Form thêm thanh toán */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col-2 gap-1 items-center">
            <label className="text-xs font-medium mr-1">
              Ngày thanh toán:{" "}
            </label>
            <input
              type="date"
              className="border p-1"
              value={createdDay}
              onChange={(e) => setCreatedDay(e.target.value)}
              onClick={(e) => e.target.showPicker()}
              required
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Số tiền"
              className="border p-1 flex-1"
              value={amount}
              onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            />

            <select
              className="border p-1"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {amount && (
            <div className="text-xs italic text-red-600 mt-[-5px]">
              {numberToVietnameseWords(parseMoneyToNumber(amount))}
            </div>
          )}

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
                <th className="border p-1">Ngày thanh toán</th>
                <th className="border p-1">Số tiền</th>
                <th className="border p-1">Phương thức</th>
                <th className="border p-1">Ghi chú</th>
                <th className="border p-1">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="border p-1">
                    {new Date(p.createdDay).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="border p-1">
                    {p.amount.toLocaleString("vi-VN")}
                  </td>

                  <td className="border p-1">
                    {PAYMENT_METHOD_LABEL_MAP[p.method] || p.method}
                  </td>
                  <td className="border p-1">{p.note}</td>
                  <td className="border p-1 text-center">
                    <button
                      className="bg-red-500 text-white px-2 py-0 rounded"
                      onClick={() => handleDeletePayment(p._id)}
                    >
                      Xoá
                    </button>
                  </td>
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
