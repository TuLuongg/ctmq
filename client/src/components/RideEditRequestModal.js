import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

export default function RideEditRequestModal({
  ride,
  onClose,
  onSubmitEdit,
  dieuVanList = [],
  currentUser,
  drivers = [],
  customers = [],
}) {
  const [form, setForm] = useState(ride || {});
  const [reason, setReason] = useState("");
  const [checkedFees, setCheckedFees] = useState({
    bocXep: false,
    hangVe: false,
    ve: false,
    luuCa: false,
    luatChiPhiKhac: false,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [changes, setChanges] = useState([]);

  const moneyFields = ["cuocPhi","bocXep","ve","hangVe","luuCa","luatChiPhiKhac"];

  useEffect(() => {
    if (ride) {
      setForm(ride);
      setCheckedFees({
        bocXep: !!ride.bocXep,
        hangVe: !!ride.hangVe,
        ve: !!ride.ve,
        luuCa: !!ride.luuCa,
        luatChiPhiKhac: !!ride.luatChiPhiKhac,
      });
    }
  }, [ride]);

  const formatMoney = (value) => (value || value===0) ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

  const numberToVietnameseText = (num) => {
    if (!num) return "";
    const number = parseInt(num.toString().replace(/\D/g, ""), 10);
    if (isNaN(number)) return "";
    const ChuSo = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
    const DonVi = ["","nghìn","triệu","tỷ"];
    const readTriple = (n) => {
      let tram = Math.floor(n/100);
      let chuc = Math.floor((n%100)/10);
      let donvi = n%10;
      let s = "";
      if(tram>0) s += ChuSo[tram]+" trăm ";
      if(chuc>1) s += ChuSo[chuc]+" mươi ";
      if(chuc===1) s += "mười ";
      if(chuc!==0 && donvi===1) s += "mốt ";
      else if(donvi===5 && chuc!==0) s += "lăm ";
      else if(donvi!==0) s += ChuSo[donvi]+" ";
      return s.trim();
    };
    let i=0, text="";
    let tempNumber = number;
    while(tempNumber>0){
      let n = tempNumber % 1000;
      if(n!==0) text = readTriple(n)+" "+DonVi[i]+" "+text;
      tempNumber = Math.floor(tempNumber/1000);
      i++;
    }
    return text.trim()+" VNĐ";
  };

  const safeDate = (val) => val ? (isNaN(new Date(val).getTime()) ? null : new Date(val)) : null;
  const toISO = (date) => date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}` : "";

  useEffect(() => {
    if (!currentUser || !dieuVanList.length) return;
    const selected = dieuVanList.find(d => d._id===currentUser._id) || dieuVanList.find(d => d.username===currentUser.username);
    if (selected) {
      setForm(prev => ({
        ...prev,
        dieuVanID: prev.dieuVanID || selected._id,
        dieuVan: prev.dieuVan || selected.fullname || selected.username,
        createdByID: prev.createdByID || selected._id,
        createdBy: prev.createdBy || selected.fullname || selected.username,
      }));
    }
  }, [currentUser, dieuVanList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (moneyFields.includes(name)) {
      setForm(prev => ({ ...prev, [name]: value.replace(/\./g, "") }));
      return;
    }
    if (name === "khachHang") {
      const matched = customers.find(c => (c.name||c.tenKhachHang)?.trim()?.toLowerCase()===value.trim().toLowerCase());
      if (matched) {
        setForm(prev => ({
          ...prev,
          khachHang: value,
          maKH: matched.code,
          keToanPhuTrach: matched.accountant || "",
          accountUsername: matched.accUsername || "",
        }));
        return;
      }
    }
    if (name === "bienSoXe") {
      const matched = drivers.find(d => d.bsx?.toLowerCase()===value.toLowerCase());
      setForm(prev => ({ ...prev, bienSoXe: value, tenLaiXe: matched ? matched.name || matched.tenLaiXe : "" }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDieuVanChange = (e) => {
    const selected = dieuVanList.find(d => d._id===e.target.value);
    setForm(prev => ({ ...prev, dieuVanID: selected?._id || "", dieuVan: selected?.fullname || selected?.username || "" }));
  };

  const toggleFee = (key) => {
    setCheckedFees(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) setForm(p => ({ ...p, [key]: "" }));
      return next;
    });
  };

const fieldLabels = {
  dieuVanID: "Điều vận phụ trách",
  bienSoXe: "Biển số xe",
  khachHang: "Khách hàng",
  dienGiai: "Diễn giải",
  diemXepHang: "Điểm đóng hàng",
  ngayBocHang: "Ngày đóng hàng",
  diemDoHang: "Điểm giao hàng",
  ngayGiaoHang: "Ngày giao hàng",
  soDiem: "Số điểm",
  trongLuong: "Trọng lượng",
  cuocPhi: "Cước phí",
  bocXep: "Bốc xếp",
  hangVe: "Hàng về",
  ve: "Vé",
  luuCa: "Lưu ca",
  luatChiPhiKhac: "Chi phí khác",
  tenLaiXe: "Tên lái xe",
  keToanPhuTrach: "Kế toán phụ trách",
  accountUsername: "Tên tài khoản",
  dieuVan: "Điều vận",
  khachHang: "Khách hàng",
  // loại bỏ createdByID
};

const handleSaveClick = (e) => {
  e.preventDefault();
  if (!reason.trim()) { alert("Vui lòng nhập lý do chỉnh sửa!"); return; }

  const changed = [];
  for (const key in form) {
    if (key === "createdByID") continue; // bỏ createdByID
    if (form[key] !== ride[key]) {
      changed.push({
        field: key,
        label: fieldLabels[key] || key,
        oldValue: ride[key],
        newValue: form[key],
      });
    }
  }
  if (changed.length===0) { alert("Không có thay đổi nào!"); return; }

  setChanges(changed);
  setShowConfirm(true);
};


  const handleConfirm = () => {
    const payload = {
      rideID: form._id,
      newData: form,
      editorID: currentUser._id,
      editorName: currentUser.fullname || currentUser.username,
      reason: reason.trim(),
    };
    onSubmitEdit(payload);
    setShowConfirm(false);
    setForm({});
    setReason("");
  };

  const handleCancelConfirm = () => setShowConfirm(false);
  const handleClose = () => { setForm({}); setReason(""); onClose(); };

  const fields = [
    { name: "bienSoXe", label: "Biển số xe", type: "text", list: "bsxList" },
    { name: "khachHang", label: "Khách hàng", type: "text", list: "customerList" },
    { name: "dienGiai", label: "Diễn giải", type: "text" },
    { name: "diemXepHang", label: "Điểm đóng hàng", type: "text" },
    { name: "ngayBocHang", label: "Ngày đóng hàng", type: "date" },
    { name: "diemDoHang", label: "Điểm giao hàng", type: "text" },
    { name: "ngayGiaoHang", label: "Ngày giao hàng", type: "date" },
    { name: "soDiem", label: "Số điểm", type: "text" },
    { name: "trongLuong", label: "Trọng lượng", type: "text" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa chuyến</h2>

        {!showConfirm ? (
          <form className="grid grid-cols-2 gap-4">
            {/* Điều vận */}
            <div>
              <label className="block text-sm font-medium mb-1">Điều vận phụ trách</label>
              <select
                name="dieuVanID"
                value={form.dieuVanID||""}
                onChange={handleDieuVanChange}
                className="border p-2 w-full rounded"
              >
                <option value="">-- Chọn điều vận --</option>
                {dieuVanList.map(d=><option key={d._id} value={d._id}>{d.fullname||d.username}</option>)}
              </select>
            </div>
            {/* Trong return() của form, trước hoặc sau form fields, thêm các datalist */}
<datalist id="customerList">
  {customers.map(c => (
    <option key={c._id} value={c.tenKhachHang || c.name} />
  ))}
</datalist>

<datalist id="bsxList">
  {drivers.filter(d => d.bsx).map(d => (
    <option key={d._id} value={d.bsx} />
  ))}
</datalist>


            {fields.map(f=>(
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                {f.type==="date" ? (
                  <DatePicker
                    locale="vi"
                    selected={safeDate(form[f.name])}
                    onChange={date=>setForm(prev=>({...prev,[f.name]:toISO(date)}))}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 w-full rounded"
                    placeholderText="dd/mm/yyyy"
                    popperPlacement="right-start"
                  />
                ) : (
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name]||""}
                    onChange={handleChange}
                    list={f.list === "customerList" || f.list === "bsxList" ? f.list : undefined}
                    className="border p-2 w-full rounded"
                  />
                )}
              </div>
            ))}

            {/* Cước phí + chi phí phụ */}
            <div className="col-span-2 flex items-start gap-10">
              <div className="w-60">
                <label className="block text-sm font-medium mb-1">
                  Cước phí {form.cuocPhi&&<span className="text-xs text-gray-500 ml-2">({numberToVietnameseText(form.cuocPhi)})</span>}
                </label>
                <input type="text" name="cuocPhi" value={formatMoney(form.cuocPhi)} onChange={handleChange} className="border p-2 w-full rounded"/>
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium mb-1">Chi phí phụ</label>
                <div className="flex flex-wrap items-center gap-6">
                  {[
                    ["bocXep","Bốc xếp"],
                    ["hangVe","Hàng về"],
                    ["ve","Vé"],
                    ["luuCa","Lưu ca"],
                    ["luatChiPhiKhac","Chi phí khác"],
                    ["laiXeThuCuoc", "Lái xe thu cước"],
                  ].map(([key,label])=>(
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={checkedFees[key]} onChange={()=>toggleFee(key)}/>
                      <span>{label}{checkedFees[key]&&form[key]&&<span className="text-[12px] text-gray-800 ml-1">({numberToVietnameseText(form[key])})</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs chi phí phụ */}
            <div className="col-span-2 flex items-center gap-4 mt-3">
              {checkedFees.bocXep && <div className="flex flex-col w-32"><label className="text-xs mb-1">Bốc xếp</label><input type="text" name="bocXep" value={formatMoney(form.bocXep)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
              {checkedFees.hangVe && <div className="flex flex-col w-32"><label className="text-xs mb-1">Hàng về</label><input type="text" name="hangVe" value={formatMoney(form.hangVe)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
              {checkedFees.ve && <div className="flex flex-col w-32"><label className="text-xs mb-1">Vé</label><input type="text" name="ve" value={formatMoney(form.ve)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
              {checkedFees.luuCa && <div className="flex flex-col w-32"><label className="text-xs mb-1">Lưu ca</label><input type="text" name="luuCa" value={formatMoney(form.luuCa)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
              {checkedFees.luatChiPhiKhac && <div className="flex flex-col w-40"><label className="text-xs mb-1">Chi phí khác</label><input type="text" name="luatChiPhiKhac" value={formatMoney(form.luatChiPhiKhac)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
              {checkedFees.laiXeThuCuoc && <div className="flex flex-col w-40"><label className="text-xs mb-1">Lái xe thu cước</label><input type="text" name="laiXeThuCuoc" value={formatMoney(form.laiXeThuCuoc)} onChange={handleChange} className="border p-2 rounded" placeholder="0"/></div>}
            </div>

            {/* Lý do chỉnh sửa */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Lý do chỉnh sửa</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} className="border p-2 w-full rounded" rows={3} required/>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={handleClose} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>
              <button type="button" onClick={handleSaveClick} className="bg-blue-500 text-white px-4 py-2 rounded">Lưu chỉnh sửa</button>
            </div>
          </form>
        ) : (
          <div>
            <h3 className="text-lg font-bold mb-2">Xác nhận thay đổi</h3>
            <div className="mb-4 max-h-64 overflow-y-auto">
  {changes.map(c => (
    <div key={c.field} className="mb-1">
      <b>{c.label}:</b> <span className="line-through text-red-500">{c.oldValue || "—"}</span> → <span className="text-green-700">{c.newValue || "—"}</span>
    </div>
  ))}
</div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleCancelConfirm} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>
              <button onClick={handleConfirm} className="bg-green-500 text-white px-4 py-2 rounded">Xác nhận</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
