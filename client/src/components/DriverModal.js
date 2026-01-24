import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function DriverModal({
  initialData = null,
  onClose,
  onSave,
  apiBase = `${API}/drivers`,
}) {
  const allColumns = [
    { key: "name", label: "Họ tên lái xe" },
    { key: "nameZalo", label: "Tên Zalo" },
    { key: "birthYear", label: "Ngày sinh" },
    { key: "company", label: "Đơn vị" },
    { key: "bsx", label: "Biển số xe" },
    { key: "phone", label: "SĐT" },
    { key: "hometown", label: "Quê quán" },
    { key: "resHometown", label: "HKTT" },
    { key: "address", label: "Nơi ở hiện tại" },
    { key: "cccd", label: "CCCD" },
    { key: "cccdIssuedAt", label: "Ngày cấp CCCD" },
    { key: "cccdExpiryAt", label: "Ngày hết hạn CCCD" },
    { key: "licenseImageCCCD", label: "Ảnh CCCD" },
    { key: "numberClass", label: "Số GPLX" },
    { key: "licenseClass", label: "Hạng BL" },
    { key: "licenseIssuedAt", label: "Ngày cấp BL" },
    { key: "licenseExpiryAt", label: "Ngày hết hạn BL" },
    { key: "licenseImage", label: "Ảnh BL" },
    { key: "numberHDLD", label: "Số HĐLĐ" },
    { key: "dayStartWork", label: "Ngày vào làm" },
    { key: "dayEndWork", label: "Ngày nghỉ" },
  ];

  const emptyForm = allColumns.reduce(
    (acc, c) => ({ ...acc, [c.key]: "" }),
    {}
  );

  const [form, setForm] = useState(emptyForm);

  const [licenseFiles, setLicenseFiles] = useState([]); // File[]
  const [cccdFiles, setCccdFiles] = useState([]); // File[]

  const [previewLicense, setPreviewLicense] = useState([]); // string[]
  const [previewCCCD, setPreviewCCCD] = useState([]); // string[]

  const removeImage = (type, index) => {
    if (type === "license") {
      setPreviewLicense((prev) => prev.filter((_, i) => i !== index));
      setLicenseFiles((prev) => prev.filter((_, i) => i !== index));
    }

    if (type === "cccd") {
      setPreviewCCCD((prev) => prev.filter((_, i) => i !== index));
      setCccdFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Convert từ value nhận về → input type="date"
  const toInputDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().substring(0, 10);
  };

  useEffect(() => {
    if (initialData) {
      const updated = {};

      allColumns.forEach((c) => {
        const val = initialData[c.key];

        // Trường Date
        if (
          c.key === "birthYear" ||
          c.key.includes("At") ||
          c.key.includes("Work")
        ) {
          updated[c.key] = toInputDate(val);
        } else {
          updated[c.key] = val ?? "";
        }
      });

      setForm(updated);

      setPreviewLicense(
        Array.isArray(initialData.licenseImage) ? initialData.licenseImage : []
      );

      setPreviewCCCD(
        Array.isArray(initialData.licenseImageCCCD)
          ? initialData.licenseImageCCCD
          : []
      );
    } else {
      setForm(emptyForm);
      setPreviewLicense([]);
      setPreviewCCCD([]);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e, type) => {
    const files = Array.from(e.target.files || []);

    if (type === "license") {
      setLicenseFiles((prev) => [...prev, ...files]);
      setPreviewLicense((prev) => [
        ...prev,
        ...files.map((f) => URL.createObjectURL(f)),
      ]);
    }

    if (type === "cccd") {
      setCccdFiles((prev) => [...prev, ...files]);
      setPreviewCCCD((prev) => [
        ...prev,
        ...files.map((f) => URL.createObjectURL(f)),
      ]);
    }
  };

  // Convert input yyyy-MM-dd → Date ISO
  const normalizeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // chặn bấm lần 2
    setIsSubmitting(true);

    try {
      const fd = new FormData();

      Object.keys(form).forEach((key) => {
        let val = form[key];

        if (key === "birthYear" || key.includes("At") || key.includes("Work")) {
          val = normalizeDate(val);
        }

        fd.append(key, val ?? "");
      });

      licenseFiles.forEach((f) => fd.append("licenseImage", f));
      cccdFiles.forEach((f) => fd.append("licenseImageCCCD", f));

      let res;
      if (initialData && initialData._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, fd);
      } else {
        res = await axios.post(apiBase, fd);
      }

      onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu:", err.response?.data || err.message);
      alert("Không lưu được");
      setIsSubmitting(false); // 🔴 mở lại khi lỗi
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-6">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-3">
          {initialData ? "Sửa lái xe" : "Thêm lái xe"}
        </h2>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {allColumns.map((c) => {
            if (c.key === "licenseImage" || c.key === "licenseImageCCCD")
              return null;

            let type = "text";
            if (
              c.key === "birthYear" ||
              c.key.includes("At") ||
              c.key.includes("Work")
            ) {
              type = "date";
            }

            return (
              <div key={c.key}>
                <label className="block text-sm font-medium">{c.label}</label>
                <input
                  name={c.key}
                  type={type}
                  value={form[c.key]}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                />
              </div>
            );
          })}

          {/* Ảnh BL */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Ảnh bằng lái
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e, "license")}
            />

            <div className="flex gap-2 mt-2 flex-wrap">
              {previewLicense.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} className="h-32 rounded border" />
                  <button
                    type="button"
                    onClick={() => removeImage("license", idx)}
                    className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ảnh CCCD */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Ảnh CCCD</label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e, "cccd")}
            />

            <div className="flex gap-2 mt-2 flex-wrap">
              {previewCCCD.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} className="h-32 rounded border" />
                  <button
                    type="button"
                    onClick={() => removeImage("cccd", idx)}
                    className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
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
              disabled={isSubmitting}
              className={`px-4 py-2 rounded text-white
    ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"}
  `}
            >
              {isSubmitting ? "Đang lưu..." : initialData ? "Cập nhật" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
