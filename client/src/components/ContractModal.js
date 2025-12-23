import { useState, useEffect } from "react";
import axios from "axios";

export default function ContractModal({ initialData, onClose, onSave, apiBase }) {
  const [formData, setFormData] = useState({
    khachHang: "",
    numberTrans: "",
    typeTrans: "",
    timeStart: "",
    timeEnd: "",
    timePay: "",
    yesOrNo: "",
    dayRequest: "",
    dayUse: "",
    price: 0,
    numberPrice: "",
    daDuyet: "",
    ghiChu: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        timeStart: initialData.timeStart ? new Date(initialData.timeStart).toISOString().slice(0, 10) : "",
        timeEnd: initialData.timeEnd ? new Date(initialData.timeEnd).toISOString().slice(0, 10) : "",
        timePay: initialData.timePay ? new Date(initialData.timePay).toISOString().slice(0, 10) : "",
        dayRequest: initialData.dayRequest ? new Date(initialData.dayRequest).toISOString().slice(0, 10) : "",
        dayUse: initialData.dayUse ? new Date(initialData.dayUse).toISOString().slice(0, 10) : "",
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      let res;
      if (initialData?._id) {
        res = await axios.put(`${apiBase}/${initialData._id}`, formData);
      } else {
        res = await axios.post(apiBase, formData);
      }
      onSave(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded p-5 shadow-lg w-[500px] max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-bold mb-4">
          {initialData ? "Sửa Hợp đồng" : "Thêm Hợp đồng"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col">
            Khách hàng
            <input
              name="khachHang"
              value={formData.khachHang}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Số hợp đồng
            <input
              name="numberTrans"
              value={formData.numberTrans}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Loại hợp đồng
            <input
              name="typeTrans"
              value={formData.typeTrans}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Thời gian bắt đầu
            <input
              name="timeStart"
              type="date"
              value={formData.timeStart}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Thời gian kết thúc
            <input
              name="timeEnd"
              type="date"
              value={formData.timeEnd}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Thời hạn thanh toán
            <input
              name="timePay"
              type="date"
              value={formData.timePay}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Có báo giá (Có/Không)
            <select
              name="yesOrNo"
              value={formData.yesOrNo}
              onChange={handleChange}
              className="border p-1 rounded"
            >
              <option value="">--Chọn--</option>
              <option value="Có">Có</option>
              <option value="Không">Không</option>
            </select>
          </label>

          <label className="flex flex-col">
            Ngày yêu cầu
            <input
              name="dayRequest"
              type="date"
              value={formData.dayRequest}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Ngày áp dụng
            <input
              name="dayUse"
              type="date"
              value={formData.dayUse}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Giá dầu
            <input
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Số báo giá
            <input
              name="numberPrice"
              value={formData.numberPrice}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col">
            Đã duyệt
            <input
              name="daDuyet"
              value={formData.daDuyet}
              onChange={handleChange}
              className="border p-1 rounded"
            />
          </label>

          <label className="flex flex-col col-span-2">
            Ghi chú
            <textarea
              name="ghiChu"
              value={formData.ghiChu}
              onChange={handleChange}
              className="border p-1 rounded w-full"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-gray-300 rounded"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1 bg-blue-600 text-white rounded"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
