import { useState } from "react";
import API from "../../api";
import axios from "axios";

/**
 * Chuyển số nguyên >=0 sang chữ tiếng Việt (ví dụ: 1000000 -> "một triệu VNĐ")
 * Hỗ trợ đến hàng nghìn tỷ (tùy nhu cầu có thể mở rộng).
 */
function numberToVietnameseWords(number) {
  if (number === 0) return "0 đồng";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readThreeDigits(n) {
    // n in [0..999]
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let parts = [];

    if (hundreds > 0) {
      parts.push(units[hundreds] + " trăm");
    }

    if (tens > 1) {
      // ví dụ 20,30,...
      parts.push(units[tens] + " mươi");
      if (ones === 1) parts.push("mốt");
      else if (ones === 4) parts.push("bốn");
      else if (ones === 5) parts.push("lăm");
      else if (ones > 0) parts.push(units[ones]);
    } else if (tens === 1) {
      // 10..19
      parts.push("mười");
      if (ones === 1) parts.push("mốt");
      else if (ones === 4) parts.push("bốn");
      else if (ones === 5) parts.push("lăm");
      else if (ones > 0) parts.push(units[ones]);
    } else {
      // tens === 0
      if (ones > 0) {
        if (hundreds > 0) {
          // có trăm, đọc "lẻ"
          parts.push("lẻ");
        }
        // ones normal
        parts.push(units[ones]);
      }
    }

    return parts.join(" ");
  }

  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]; // mở rộng nếu cần
  let parts = [];
  let remaining = Math.abs(Math.floor(number));
  let scaleIndex = 0;
  let groups = [];

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp === 0) {
      scaleIndex++;
      continue;
    }

    const text = readThreeDigits(grp);

    // Nếu đang ở giữa có nhóm 0 phía trước và nhóm sau không phải 0, cần đảm bảo đọc "không trăm ..."?
    // Hàm readThreeDigits đã xử lý lẻ khi cần thiết.
    parts.push(text + (scales[i] ? " " + scales[i] : ""));
    scaleIndex++;
  }

  // ghép các phần, loại bỏ khoảng trắng thừa
  const result = parts.join(" ").replace(/\s+/g, " ").trim();

  return result + " đồng";
}

function removeVietnameseTone(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function formatAccountNumber(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim(); 
}


/** Format hiển thị kiểu 100.000 */
function formatMoneyDisplay(raw) {
  if (!raw && raw !== 0) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

export default function VoucherCreateModal({customers, onClose, onSuccess }) {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    dateCreated: new Date().toISOString().slice(0, 10),
    paymentSource: "congTy",
    receiverName: "",
    receiverCompany: "",
    receiverBankAccount: "",
    transferContent: "",
    reason: "",
    expenseType: "",
    amount: "", // lưu raw digits: "1000000"
  });

  const [saving, setSaving] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);


  function change(e) {
    const { name, value } = e.target;

    if (name === "amount") {
      // lưu chỉ chữ số
      const onlyDigits = String(value).replace(/\D/g, "");
      setForm((s) => ({ ...s, amount: onlyDigits }));
      return;
    }

    if (name === "receiverBankAccount") {
    const digits = value.replace(/\D/g, "");
    setForm(s => ({ ...s, receiverBankAccount: digits }));
    return;
  }

    setForm((s) => ({ ...s, [name]: value }));
  }

  async function submit() {
    try {
      setSaving(true);

      const payload = {
        ...form,
        amount: Number(form.amount || 0),
        amountInWords: numberToVietnameseWords(Number(form.amount || 0)),
      };

      const res = await axios.post(`${API}/vouchers`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data._id) {
        onSuccess?.();
      } else {
        alert("Tạo phiếu thất bại");
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Lỗi!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[900px] max-h-[90vh] overflow-auto p-6 rounded shadow-lg">
        <h2 className="text-center text-lg font-bold mb-4 tracking-widest">
          PHIẾU CHI
        </h2>

{/* NGÀY */}
<div className="mb-3">
  <label className="font-semibold mr-2">NGÀY TẠO PHIẾU</label>
  <input
    type="date"
    name="dateCreated"
    value={form.dateCreated}
    onChange={change}
    className="border border-gray-300 rounded-md outline-none p-2 w-40"
  />
</div>

{/* TÀI KHOẢN NGUỒN CHI */}
{/* TÀI KHOẢN NGUỒN CHI */}
<div className="mb-3">
  <label className="font-semibold mr-2">TÀI KHOẢN NGUỒN CHI</label>
  <select
    name="paymentSource"
    value={form.paymentSource}
    onChange={change}
    className="border border-gray-300 rounded-md outline-none p-2 w-40 mt-2"
  >
    <option value="congTy">CÔNG TY</option>
    <option value="caNhan">CÁ NHÂN</option>
  </select>
</div>


{/* NGƯỜI NHẬN */}
<div className="mb-2">
  <label className="font-semibold">NGƯỜI NHẬN</label>
  <input
    name="receiverName"
    value={form.receiverName}
    onChange={change}
    className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
  />
</div>

{/* TÊN CÔNG TY */}
{/* TÊN CÔNG TY (gợi ý từ customers.name) */}
<div className="mb-2">
  <label className="font-semibold">TÊN CÔNG TY</label>

  <div className="relative">
    <input
      name="receiverCompany"
      value={form.receiverCompany}
      onChange={(e) => {
        change(e);

        const text = e.target.value.trim();
        if (!text) return setNameSuggestions([]);

        const match = customers.filter(c =>
          removeVietnameseTone(c.name || "")
            .includes(removeVietnameseTone(text))
        );

        setNameSuggestions(match.slice(0, 8));
      }}
      className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
      autoComplete="off"
    />

    {nameSuggestions.length > 0 && (
      <ul className="absolute z-50 bg-white border w-full mt-1 max-h-40 overflow-auto shadow">
        {nameSuggestions.map((c, i) => (
          <li
            key={i}
            className="p-2 hover:bg-blue-100 cursor-pointer"
            onClick={() => {
              setForm(s => ({
                ...s,
                receiverCompany: c.name   // CHỈ ĐÚNG 1 FIELD NÀY!
              }));
              setNameSuggestions([]);
            }}
          >
            {c.name}
          </li>
        ))}
      </ul>
    )}
  </div>
</div>


        <div className="mb-2">
          <label className="font-semibold">SỐ TÀI KHOẢN NHẬN TIỀN</label>
          <input
            list="bankList"
            name="receiverBankAccount"
            value={formatAccountNumber(form.receiverBankAccount)}
            onChange={change}
            className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
          />
          <datalist id="bankList"></datalist>
        </div>

        {/* NỘI DUNG */}
        <div className="mb-2">
          <label className="font-semibold">NỘI DUNG CHUYỂN KHOẢN</label>
          <textarea
            name="transferContent"
            value={form.transferContent}
            onChange={change}
            rows={2}
            className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
          />
        </div>

        {/* LÝ DO */}
        <div className="mb-2">
          <label className="font-semibold">LÝ DO CHI</label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={change}
            rows={4}
            className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
          />
        </div>

        {/* PHÂN LOẠI + SỐ TIỀN */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="font-semibold">PHÂN LOẠI CHI</label>
            <input
              list="expenseList"
              name="expenseType"
              value={form.expenseType}
              onChange={change}
              className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
            />
            <datalist id="expenseList"></datalist>
          </div>

          <div>
            <label className="font-semibold">SỐ TIỀN (VNĐ)</label>
            <input
              name="amount"
              // hiển thị có dấu chấm: 100.000
              value={formatMoneyDisplay(form.amount)}
              onChange={change}
              className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
              placeholder="0"
            />
          </div>
        </div>

        {/* SỐ TIỀN BẰNG CHỮ (hiển thị chữ hẳn) */}
        <div className="mb-4">
          <label className="font-semibold">SỐ TIỀN BẰNG CHỮ</label>
          <p className="italic text-red-600 mt-2">
            {numberToVietnameseWords(Number(form.amount || 0))}
          </p>
        </div>

        {/* BUTTON */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-400 text-white">
            Đóng
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {saving ? "Đang lưu..." : "Tạo phiếu"}
          </button>
        </div>
      </div>
    </div>
  );
}
