import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function DriverModal({ initialData = null, onClose, onSave, apiBase = `${API}/drivers` }) {

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
    { key: "licenseClass", label: "Hạng BL" },
    { key: "licenseIssuedAt", label: "Ngày cấp BL" },
    { key: "licenseExpiryAt", label: "Ngày hết hạn BL" },
    { key: "licenseImage", label: "Ảnh BL" },
    { key: "numberHDLD", label: "Số HĐLĐ" },
    { key: "dayStartWork", label: "Ngày vào làm" },
    { key: "dayEndWork", label: "Ngày nghỉ" },
    { key: "note", label: "Ghi chú" },
  ];

  const emptyForm = allColumns.reduce((acc, c) => ({ ...acc, [c.key]: "" }), {});

  const [form, setForm] = useState(emptyForm);

  const [licenseImageFile, setLicenseImageFile] = useState(null);
  const [licenseImageCCCDFile, setLicenseImageCCCDFile] = useState(null);
  const [previewLicense, setPreviewLicense] = useState("");
  const [previewCCCD, setPreviewCCCD] = useState("");

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
        if (c.key === "birthYear" ||
            c.key.includes("At") ||
            c.key.includes("Work")) {
          updated[c.key] = toInputDate(val);
        } else {
          updated[c.key] = val ?? "";
        }
      });

      setForm(updated);

      setPreviewLicense(initialData.licenseImage ? `${window.location.origin}${initialData.licenseImage}` : "");
      setPreviewCCCD(initialData.licenseImageCCCD ? `${window.location.origin}${initialData.licenseImageCCCD}` : "");
    } else {
      setForm(emptyForm);
      setPreviewLicense("");
      setPreviewCCCD("");
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e, type) => {
    const f = e.target.files[0];
    if (type === "license") {
      setLicenseImageFile(f);
      setPreviewLicense(f ? URL.createObjectURL(f) : "");
    } else if (type === "cccd") {
      setLicenseImageCCCDFile(f);
      setPreviewCCCD(f ? URL.createObjectURL(f) : "");
    }
  };

  // Convert input yyyy-MM-dd → Date ISO
  const normalizeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      const fd = new FormData();

      // Normalize dữ liệu trước khi gửi
      Object.keys(form).forEach((key) => {
        let val = form[key];

        if (key === "birthYear" ||
            key.includes("At") ||
            key.includes("Work")) {
          val = normalizeDate(val);
        }

        fd.append(key, val ?? "");
      });

      if (licenseImageFile) fd.append("licenseImage", licenseImageFile);
      if (licenseImageCCCDFile) fd.append("licenseImageCCCD", licenseImageCCCDFile);

      let res;
      if (initialData && initialData._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, fd);
      } else {
        res = await axios.post(apiBase, fd);
      }

      onSave(res.data);
      onClose();

    } catch (err) {
      console.error("Lỗi lưu lái xe:", err.response?.data || err.message);
      alert("Không lưu được: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-start z-50 p-6">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-3">{initialData ? "Sửa lái xe" : "Thêm lái xe"}</h2>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">

          {allColumns.map((c) => {
            if (c.key === "licenseImage" || c.key === "licenseImageCCCD") return null;

            let type = "text";
            if (c.key === "birthYear" ||
                c.key.includes("At") ||
                c.key.includes("Work")) {
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
            <label className="block text-sm font-medium mb-1">Ảnh bằng lái</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e, "license")} />
            {previewLicense && <img src={previewLicense} className="mt-2 max-h-40 rounded shadow-sm" />}
          </div>

          {/* Ảnh CCCD */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Ảnh CCCD</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e, "cccd")} />
            {previewCCCD && <img src={previewCCCD} className="mt-2 max-h-40 rounded shadow-sm" />}
          </div>

          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              {initialData ? "Cập nhật" : "Lưu"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
