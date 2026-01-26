import { useState, useEffect } from "react";
import API from "../../api";
import axios from "axios";

/** Hàm chuyển số sang chữ */
function numberToVietnameseWords(number) {
  if (number === 0) return "0 đồng";

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

  function readThreeDigits(n) {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let parts = [];

    if (hundreds > 0) parts.push(units[hundreds] + " trăm");

    if (tens > 1) {
      parts.push(units[tens] + " mươi");
      if (ones === 1) parts.push("mốt");
      else if (ones === 4) parts.push("bốn");
      else if (ones === 5) parts.push("lăm");
      else if (ones > 0) parts.push(units[ones]);
    } else if (tens === 1) {
      parts.push("mười");
      if (ones === 1) parts.push("mốt");
      else if (ones === 4) parts.push("bốn");
      else if (ones === 5) parts.push("lăm");
      else if (ones > 0) parts.push(units[ones]);
    } else {
      if (ones > 0) {
        if (hundreds > 0) parts.push("lẻ");
        parts.push(units[ones]);
      }
    }

    return parts.join(" ");
  }

  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  let parts = [];
  let remaining = Math.abs(Math.floor(number));
  let groups = [];

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp === 0) continue;
    parts.push(readThreeDigits(grp) + (scales[i] ? " " + scales[i] : ""));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim() + " đồng";
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

function formatMoneyDisplay(raw) {
  if (!raw && raw !== 0) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

const PAYMENT_SOURCE_OPTIONS = [
  { value: "PERSONAL_VCB", label: "Cá nhân - VCB" },
  { value: "PERSONAL_TCB", label: "Cá nhân - TCB" },
  { value: "COMPANY_VCB", label: "Công ty - VCB" },
  { value: "COMPANY_TCB", label: "Công ty - TCB" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "OTHER", label: "Khác" },
];

const PAYMENT_SOURCE_COLOR = {
  PERSONAL_TCB: "text-blue-600 font-semibold",
  PERSONAL_VCB: "text-blue-600 font-semibold",

  COMPANY_TCB: "text-green-600 font-semibold",
  COMPANY_VCB: "text-green-600 font-semibold",

  CASH: "text-blue-600 font-semibold",
};

export default function VoucherAdjustModal({
  id,
  customers,
  onClose,
  onSuccess,
}) {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  const [form, setForm] = useState({
    dateCreated: new Date().toISOString().slice(0, 10),
    paymentSource: "congTy",
    receiverName: "",
    receiverCompany: "",
    receiverBankAccount: "",
    transferContent: "",
    reason: "",
    expenseType: "",
    amount: "",
    createdBy: "",
  });

  // ===== ẢNH ĐÍNH KÈM (GIỐNG DriverModal) =====
  const [attachmentFiles, setAttachmentFiles] = useState([]); // File[]
  const [attachmentPreview, setAttachmentPreview] = useState([]); // string[]

  useEffect(() => {
    async function loadOriginalVoucher() {
      try {
        const res = await axios.get(`${API}/vouchers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const v = res.data;

        // Đổ toàn bộ dữ liệu phiếu gốc vào form
        setForm({
          dateCreated: new Date().toISOString().slice(0, 10), // ngày mới
          paymentSource: v.paymentSource || "congTy",
          receiverName: v.receiverName || "",
          receiverCompany: v.receiverCompany || "",
          receiverBankAccount: v.receiverBankAccount || "",
          transferContent: v.transferContent || "",
          reason: v.reason || "",
          expenseType: v.expenseType || "",
          amount: String(v.amount || ""),
          createdBy: v.createdBy || "",
        });
      } catch (err) {
        alert("Không tải được phiếu gốc");
        onClose?.();
      }
    }

    if (id) loadOriginalVoucher();
  }, [id]);

  const [saving, setSaving] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);

  function change(e) {
    const { name, value } = e.target;

    if (name === "amount") {
      const onlyDigits = String(value).replace(/\D/g, "");
      setForm((s) => ({ ...s, amount: onlyDigits }));
      return;
    }

    if (name === "receiverBankAccount") {
      const digits = value.replace(/\D/g, "");
      setForm((s) => ({ ...s, receiverBankAccount: digits }));
      return;
    }

    setForm((s) => ({ ...s, [name]: value }));
  }

  function handleSelectFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setAttachmentFiles((prev) => [...prev, ...files]);
  }

  function removeFile(index) {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    try {
      setSaving(true);

      const fd = new FormData();

      // append form thường
      Object.entries(form).forEach(([key, value]) => {
        if (key === "amount") {
          fd.append("amount", Number(value || 0));
        } else {
          fd.append(key, value ?? "");
        }
      });

      fd.append(
        "amountInWords",
        numberToVietnameseWords(Number(form.amount || 0))
      );

      fd.append("createByName", user?.fullname || user?.username);

      // 🔥 append FILE – GIỐNG 100% DriverModal
      attachmentFiles.forEach((file) => {
        fd.append("attachments", file);
      });
      const res = await axios.post(`${API}/vouchers/${id}/adjust`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data._id) {
        onSuccess?.(); // cập nhật dữ liệu ở parent
        onClose?.(); // **đóng modal sau khi tạo thành công**
      } else {
        alert("Tạo phiếu điều chỉnh thất bại");
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
          PHIẾU ĐIỀU CHỈNH
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

        {/* NGUỒN CHI */}
        <div className="mb-3">
          <label className="font-semibold mr-2">TÀI KHOẢN CHI</label>
          <select
            name="paymentSource"
            value={form.paymentSource}
            onChange={change}
            className={`
    border border-gray-300 rounded-md outline-none p-2 w-48 mt-2
    ${PAYMENT_SOURCE_COLOR[form.paymentSource] || ""}
  `}
          >
            {PAYMENT_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
                const match = customers.filter((c) =>
                  removeVietnameseTone(c.name || "").includes(
                    removeVietnameseTone(text)
                  )
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
                      setForm((s) => ({ ...s, receiverCompany: c.name }));
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

        {/* SỐ TÀI KHOẢN */}
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

        {/* NỘI DUNG CHUYỂN KHOẢN */}
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

        {/* ẢNH / CHỨNG TỪ ĐÍNH KÈM */}
        <div className="mb-4">
          <label className="font-semibold block mb-2">
            ẢNH / CHỨNG TỪ ĐÍNH KÈM
          </label>

          <input
            type="file"
            multiple
            onChange={handleSelectFiles}
            className="mb-3"
          />

          {attachmentFiles.length > 0 && (
            <div className="space-y-2">
              {attachmentFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border p-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">📎</span>
                    <span className="text-sm truncate max-w-[400px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-red-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
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
              value={formatMoneyDisplay(form.amount)}
              onChange={change}
              className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
              placeholder="0"
            />
          </div>
        </div>

        {/* SỐ TIỀN BẰNG CHỮ */}
        <div className="mb-4">
          <label className="font-semibold">SỐ TIỀN BẰNG CHỮ</label>
          <p className="italic text-red-600 mt-2">
            {numberToVietnameseWords(Number(form.amount || 0))}
          </p>
        </div>

        {/* BUTTON */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-400 text-white"
          >
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
