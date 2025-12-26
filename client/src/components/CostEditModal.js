import axios from "axios";
import API from "../api";

const MONEY_LABELS = {
  cuocPhi: "Cước phí BĐ",
  bocXep: "Bốc xếp BĐ",
  ve: "Vé BĐ",
  hangVe: "Hàng về BĐ",
  luuCa: "Lưu ca BĐ",
  luatChiPhiKhac: "Chi phí khác BĐ",
};

const formatMoney = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
};

const parseMoney = (val) => {
  if (!val) return 0;
  return Number(val.replace(/\./g, "").replace(/,/g, ""));
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
                  const raw = parseMoney(e.target.value);
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
              await axios.put(`${API}/schedule-admin/${values._id}`, values, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });
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
