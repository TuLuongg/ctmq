import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VoucherCreateModal from "../../components/VoucherActions/VoucherCreateModal";
import VoucherDetailModal from "../../components/VoucherActions/VoucherDetailModal";
import API from "../../api";
import axios from "axios";

export default function VoucherListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [showOrigDetail, setShowOrigDetail] = useState(null); // ID phiếu gốc để show modal
  const token = localStorage.getItem("token");
  const [customers, setCustomers] = useState([]);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const navigate = useNavigate();
  const location = useLocation();
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const isActive = (path) => location.pathname === path;

  // navigation helpers (mirrors ManageCustomer)
  const handleGoToDrivers = () =>
    navigate("/manage-driver", { state: { user } });
  const handleGoToCustomers = () =>
    navigate("/manage-customer", { state: { user } });
  const handleGoToVehicles = () =>
    navigate("/manage-vehicle", { state: { user } });
  const handleGoToTrips = () => navigate("/manage-trip", { state: { user } });
  const handleGoToAllTrips = () =>
    navigate("/manage-all-trip", { state: { user } });
  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  // Load danh sách phiếu
  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/vouchers`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month, year },
      });
      setList(res.data);
    } catch (err) {
      console.error(err);
      alert("Không tải được danh sách phiếu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const res = await axios.get(`${API}/customers`);
      setCustomers(res.data);
    };
    fetchCustomers();
  }, []);

  // Tách ra 2 danh sách
  const vouchersOriginal = list.filter((v) => !v.adjustedFrom);
  const vouchersAdjusted = list.filter((v) => v.adjustedFrom);

  // Lấy thông tin phiếu gốc từ ID
  const getOriginalVoucher = (id) => list.find((v) => v._id === id);

  return (
    <div className="p-4 text-xs">
      <div className="flex gap-2 items-center mb-4">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white bg-blue-500"
        >
          Trang chính
        </button>

        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách lái xe
        </button>
        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách khách hàng
        </button>
        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách xe
        </button>
        <button
          onClick={handleGoToTrips}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Danh sách chuyến phụ trách
        </button>
        <button
          onClick={() => {
            if (!user?.permissions?.includes("edit_trip")) {
              alert("Bạn không có quyền truy cập!");
              return;
            }
            handleGoToAllTrips();
          }}
          className={`px-3 py-1 rounded text-white ${
            isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"
          }`}
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
        <button
          onClick={handleGoToVouchers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/voucher-list") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Sổ phiếu chi
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        {" "}
        <h1 className="text-lg font-bold">SỔ PHIẾU CHI</h1>{" "}
      </div>
      {/* Bộ lọc tháng/năm */}
      <div className="mb-4">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border px-2 py-1 rounded mr-2"
        >
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              Tháng {i + 1}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border px-2 py-1 rounded mr-2"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              Năm {y}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setMonth(now.getMonth() + 1);
            setYear(now.getFullYear());
          }}
          className="px-3 py-1 rounded bg-blue-500 text-white mr-2"
        >
          RESET
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1 rounded bg-green-600 text-white"
        >
          Tạo phiếu mới
        </button>
      </div>

      {/* Bảng phiếu gốc */}
      <h2 className="font-bold mb-2">Phiếu gốc</h2>
      <div className="overflow-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2">STT</th>
              <th className="border p-2">Ngày</th>
              <th className="border p-2">Tài khoản chi</th>
              <th className="border p-2">Người nhận</th>
              <th className="border p-2">Tên công ty</th>
              <th className="border p-2">Nội dung</th>
              <th className="border p-2">Số tiền</th>
              <th className="border p-2">Trạng thái</th>
              <th className="border p-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="p-4 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : vouchersOriginal.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-4 text-center">
                  Không có phiếu gốc
                </td>
              </tr>
            ) : (
              vouchersOriginal.map((v, idx) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="border p-2">{idx + 1}</td>
                  <td className="border p-2">
                    {new Date(v.dateCreated).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="border p-2">
                    {v.paymentSource === "caNhan" ? "Cá nhân" : "Công ty"}
                  </td>
                  <td className="border p-2">{v.receiverName}</td>
                  <td className="border p-2">{v.receiverCompany}</td>
                  <td className="border p-2">
                    {v.transferContent || v.reason}
                  </td>
                  <td className="border p-2 text-right">
                    {v.amount?.toLocaleString()}
                  </td>
                  <td className="border p-2 text-center font-semibold">
                    {v.status === "waiting_check" && (
                      <span className="text-yellow-600">Đang chờ duyệt</span>
                    )}
                    {v.status === "approved" && (
                      <span className="text-green-600">Đã duyệt</span>
                    )}
                  </td>
                  <td className="border p-2">
                    <div className="flex justify-center items-center gap-2">
                      <button
                        className="text-blue-600"
                        onClick={() => setDetailId(v._id)}
                      >
                        Xem
                      </button>
                      <button
                        className="text-red-600"
                        onClick={() => window.open(`/voucher/${v._id}/print`)}
                      >
                        In phiếu
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bảng phiếu điều chỉnh */}
      <h2 className="font-bold mb-2">Phiếu điều chỉnh</h2>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2">STT</th>
              <th className="border p-2">Ngày</th>
              <th className="border p-2">Tài khoản chi</th>
              <th className="border p-2">Người nhận</th>
              <th className="border p-2">Tên công ty</th>
              <th className="border p-2">Nội dung</th>
              <th className="border p-2">Số tiền</th>
              <th className="border p-2">Phiếu gốc</th>
              <th className="border p-2">Trạng thái</th>
              <th className="border p-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="p-4 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : vouchersAdjusted.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-4 text-center">
                  Không có phiếu điều chỉnh
                </td>
              </tr>
            ) : (
              vouchersAdjusted.map((v, idx) => {
                const orig = getOriginalVoucher(v.adjustedFrom);
                return (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2">
                      {new Date(v.dateCreated).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="border p-2">
                      {v.paymentSource === "caNhan" ? "Cá nhân" : "Công ty"}
                    </td>
                    <td className="border p-2">{v.receiverName}</td>
                    <td className="border p-2">{v.receiverCompany}</td>
                    <td className="border p-2">
                      {v.transferContent || v.reason}
                    </td>
                    <td className="border p-2 text-right">
                      {v.amount?.toLocaleString()}
                    </td>
                    <td className="border p-2">
                      {orig ? (
                        <button
                          className="text-blue-600 underline"
                          onClick={() => setShowOrigDetail(orig._id)}
                        >
                          {orig._id.slice(-6)}{" "}
                          {/* hiển thị 6 ký tự cuối làm tham chiếu */}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border p-2 text-center font-semibold">
                      {v.status === "waiting_check" && (
                        <span className="text-yellow-600">Đang chờ duyệt</span>
                      )}
                      {v.status === "approved" && (
                        <span className="text-green-600">Đã duyệt</span>
                      )}
                    </td>
                    <td className="border p-2">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          className="text-blue-600"
                          onClick={() => setDetailId(v._id)}
                        >
                          Xem
                        </button>
                        <button
                          className="text-red-600"
                          onClick={() => window.open(`/voucher/${v._id}/print`)}
                        >
                          In phiếu
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreate && (
        <VoucherCreateModal
          customers={customers}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {detailId && (
        <VoucherDetailModal
          id={detailId}
          customers={customers}
          onClose={() => {
            setDetailId(null);
            load();
          }}
        />
      )}
      {showOrigDetail && (
        <VoucherDetailModal
          id={showOrigDetail}
          customers={customers}
          onClose={() => setShowOrigDetail(null)}
        />
      )}
    </div>
  );
}
