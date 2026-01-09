import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";

export default function CustomerCommissionModal({
  customer,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    type: "PERCENT", // PERCENT | FIXED
    percentHH: "",
    moneyPerTrip: "",
    timeStart: "",
  });

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================
  // LOAD HISTORY
  // =========================
  useEffect(() => {
    if (!customer?._id) return;

    axios
      .get(`${API}/customers/commission-history/${customer?.code}`)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]));
  }, [customer]);

  // =========================
  // SUBMIT
  // =========================
  const submit = async (e) => {
    e.preventDefault();

    if (!form.timeStart) {
      alert("Phải chọn ngày bắt đầu áp dụng");
      return;
    }

    if (form.type === "PERCENT" && !form.percentHH) {
      alert("Nhập % hoa hồng");
      return;
    }

    if (form.type === "FIXED" && !form.moneyPerTrip) {
      alert("Nhập tiền / chuyến");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/customers/${customer._id}/commission`,
        {
          percentHH:
            form.type === "PERCENT" ? Number(form.percentHH) : 0,
          oneTripMoney:
            form.type === "FIXED" ? Number(form.moneyPerTrip) : 0,
          timeStart: form.timeStart,
        }
      );

      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi lưu hoa hồng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start p-6">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow p-5">
        <h2 className="text-lg font-bold mb-3">
          Thay đổi hoa hồng - {customer.name}
        </h2>

        {/* ================= FORM ================= */}
        <form onSubmit={submit} className="grid gap-3 border-b pb-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={form.type === "PERCENT"}
                onChange={() =>
                  setForm({ ...form, type: "PERCENT" })
                }
              />
              % HH
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={form.type === "FIXED"}
                onChange={() =>
                  setForm({ ...form, type: "FIXED" })
                }
              />
              Tiền / 1 chuyến
            </label>
          </div>

          {form.type === "PERCENT" && (
            <input
              placeholder="% hoa hồng"
              className="border p-2 rounded"
              value={form.percentHH}
              onChange={(e) =>
                setForm({ ...form, percentHH: e.target.value })
              }
            />
          )}

          {form.type === "FIXED" && (
            <input
              placeholder="Tiền / chuyến"
              className="border p-2 rounded"
              value={form.moneyPerTrip}
              onChange={(e) =>
                setForm({
                  ...form,
                  moneyPerTrip: e.target.value,
                })
              }
            />
          )}

          <input
            type="date"
            className="border p-2 rounded"
            value={form.timeStart}
            onClick={(e) => e.target.showPicker()}
            onChange={(e) =>
              setForm({ ...form, timeStart: e.target.value })
            }
          />

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Hủy
            </button>
            <button
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>

        {/* ================= HISTORY ================= */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Lịch sử hoa hồng</h3>

          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-1">Bắt đầu</th>
                <th className="border p-1">Kết thúc</th>
                <th className="border p-1">% HH</th>
                <th className="border p-1">Tiền / 1 chuyến</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-2 text-gray-500"
                  >
                    Chưa có lịch sử
                  </td>
                </tr>
              )}

              {history.map((h, i) => (
                <tr key={i}>
                  <td className="border p-1">
                    {new Date(h.startDate).toLocaleDateString()}
                  </td>
                  <td className="border p-1">
                    {h.endDate
                      ? new Date(h.endDate).toLocaleDateString()
                      : "Đang áp dụng"}
                  </td>
                  <td className="border p-1 text-right">
                    {h.percentHH || "0"}
                  </td>
                  <td className="border p-1 text-right">
                    {h.moneyPerTrip
                      ? h.moneyPerTrip.toLocaleString()
                      : "0"}
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
