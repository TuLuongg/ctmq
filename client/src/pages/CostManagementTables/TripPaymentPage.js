export default function TripPaymentPage() {
  return (
    <>
      <h2 className="text-lg font-bold mb-3">THANH TOÁN TIỀN LỊCH TRÌNH</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Ngày thanh toán</th>
            <th className="border p-2">Mã chuyến</th>
            <th className="border p-2">Lái xe</th>
            <th className="border p-2">Tổng tiền</th>
            <th className="border p-2">Đã thanh toán</th>
            <th className="border p-2">Còn lại</th>
            <th className="border p-2">Hình thức</th>
            <th className="border p-2">Ghi chú</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </>
  );
}
