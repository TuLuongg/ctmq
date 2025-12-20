export default function VehicleLegalCostPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">ĐĂNG KÝ - ĐĂNG KIỂM - BẢO HIỂM</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Xe</th>
            <th className="border p-2">Loại phí</th>
            <th className="border p-2">Ngày hiệu lực</th>
            <th className="border p-2">Ngày hết hạn</th>
            <th className="border p-2">Số tiền</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
