import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

export default function VehicleModal({
  initialData = null,
  onClose,
  onSave,
  apiBase = `${API}/vehicles`,
}) {
  const [form, setForm] = useState({
    plateNumber: "",
    company: "",
    vehicleType: "",
    length: "",
    width: "",
    height: "",
    norm: "",
    resDay: "",
    resExpDay: "",
    insDay: "",
    insExpDay: "",
    dayTravel: "",
    note: "",
    bhTNDS: "",
    bhVC: "",
  });

  const [registrationImages, setRegistrationImages] = useState([]); // mảng
  const [inspectionImages, setInspectionImages] = useState([]); // mảng
  const [previewReg, setPreviewReg] = useState([]);
  const [previewInsp, setPreviewInsp] = useState([]);

  useEffect(() => {
    if (initialData) {
      setForm({
        plateNumber: initialData.plateNumber || "",
        company: initialData.company || "",
        vehicleType: initialData.vehicleType || "",
        length: initialData.length || "",
        width: initialData.width || "",
        height: initialData.height || "",
        norm: initialData.norm || "",
        resDay: formatDateForInput(initialData.resDay),
        resExpDay: formatDateForInput(initialData.resExpDay),
        insDay: formatDateForInput(initialData.insDay),
        insExpDay: formatDateForInput(initialData.insExpDay),
        dayTravel: formatDateForInput(initialData.dayTravel),
        note: initialData.note || "",
        bhTNDS: formatDateForInput(initialData.bhTNDS),
        bhVC: formatDateForInput(initialData.bhVC),
      });

      setPreviewReg(initialData.registrationImage || []);
      setPreviewInsp(initialData.inspectionImage || []);
    } else {
      setForm({
        plateNumber: "",
        company: "",
        vehicleType: "",
        length: "",
        width: "",
        height: "",
        norm: "",
        resDay: "",
        resExpDay: "",
        insDay: "",
        insExpDay: "",
        dayTravel: "",
        note: "",
        bhTNDS: "",
        bhVC: "",
      });
      setPreviewReg([]);
      setPreviewInsp([]);
      setRegistrationImages([]);
      setInspectionImages([]);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === "registration") {
      setRegistrationImages(files);
      setPreviewReg(files.map((f) => URL.createObjectURL(f)));
    } else {
      setInspectionImages(files);
      setPreviewInsp(files.map((f) => URL.createObjectURL(f)));
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.plateNumber.trim()) {
      return alert("Biển số xe không được để trống!");
    }

    const formData = new FormData();
    Object.keys(form).forEach((key) => formData.append(key, form[key] || ""));

    registrationImages.forEach((file) =>
      formData.append("registrationImage", file),
    );
    inspectionImages.forEach((file) =>
      formData.append("inspectionImage", file),
    );

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
      setPreviewReg(savedData.registrationImage || []);
      setPreviewInsp(savedData.inspectionImage || []);

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
        <h2 className="text-xl font-bold mb-3">
          {initialData ? "Sửa xe" : "Thêm xe"}
        </h2>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {/* Biển số */}
          <div>
            <label className="block text-xs font-medium">Biển số</label>
            <input
              name="plateNumber"
              value={form.plateNumber}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />
          </div>

          {/* Đơn vị */}
          <div>
            <label className="block text-xs font-medium">Đơn vị vận tải</label>
            <input
              name="company"
              value={form.company}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Loại xe */}
          <div>
            <label className="block text-xs font-medium">Loại xe</label>
            <input
              name="vehicleType"
              value={form.vehicleType}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Dài */}
          <div>
            <label className="block text-xs font-medium">Dài (m)</label>
            <input
              name="length"
              value={form.length}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Rộng */}
          <div>
            <label className="block text-xs font-medium">Rộng (m)</label>
            <input
              name="width"
              value={form.width}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Cao */}
          <div>
            <label className="block text-xs font-medium">Cao (m)</label>
            <input
              name="height"
              value={form.height}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Định mức */}
          <div>
            <label className="block text-xs font-medium">Định mức</label>
            <input
              name="norm"
              value={form.norm}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* ===== Ảnh đăng ký xe ===== */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">
              Ảnh đăng ký xe
            </label>
            <button
              type="button"
              className="bg-blue-500 text-white px-3 py-1 rounded mb-2"
              onClick={() => document.getElementById("regInput").click()}
            >
              Thêm ảnh
            </button>
            <input
              type="file"
              id="regInput"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setRegistrationImages((prev) => [...prev, ...files]);
                setPreviewReg((prev) => [
                  ...prev,
                  ...files.map((f) => URL.createObjectURL(f)),
                ]);
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {previewReg.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Đăng ký ${idx}`}
                    className="max-h-40 rounded shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFiles = registrationImages.filter(
                        (_, i) => i !== idx,
                      );
                      setRegistrationImages(newFiles);
                      setPreviewReg(
                        newFiles.map((f) => URL.createObjectURL(f)),
                      );
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ngày đăng ký */}
          <div>
            <label className="block text-xs font-medium">Ngày đăng ký</label>
            <input
              type="date"
              name="resDay"
              value={form.resDay}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Hết hạn đăng ký */}
          <div>
            <label className="block text-xs font-medium">
              Ngày hết hạn đăng ký
            </label>
            <input
              type="date"
              name="resExpDay"
              value={form.resExpDay}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* ===== Ảnh đăng kiểm xe ===== */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">
              Ảnh đăng kiểm xe
            </label>
            <button
              type="button"
              className="bg-blue-500 text-white px-3 py-1 rounded mb-2"
              onClick={() => document.getElementById("inspInput").click()}
            >
              Thêm ảnh
            </button>
            <input
              type="file"
              id="inspInput"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setInspectionImages((prev) => [...prev, ...files]);
                setPreviewInsp((prev) => [
                  ...prev,
                  ...files.map((f) => URL.createObjectURL(f)),
                ]);
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {previewInsp.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Đăng kiểm ${idx}`}
                    className="max-h-40 rounded shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFiles = inspectionImages.filter(
                        (_, i) => i !== idx,
                      );
                      setInspectionImages(newFiles);
                      setPreviewInsp(
                        newFiles.map((f) => URL.createObjectURL(f)),
                      );
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ngày đăng kiểm */}
          <div>
            <label className="block text-xs font-medium">Ngày đăng kiểm</label>
            <input
              type="date"
              name="insDay"
              value={form.insDay}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Hết hạn đăng kiểm */}
          <div>
            <label className="block text-xs font-medium">
              Ngày hết hạn đăng kiểm
            </label>
            <input
              type="date"
              name="insExpDay"
              value={form.insExpDay}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          {/* Ngày giấy đi đường */}
          <div>
            <label className="block text-xs font-medium">
              Ngày giấy đi đường
            </label>
            <input
              type="date"
              name="dayTravel"
              value={form.dayTravel}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Ghi chú */}
          <div className="col-span-2">
            <label className="block text-xs font-medium">Ghi chú</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Bảo hiểm TNDS</label>
            <input
              type="date"
              name="bhTNDS"
              value={form.bhTNDS}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Bảo hiểm VC</label>
            <input
              type="date"
              name="bhVC"
              value={form.bhVC}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {initialData ? "Cập nhật" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
