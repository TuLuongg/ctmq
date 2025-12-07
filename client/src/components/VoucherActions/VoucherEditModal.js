import { useState, useEffect } from "react";
import API from "../../api";
import axios from "axios";

// ====== Hàm đổi số thành chữ ======
function numberToWordsVND(num) {
  if (!num) return "";
  const formatter = new Intl.NumberFormat("vi-VN");
  const parts = formatter.format(num).split(".");
  const words = [
    "không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"
  ];

  function read3(number) {
    let [tr, ch, dv] = number.toString().padStart(3,"0").split("").map(Number);
    let str = "";

    if (tr !== 0) {
      str += words[tr] + " trăm ";
      if (ch === 0 && dv !== 0) str += "lẻ ";
    }

    if (ch > 1) {
      str += words[ch] + " mươi ";
      if (dv === 1) str += "mốt ";
      else if (dv === 5) str += "lăm ";
      else if (dv !== 0) str += words[dv] + " ";
    } else if (ch === 1) {
      str += "mười ";
      if (dv === 5) str += "lăm ";
      else if (dv !== 0) str += words[dv] + " ";
    } else if (ch === 0 && dv !== 0) {
      str += words[dv] + " ";
    }

    return str.trim();
  }

  const units = ["", " nghìn", " triệu", " tỷ"];
  let result = "";
  let i = 0;

  while (num > 0) {
    const block = num % 1000;
    if (block !== 0) {
      result = read3(block) + units[i] + " " + result;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  return result.trim() + " VNĐ";
}

function formatAccountNumber(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim(); 
}

export default function VoucherEditModal({ id, voucher, onClose }) {
  const [form, setForm] = useState({ ...voucher });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  // Format số tiền + tự cập nhật số tiền bằng chữ
  function handleAmountChange(value) {
    const raw = value.replace(/\D/g, "");
    const num = Number(raw || 0);

    setForm((prev) => ({
      ...prev,
      amount: raw ? num : "",
      amountInWords: numberToWordsVND(num)
    }));
  }

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit() {
    try {
      setSaving(true);

      const payload = {
        ...form,
        amount: Number(form.amount || 0),
        amountInWords: numberToWordsVND(Number(form.amount || 0)),
      };

      const res = await axios.put(`${API}/vouchers/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data) onClose?.();
      else alert("Cập nhật thất bại!");

    } catch (err) {
      alert(err.response?.data?.error || err.message || "Lỗi!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[720px] max-h-[90vh] overflow-auto p-6 rounded shadow-lg text-sm">

        <h4 className="font-bold mb-3 text-lg">Sửa phiếu chi</h4>

<div className="grid grid-cols-2 gap-3">

  {/* Ngày tạo */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Ngày tạo phiếu</label>
    <input
      type="date"
      name="dateCreated"
      value={form.dateCreated?.slice(0,10)}
      onChange={change}
      className="border p-2 rounded"
    />
  </div>

  {/* Tài khoản chi */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Nguồn chi</label>
    <select
      name="paymentSource"
      value={form.paymentSource}
      onChange={change}
      className="border p-2 rounded"
    >
      <option value="congTy">Công ty</option>
      <option value="caNhan">Cá nhân</option>
    </select>
  </div>

  {/* Người nhận */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Người nhận</label>
    <input
      name="receiverName"
      value={form.receiverName}
      onChange={change}
      className="border p-2 rounded"
    />
  </div>

  {/* Công ty nhận */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Công ty nhận</label>
    <input
      name="receiverCompany"
      value={form.receiverCompany}
      onChange={change}
      className="border p-2 rounded"
    />
  </div>

  {/* Số tài khoản */}
{/* Số tài khoản */}
<div className="flex flex-col">
  <label className="font-semibold mb-1">Số tài khoản</label>
  <input
    name="receiverBankAccount"
    value={formatAccountNumber(form.receiverBankAccount)}
    onChange={(e) => {
      const raw = e.target.value.replace(/\s+/g, "");
      setForm({ ...form, receiverBankAccount: raw });
    }}
    className="border p-2 rounded"
  />
</div>


  {/* Phân loại chi */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Phân loại chi</label>
    <input
      name="expenseType"
      value={form.expenseType}
      onChange={change}
      className="border p-2 rounded"
    />
  </div>

  {/* Số tiền */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Số tiền</label>
    <input
      name="amount"
      value={form.amount?.toLocaleString("vi-VN")}
      onChange={(e) => handleAmountChange(e.target.value)}
      className="border p-2 rounded"
    />
  </div>

  {/* Số tiền bằng chữ */}
  <div className="flex flex-col">
    <label className="font-semibold mb-1">Số tiền bằng chữ</label>
    <input
      name="amountInWords"
      value={form.amountInWords}
      readOnly
      className="border p-2 rounded text-red-600 italic bg-gray-50"
    />
  </div>

</div>

{/* Lý do */}
<div className="flex flex-col mt-3">
  <label className="font-semibold mb-1">Lý do chi</label>
  <textarea
    name="reason"
    value={form.reason}
    onChange={change}
    className="border p-2 rounded w-full"
    rows={3}
  />
</div>

{/* Nội dung CK */}
<div className="flex flex-col mt-2">
  <label className="font-semibold mb-1">Nội dung chuyển khoản</label>
  <textarea
    name="transferContent"
    value={form.transferContent}
    onChange={change}
    className="border p-2 rounded w-full"
    rows={2}
  />
</div>


        {/* BUTTON */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-400 text-white"
          >
            Hủy
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>

      </div>
    </div>
  );
}
