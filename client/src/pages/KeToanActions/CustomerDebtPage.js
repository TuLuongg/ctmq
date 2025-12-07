// CustomerDebtPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API from "../../api";
import PaymentHistoryModal from "../../components/PaymentHistoryModal";
import TripListModal from "../../components/TripListModal"

export default function CustomerDebtPage() {
  const token = localStorage.getItem("token");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [debtList, setDebtList] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showTripList, setShowTripList] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const isActive = (path) => location.pathname === path;

    // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", {state: {user}});
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", {state: {user}});
  }

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", {state: {user}});
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", {state: {user}});
  }

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", {state: {user}});
  }

  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", {state: {user}});
  }

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", {state: {user}});
  }

  const handleGoToVouchers = () => navigate("/voucher-list", { state: { user } });

        // 🔹 3 danh sách gợi ý
  const [customers, setCustomers] = useState([]);

    // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [customerRes] = await Promise.all([
        axios.get(`${API}/customers`),
      ]);
      setCustomers(customerRes.data);

    };
    fetchData();
  }, []);

  const loadData = async () => {
    const res = await axios.get(`${API}/payment-history/debt?month=${month}&year=${year}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
    setDebtList(res.data.filter((d) => d.maKH !== "26")); // ❗ loại khách 26
    console.log("Công nợ khách hàng:", res.data);
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const getCustomerName = (maKH) => {
  const found = customers.find(c => c.code === maKH);
  return found ? found.name : "";
};


  return (
    <div className="p-4 text-sm">
<div className="flex gap-2 items-center mb-4">
  <button
    onClick={() => navigate("/ke-toan")}
    className="px-3 py-1 rounded text-white bg-blue-500"
  >
    Trang chính
  </button>

  <button
    onClick={handleGoToDrivers}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách lái xe
  </button>

  <button
    onClick={handleGoToCustomers}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách khách hàng
  </button>

  <button
    onClick={handleGoToVehicles}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách xe
  </button>

  <button
    onClick={handleGoToTrips}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Danh sách chuyến phụ trách
  </button>

  <button
    onClick={() => {
      if(!user?.permissions?.includes("edit_trip")) {
        alert("Bạn không có quyền truy cập!");
        return;
      }
      handleGoToAllTrips();
    }}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Tất cả các chuyến
  </button>

  <button
    onClick={handleGoToAllCustomers}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Công nợ KH
  </button>

  <button
    onClick={handleGoToCustomer26}
    className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt-26") ? "bg-green-600" : "bg-blue-500"}
    `}
  >
    Công nợ khách lẻ
  </button>
  <button onClick={handleGoToVouchers} className={`px-3 py-1 rounded text-white ${isActive("/voucher-list") ? "bg-green-600" : "bg-blue-500"}`}>Sổ phiếu chi</button>
</div>
      <h1 className="text-xl font-bold mb-4">TỔNG CÔNG NỢ KHÁCH HÀNG</h1>

      {/* Bộ lọc tháng năm */}
      <div className="flex gap-3 mb-4">
        <input type="number" value={month} min={1} max={12}
          onChange={(e) => setMonth(e.target.value)} className="border p-2" />
        <input type="number" value={year}
          onChange={(e) => setYear(e.target.value)} className="border p-2" />
        <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded">
          Lọc
        </button>
      </div>

      {/* Bảng công nợ */}
      <div className="overflow-auto max-h-[600px] border">
  <table className="w-full border-collapse">
    <thead className="bg-gray-200">
      <tr>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Mã KH</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Tên KH</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Tổng cước</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Đã thanh toán</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Còn lại</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Trạng thái</th>
        <th className="border p-2 sticky top-0 bg-gray-200 z-10">Số chuyến</th>
      </tr>
    </thead>
    <tbody>
      {debtList.map((c) => (
        <tr key={c.maKH} className="h-[50px]">
          <td className="border p-2">{c.maKH}</td>
          <td className="border p-2">{getCustomerName(c.maKH)}</td>
          <td className="border p-2 text-blue-700 underline cursor-pointer"
              onClick={() => { setSelectedCustomer(c); setShowTripList(true); }}>
            {c.tongCuoc.toLocaleString()}
          </td>
          <td className="border p-2">{c.daThanhToan.toLocaleString()}</td>
          <td className="border p-2">{c.conLai.toLocaleString()}</td>
          <td className="border p-2">
            <div className="flex items-center gap-2 cursor-pointer"
                 onClick={() => { setSelectedCustomer(c); setShowPaymentHistory(true); }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  display: "inline-block",
                  backgroundColor:
                    c.trangThai === "green" ? "#00cc44" :
                    c.trangThai === "yellow" ? "#ffcc00" : "#ff3333",
                }}
              />
              <span>
                {c.trangThai === "green" ? "Hoàn tất" :
                 c.trangThai === "yellow" ? "Còn ít" : "Chưa trả"}
              </span>
            </div>
          </td>
          <td className="border p-2">{c.soChuyen}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


      {/* Modal lịch sử thanh toán */}
      {showPaymentHistory && (
        <PaymentHistoryModal
          customerCode={selectedCustomer.maKH}
          onClose={() => setShowPaymentHistory(false)}
        />
      )}

      {/* Modal danh sách mã chuyến */}
      {showTripList && (
        <TripListModal
          customer={selectedCustomer}
          month={month}
          year={year}
          onClose={() => setShowTripList(false)}
        />
      )}
    </div>
  );
}
