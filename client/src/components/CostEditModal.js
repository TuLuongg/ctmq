import axios from "axios";
import API from "../api";

const MONEY_LABELS = {
  cuocPhi: "Cước phí",
  bocXep: "Bốc xếp",
  ve: "Vé",
  hangVe: "Hàng về",
  luuCa: "Lưu ca",
  luatChiPhiKhac: "Chi phí khác",
  themDiem: "Thêm điểm",
};

// chỉ để HIỂN THỊ, không đụng dữ liệu gốc
const formatMoney = (val) => {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return val;
  return n.toLocaleString("vi-VN");
};

const parseMoneyInput = (val) => {
  if (!val) return "";

  // giữ dấu -, bỏ hết ký tự khác số
  const isNegative = val.startsWith("-");
  const num = val.replace(/[^0-9]/g, "");

  return (isNegative ? "-" : "") + num;
};

export default function CostEditModal({
  open,
  onClose,
  trip,
  values,
  setValues,
  moneyFields,
  onSaved,
}) {
  if (!open || !trip) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
      <div className="bg-white w-[520px] rounded shadow-lg p-4">
        <h2 className="font-bold text-lg mb-3">
          Nhập chi phí – {trip.maChuyen}
        </h2>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {moneyFields.map((f) => (
            <div key={f}>
              <label className="block mb-1 font-medium">
                {MONEY_LABELS[f] || f}
              </label>

              <input
                type="text"
                className="border px-2 py-1 w-full"
                value={formatMoney(values[f])}
                onChange={(e) => {
                  const raw = parseMoneyInput(e.target.value);

                  setValues((prev) => ({
                    ...prev,
                    [f]: raw,
                  }));
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1 bg-gray-400 text-white rounded"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className="px-3 py-1 bg-green-600 text-white rounded"
            onClick={async () => {
              await axios.put(
                `${API}/odd-debt/update-money`,
                {
                  maChuyen: trip.maChuyen,
                  ...moneyFields.reduce((acc, f) => {
                    acc[f] = values[f];
                    return acc;
                  }, {}),
                },
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );

              onClose();
              onSaved();
            }}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
