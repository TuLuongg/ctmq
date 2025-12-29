import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

const LABELS = {
  ltState: "LT",
  onlState: "ONL",
  offState: "OFF",
  cuocPhiBS: "Cước phí",
  bocXepBS: "Bốc xếp",
  veBS: "Vé",
  hangVeBS: "Hàng về",
  luuCaBS: "Lưu ca",
  cpKhacBS: "Chi phí khác",
  themDiem: "Thêm điểm",
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "";
  // Giữ lại dấu âm ở đầu
  const isNegative = /^-/.test(value);
  const num = Number(value.toString().replace(/[^0-9]/g, ""));
  if (isNaN(num)) return "";
  return (isNegative ? "-" : "") + num.toLocaleString("vi-VN");
};

const parseMoney = (value) => {
  if (!value) return 0;
  const isNegative = /^-/.test(value);
  const num = Number(value.toString().replace(/[^0-9]/g, ""));
  return isNegative ? -num : num;
};


export default function BoSungSingleModal({
  open,
  onClose,
  schedule,
  onSaved,
}) {
  const [form, setForm] = useState({
    ltState: "",
    onlState: "",
    offState: "",
    cuocPhiBS: "",
    bocXepBS: "",
    veBS: "",
    hangVeBS: "",
    luuCaBS: "",
    cpKhacBS: "",
    themDiem: "",
  });

  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (schedule) {
      setForm({
        ltState: schedule.ltState || "",
        onlState: schedule.onlState || "",
        offState: schedule.offState || "",
        cuocPhiBS: formatMoney(schedule.cuocPhiBS),
        bocXepBS: formatMoney(schedule.bocXepBS),
        veBS: formatMoney(schedule.veBS),
        hangVeBS: formatMoney(schedule.hangVeBS),
        luuCaBS: formatMoney(schedule.luuCaBS),
        cpKhacBS: formatMoney(schedule.cpKhacBS),
        themDiem: formatMoney(schedule.themDiem),
      });
    }
  }, [schedule]);

  if (!open || !schedule) return null;

  const moneyFields = [
    "cuocPhiBS",
    "bocXepBS",
    "veBS",
    "hangVeBS",
    "luuCaBS",
    "cpKhacBS",
    "themDiem",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (moneyFields.includes(name)) {
      setForm((p) => ({
        ...p,
        [name]: formatMoney(value),
      }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const submit = async () => {
    try {
      setSaving(true);

      const payload = {
        ...form,
        cuocPhiBS: parseMoney(form.cuocPhiBS),
        bocXepBS: parseMoney(form.bocXepBS),
        veBS: parseMoney(form.veBS),
        hangVeBS: parseMoney(form.hangVeBS),
        luuCaBS: parseMoney(form.luuCaBS),
        cpKhacBS: parseMoney(form.cpKhacBS),
      };

      const res = await axios.put(
        `${API}/schedule-admin/bo-sung/${schedule._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi cập nhật bổ sung");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[600px] p-5">
        <h2 className="text-lg font-bold mb-4">
          Bổ sung chuyến: {schedule.maChuyen}
        </h2>

        <div className="grid grid-cols-6 gap-3 text-sm">
          {/* ===== DÒNG 1 ===== */}
          {["ltState", "onlState", "offState"].map((k) => (
            <div key={k} className="col-span-1">
              <label className="block mb-1 text-left">{LABELS[k]}</label>
              <input
                name={k}
                value={form[k]}
                onChange={handleChange}
                className="border rounded px-2 py-1 w-full text-center"
              />
            </div>
          ))}

          <div className="col-span-3">
            <label className="block mb-1">{LABELS.cuocPhiBS}</label>
            <input
              name="cuocPhiBS"
              value={form.cuocPhiBS}
              onChange={handleChange}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          {/* ===== CÁC DÒNG SAU ===== */}
          {[
            "bocXepBS",
            "veBS",
            "hangVeBS",
            "luuCaBS",
            "cpKhacBS",
            "themDiem",
          ].map((k) => (
            <div key={k} className="col-span-3">
              <label className="block mb-1">{LABELS[k]}</label>
              <input
                name={k}
                value={form[k]}
                onChange={handleChange}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">
            Huỷ
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Bổ sung"}
          </button>
        </div>
      </div>
    </div>
  );
}
