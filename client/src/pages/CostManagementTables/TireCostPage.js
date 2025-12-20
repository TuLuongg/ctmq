export default function TireCostPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">CHI PHÍ LỐP</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Ngày</th>
            <th className="border p-2">Xe</th>
            <th className="border p-2">Loại lốp</th>
            <th className="border p-2">Số lượng</th>
            <th className="border p-2">Đơn giá</th>
            <th className="border p-2">Thành tiền</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
