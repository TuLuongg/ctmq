export default function SalaryCostPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">CHI PHÍ LƯƠNG</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Tháng</th>
            <th className="border p-2">Nhân viên</th>
            <th className="border p-2">Chức vụ</th>
            <th className="border p-2">Lương cơ bản</th>
            <th className="border p-2">Phụ cấp</th>
            <th className="border p-2">Tổng lương</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
