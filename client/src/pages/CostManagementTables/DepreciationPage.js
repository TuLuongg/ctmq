export default function DepreciationPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">KHẤU HAO XE (TSCĐ)</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Xe</th>
            <th className="border p-2">Nguyên giá</th>
            <th className="border p-2">Thời gian KH</th>
            <th className="border p-2">KH/tháng</th>
            <th className="border p-2">Ghi chú</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
