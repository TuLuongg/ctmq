import { useState, useEffect } from "react";
import API from "../../api";
import axios from "axios";

// ====== Hàm đổi số thành chữ ======
function numberToWordsVND(num) {
  if (!num) return "";
  const formatter = new Intl.NumberFormat("vi-VN");
  const parts = formatter.format(num).split(".");
  const words = [
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

  function read3(number) {
    let [tr, ch, dv] = number.toString().padStart(3, "0").split("").map(Number);
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

function formatBankAccount(raw) {
  if (!raw) return "";
  return raw.replace(/\d+/g, (m) => m.replace(/(.{4})/g, "$1 ").trim());
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

function normalizeVN(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "") // bỏ ký tự lạ
    .trim();
}

export default function VoucherEditModal({ id, customers, voucher, onClose }) {
  const [form, setForm] = useState({ ...voucher });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  // ===== PHÂN LOẠI CHI =====
  const [expenseList, setExpenseList] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // ===== NGƯỜI NHẬN =====
  const [receiverNameList, setReceiverNameList] = useState([]);
  const [showAddReceiverName, setShowAddReceiverName] = useState(false);
  const [newReceiverName, setNewReceiverName] = useState("");
  const [addingReceiverName, setAddingReceiverName] = useState(false);

  // ===== CÔNG TY NHẬN =====
  const [receiverCompanyList, setReceiverCompanyList] = useState([]);
  const [showAddReceiverCompany, setShowAddReceiverCompany] = useState(false);
  const [newReceiverCompany, setNewReceiverCompany] = useState("");
  const [addingReceiverCompany, setAddingReceiverCompany] = useState(false);

  useEffect(() => {
    loadExpenseTypes();
    loadReceiverNames();
    loadReceiverCompanies();
  }, []);

  const [showCompanySuggest, setShowCompanySuggest] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState([]);

  function handleCompanyChange(e) {
    const value = e.target.value;

    setForm((s) => ({ ...s, receiverCompany: value }));

    if (!value.trim()) {
      setFilteredCompanies([]);
      setShowCompanySuggest(false);
      return;
    }

    const keywordRaw = value.toLowerCase();
    const keywordNormalize = normalizeVN(value);

    const matched = companySuggestions.filter((name) => {
      const nameRaw = name.toLowerCase();
      const nameNormalize = normalizeVN(name);

      return (
        nameRaw.includes(keywordRaw) || nameNormalize.includes(keywordNormalize)
      );
    });

    setFilteredCompanies(matched.slice(0, 50));
    setShowCompanySuggest(true);
  }

  // ===== GỢI Ý TÊN CÔNG TY =====
  const companySuggestions = Array.from(
    new Set([
      ...receiverCompanyList.map((e) => e.name),
      ...(customers || []).map((c) => c.nameHoaDon),
    ])
  ).filter(Boolean);

  async function loadExpenseTypes() {
    const res = await axios.get(`${API}/expense/expense-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setExpenseList(res.data || []);
  }

  async function loadReceiverNames() {
    const res = await axios.get(`${API}/expense/receiver-names`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setReceiverNameList(res.data || []);
  }

  async function loadReceiverCompanies() {
    const res = await axios.get(`${API}/expense/receiver-companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setReceiverCompanyList(res.data || []);
  }

  async function addExpenseType() {
    if (!newExpenseName.trim()) return;
    setAddingExpense(true);

    try {
      const res = await axios.post(
        `${API}/expense/expense-types`,
        { name: newExpenseName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setExpenseList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, expenseType: res.data.name }));
      setShowAddExpense(false);
      setNewExpenseName("");
    } finally {
      setAddingExpense(false);
    }
  }

  async function addReceiverName() {
    if (!newReceiverName.trim()) return;
    setAddingReceiverName(true);

    try {
      const res = await axios.post(
        `${API}/expense/receiver-names`,
        { name: newReceiverName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReceiverNameList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, receiverName: res.data.name }));
      setShowAddReceiverName(false);
      setNewReceiverName("");
    } finally {
      setAddingReceiverName(false);
    }
  }

  async function addReceiverCompany() {
    if (!newReceiverCompany.trim()) return;
    setAddingReceiverCompany(true);

    try {
      const res = await axios.post(
        `${API}/expense/receiver-companies`,
        { name: newReceiverCompany.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReceiverCompanyList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, receiverCompany: res.data.name }));
      setShowAddReceiverCompany(false);
      setNewReceiverCompany("");
    } finally {
      setAddingReceiverCompany(false);
    }
  }

  // Format số tiền + tự cập nhật số tiền bằng chữ
  function handleAmountChange(value) {
    const raw = value.replace(/\D/g, "");
    const num = Number(raw || 0);

    setForm((prev) => ({
      ...prev,
      amount: raw ? num : "",
      amountInWords: numberToWordsVND(num),
    }));
  }

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // ===== ẢNH MINH CHỨNG =====
  const [oldAttachments, setOldAttachments] = useState(
    Array.isArray(voucher.attachments) ? voucher.attachments : []
  );
  const [newAttachmentFiles, setNewAttachmentFiles] = useState([]); // File[]
  const [previewNewAttachments, setPreviewNewAttachments] = useState([]); // blob url

  function handleAttachmentFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setNewAttachmentFiles((prev) => [...prev, ...files]);
    setPreviewNewAttachments((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeOldAttachment(idx) {
    setOldAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeNewAttachment(idx) {
    setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewNewAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    try {
      setSaving(true);

      const fd = new FormData();

      Object.entries(form).forEach(([key, val]) => {
        if (key === "amount") {
          fd.set("amount", Number(form.amount || 0));
          return;
        }
        if (key === "amountInWords") {
          fd.set("amountInWords", numberToWordsVND(Number(form.amount || 0)));
          return;
        }
        fd.set(key, val ?? "");
      });

      /// ảnh cũ
      oldAttachments.forEach((url) => {
        fd.append("oldAttachments", url);
      });

      // ảnh mới
      newAttachmentFiles.forEach((file) => {
        fd.append("attachments", file);
      });

      const res = await axios.put(`${API}/vouchers/${id}`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

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
              value={form.dateCreated?.slice(0, 10)}
              onChange={change}
              className="border p-2 rounded"
            />
          </div>

          {/* Tài khoản chi */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Tài khoản chi</label>
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

          {/* Người nhận */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="font-semibold">Người nhận</label>
              <button
                type="button"
                className="text-blue-600 font-bold"
                onClick={() => setShowAddReceiverName((s) => !s)}
              >
                +
              </button>
            </div>

            <input
              list="receiverNameList"
              name="receiverName"
              value={form.receiverName}
              onChange={change}
              className="border p-2 rounded"
            />

            <datalist id="receiverNameList">
              {receiverNameList.map((e) => (
                <option key={e._id} value={e.name} />
              ))}
            </datalist>

            {showAddReceiverName && (
              <div className="flex gap-2 mt-1">
                <input
                  value={newReceiverName}
                  onChange={(e) => setNewReceiverName(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  onClick={addReceiverName}
                  className="px-3 bg-green-600 text-white rounded"
                >
                  {addingReceiverName ? "..." : "Thêm"}
                </button>
              </div>
            )}
          </div>

          {/* Công ty nhận */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="font-semibold">Tên công ty</label>
              <button
                type="button"
                className="text-blue-600 font-bold"
                onClick={() => setShowAddReceiverCompany((s) => !s)}
              >
                +
              </button>
            </div>

            <input
              name="receiverCompany"
              value={form.receiverCompany}
              onChange={handleCompanyChange}
              onFocus={() => {
                if (filteredCompanies.length > 0) setShowCompanySuggest(true);
              }}
              onBlur={() => {
                // delay để click được item
                setTimeout(() => setShowCompanySuggest(false), 150);
              }}
              className="border border-gray-300 rounded-md outline-none p-2 w-full"
              placeholder="Nhập tên công ty..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* DROPDOWN GỢI Ý */}
            {showCompanySuggest && filteredCompanies.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-48 overflow-y-auto">
                {filteredCompanies.map((name, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => {
                      setForm((s) => ({ ...s, receiverCompany: name }));
                      setShowCompanySuggest(false);
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm"
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}

            {/* ADD NEW COMPANY */}
            {showAddReceiverCompany && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newReceiverCompany}
                  onChange={(e) => setNewReceiverCompany(e.target.value)}
                  placeholder="Nhập tên công ty mới"
                  className="border border-gray-300 rounded-md outline-none p-2 flex-1"
                />
                <button
                  type="button"
                  onClick={addReceiverCompany}
                  disabled={addingReceiverCompany}
                  className="px-3 rounded bg-green-600 text-white"
                >
                  {addingReceiverCompany ? "..." : "Thêm"}
                </button>
              </div>
            )}
          </div>

          {/* Số tài khoản */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Số tài khoản</label>
            <input
              name="receiverBankAccount"
              value={formatBankAccount(form.receiverBankAccount)}
              onChange={(e) =>
                setForm({ ...form, receiverBankAccount: e.target.value })
              }
              className="border p-2 rounded"
            />
          </div>

          {/* Phân loại chi */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="font-semibold mb-1">Phân loại chi</label>
              <button
                type="button"
                className="text-blue-600 font-bold"
                onClick={() => setShowAddExpense((s) => !s)}
              >
                +
              </button>
            </div>

            <input
              list="expenseList"
              name="expenseType"
              value={form.expenseType}
              onChange={change}
              className="border p-2 rounded"
            />

            <datalist id="expenseList">
              {expenseList.map((e) => (
                <option key={e._id} value={e.name} />
              ))}
            </datalist>

            {showAddExpense && (
              <div className="flex gap-2 mt-1">
                <input
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  onClick={addExpenseType}
                  className="px-3 bg-green-600 text-white rounded"
                >
                  {addingExpense ? "..." : "Thêm"}
                </button>
              </div>
            )}
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

        {/* ẢNH MINH CHỨNG */}
        <div className="mt-4">
          <label className="font-semibold mb-2 block">Ảnh minh chứng</label>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAttachmentFiles}
          />

          {/* ẢNH CŨ */}
          {oldAttachments.length > 0 && (
            <>
              <div className="text-xs mt-2 text-gray-500">Ảnh đã lưu</div>
              <div className="flex gap-2 flex-wrap mt-1">
                {oldAttachments.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} className="h-28 rounded border" />
                    <button
                      type="button"
                      onClick={() => removeOldAttachment(idx)}
                      className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ẢNH MỚI */}
          {previewNewAttachments.length > 0 && (
            <>
              <div className="text-xs mt-3 text-gray-500">Ảnh mới</div>
              <div className="flex gap-2 flex-wrap mt-1">
                {previewNewAttachments.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} className="h-28 rounded border" />
                    <button
                      type="button"
                      onClick={() => removeNewAttachment(idx)}
                      className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
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
