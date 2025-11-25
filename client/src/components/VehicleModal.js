import { useState, useEffect } from "react";
import axios from "axios";

export default function VehicleModal({ initialData = null, onClose, onSave, apiBase = "http://localhost:4000/api/vehicles" }) {
  const [form, setForm] = useState({
    plateNumber: "",
    company: "",
    vehicleType: "",
  });

  const [registrationImage, setRegistrationImage] = useState(null);
  const [inspectionImage, setInspectionImage] = useState(null);
  const [previewReg, setPreviewReg] = useState("");
  const [previewInsp, setPreviewInsp] = useState("");

  // Khởi tạo form và preview khi edit
  useEffect(() => {
    if (initialData) {
      setForm({
        plateNumber: initialData.plateNumber || "",
        company: initialData.company || "",
        vehicleType: initialData.vehicleType || "",
      });
      setPreviewReg(initialData.registrationImage || "");
      setPreviewInsp(initialData.inspectionImage || "");
    } else {
      setForm({ plateNumber: "", company: "", vehicleType: "" });
      setPreviewReg("");
      setPreviewInsp("");
      setRegistrationImage(null);
      setInspectionImage(null);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (type === "registration") {
      setRegistrationImage(file);
      if (file) setPreviewReg(URL.createObjectURL(file));
    } else {
      setInspectionImage(file);
      if (file) setPreviewInsp(URL.createObjectURL(file));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.plateNumber.trim()) {
      return alert("Biển số xe không được để trống!");
    }

    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key] || ""));
    if (registrationImage) formData.append("registrationImage", registrationImage);
    if (inspectionImage) formData.append("inspectionImage", inspectionImage);

    try {
      let res;
      if (initialData?._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axios.post(apiBase, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const savedData = res.data;

      // Cập nhật preview ngay sau khi lưu để hiển thị Cloudinary URL
      setPreviewReg(savedData.registrationImage || "");
      setPreviewInsp(savedData.inspectionImage || "");

      onSave(savedData);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu xe:", err.response?.data || err.message);
      alert("Không lưu được xe: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-3">{initialData ? "Sửa xe" : "Thêm xe"}</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Biển số</label>
            <input name="plateNumber" value={form.plateNumber} onChange={handleChange} className="border p-2 w-full rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Đơn vị vận tải</label>
            <input name="company" value={form.company} onChange={handleChange} className="border p-2 w-full rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Loại xe</label>
            <input name="vehicleType" value={form.vehicleType} onChange={handleChange} className="border p-2 w-full rounded" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium">Ảnh đăng ký xe</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e, "registration")} />
            {previewReg && <img src={previewReg} alt="Đăng ký" className="mt-2 max-h-40 rounded shadow-sm" />}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium">Ảnh đăng kiểm xe</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e, "inspection")} />
            {previewInsp && <img src={previewInsp} alt="Đăng kiểm" className="mt-2 max-h-40 rounded shadow-sm" />}
          </div>

          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">{initialData ? "Cập nhật" : "Lưu"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
