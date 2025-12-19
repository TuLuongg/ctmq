import { useState, useEffect } from "react";
import API from "../../api";
import axios from "axios";

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

export default function VoucherCreateModal({ customers, onClose, onSuccess }) {
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

  async function loadExpenseTypes() {
    try {
      const res = await axios.get(`${API}/expense/expense-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExpenseList(res.data || []);
    } catch (err) {
      console.error("Lỗi tải phân loại chi", err);
    }
  }

  async function addExpenseType() {
    if (!newExpenseName.trim()) return;

    try {
      setAddingExpense(true);

      const res = await axios.post(
        `${API}/expense/expense-types`,
        { name: newExpenseName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // thêm vào list & chọn luôn
      setExpenseList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, expenseType: res.data.name }));

      setNewExpenseName("");
      setShowAddExpense(false);
    } catch (err) {
      alert(err.response?.data?.error || "Không thêm được phân loại chi");
    } finally {
      setAddingExpense(false);
    }
  }

  async function loadReceiverNames() {
    try {
      const res = await axios.get(`${API}/expense/receiver-names`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceiverNameList(res.data || []);
    } catch (err) {
      console.error("Lỗi tải người nhận", err);
    }
  }

  async function loadReceiverCompanies() {
    try {
      const res = await axios.get(`${API}/expense/receiver-companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceiverCompanyList(res.data || []);
    } catch (err) {
      console.error("Lỗi tải công ty nhận", err);
    }
  }

  async function addReceiverName() {
    if (!newReceiverName.trim()) return;

    try {
      setAddingReceiverName(true);

      const res = await axios.post(
        `${API}/expense/receiver-names`,
        { name: newReceiverName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReceiverNameList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, receiverName: res.data.name }));

      setNewReceiverName("");
      setShowAddReceiverName(false);
    } catch (err) {
      alert(err.response?.data?.error || "Không thêm được người nhận");
    } finally {
      setAddingReceiverName(false);
    }
  }
  async function addReceiverCompany() {
    if (!newReceiverCompany.trim()) return;

    try {
      setAddingReceiverCompany(true);

      const res = await axios.post(
        `${API}/expense/receiver-companies`,
        { name: newReceiverCompany.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReceiverCompanyList((s) => [...s, res.data]);
      setForm((f) => ({ ...f, receiverCompany: res.data.name }));

      setNewReceiverCompany("");
      setShowAddReceiverCompany(false);
    } catch (err) {
      alert(err.response?.data?.error || "Không thêm được công ty nhận");
    } finally {
      setAddingReceiverCompany(false);
    }
  }

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
      setForm((s) => ({ ...s, receiverBankAccount: digits }));
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
          <div className="flex items-center gap-2">
            <label className="font-semibold">NGƯỜI NHẬN</label>
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
            className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
          />

          <datalist id="receiverNameList">
            {receiverNameList.map((e) => (
              <option key={e._id} value={e.name} />
            ))}
          </datalist>

          {showAddReceiverName && (
            <div className="flex gap-2 mt-2">
              <input
                value={newReceiverName}
                onChange={(e) => setNewReceiverName(e.target.value)}
                placeholder="Nhập tên người nhận mới"
                className="border border-gray-300 rounded-md outline-none p-2 flex-1"
              />
              <button
                type="button"
                onClick={addReceiverName}
                disabled={addingReceiverName}
                className="px-3 rounded bg-green-600 text-white"
              >
                {addingReceiverName ? "..." : "Thêm"}
              </button>
            </div>
          )}
        </div>

        {/* TÊN CÔNG TY */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <label className="font-semibold">TÊN CÔNG TY</label>
            <button
              type="button"
              className="text-blue-600 font-bold"
              onClick={() => setShowAddReceiverCompany((s) => !s)}
            >
              +
            </button>
          </div>

          <input
            list="receiverCompanyList"
            name="receiverCompany"
            value={form.receiverCompany}
            onChange={change}
            className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
          />

          <datalist id="receiverCompanyList">
            {receiverCompanyList.map((e) => (
              <option key={e._id} value={e.name} />
            ))}
          </datalist>

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
          {/* PHÂN LOẠI CHI */}
          <div>
            <div className="flex items-center gap-2">
              <label className="font-semibold">PHÂN LOẠI CHI</label>

              <button
                type="button"
                className="text-blue-600 font-bold"
                title="Thêm phân loại chi"
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
              className="border border-gray-300 rounded-md outline-none p-2 w-full mt-2"
              autoComplete="off"
            />

            <datalist id="expenseList">
              {expenseList.map((e) => (
                <option key={e._id} value={e.name} />
              ))}
            </datalist>

            {/* INPUT THÊM MỚI */}
            {showAddExpense && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="Nhập tên phân loại chi mới"
                  className="border border-gray-300 rounded-md outline-none p-2 flex-1"
                />

                <button
                  type="button"
                  disabled={addingExpense}
                  onClick={addExpenseType}
                  className="px-3 rounded bg-green-600 text-white"
                >
                  {addingExpense ? "..." : "Thêm"}
                </button>
              </div>
            )}
          </div>

          {/* SỐ TIỀN */}
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

        {/* SỐ TIỀN BẰNG CHỮ (hiển thị chữ hẳn) */}
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
