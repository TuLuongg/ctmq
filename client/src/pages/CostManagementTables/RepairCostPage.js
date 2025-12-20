export default function RepairCostPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">CHI PHÍ SỬA XE</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Ngày</th>
            <th className="border p-2">Xe</th>
            <th className="border p-2">Hạng mục sửa</th>
            <th className="border p-2">Garage</th>
            <th className="border p-2">Chi phí</th>
            <th className="border p-2">Ghi chú</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
