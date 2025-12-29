import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VoucherCreateModal from "../../components/VoucherActions/VoucherCreateModal";
import VoucherDetailModal from "../../components/VoucherActions/VoucherDetailModal";
import API from "../../api";
import axios from "axios";

const PAYMENT_SOURCE_LABEL = {
  PERSONAL_VCB: "Cá nhân - VCB",
  PERSONAL_TCB: "Cá nhân - TCB",
  COMPANY_VCB: "Công ty - VCB",
  COMPANY_TCB: "Công ty - TCB",
  CASH: "Tiền mặt",
  OTHER: "Khác",
};

const cellStyle = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
  maxWidth: "100%",
};


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

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

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

  const handleApproveAdjusted = async (id) => {
    if (
      !window.confirm("Duyệt phiếu điều chỉnh này? Phiếu gốc sẽ được cập nhật!")
    )
      return;

    try {
      await axios.post(
        `${API}/vouchers/${id}/approve-adjust`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Đã duyệt phiếu điều chỉnh");
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Duyệt thất bại");
    }
  };

  // Tách ra 2 danh sách
  const vouchersOriginal = list.filter((v) => !v.adjustedFrom);
  const vouchersAdjusted = list.filter((v) => v.adjustedFrom);

  // Lấy thông tin phiếu gốc từ ID
  const getOriginalVoucher = (id) => list.find((v) => v._id === id);

  // ==== DRAG + RESIZE CỘT ====
  const [dragCol, setDragCol] = useState(null);

  // thứ tự cột PHIẾU GỐC
  const [originColOrder, setOriginColOrder] = useState([
    "select",
    "stt",
    "date",
    "code",
    "source",
    "receiver",
    "company",
    "content",
    "reason",
    "transferDate",
    "amount",
    "status",
    "action",
  ]);

  // thứ tự cột PHIẾU ĐIỀU CHỈNH
  const [adjustColOrder, setAdjustColOrder] = useState([
    "stt",
    "date",
    "code",
    "source",
    "receiver",
    "company",
    "content",
    "reason",
    "transferDate",
    "amount",
    "orig",
    "status",
    "action",
  ]);

  const moveCol = (cols, from, to, setCols) => {
    const next = [...cols];
    const iFrom = next.indexOf(from);
    const iTo = next.indexOf(to);
    next.splice(iTo, 0, next.splice(iFrom, 1)[0]);
    setCols(next);
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const toggleSelectAll = (list) => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((v) => v._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [transferDateBulk, setTransferDateBulk] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleUpdateTransferDateBulk = async () => {
    if (selectedIds.length === 0) {
      alert("Chưa chọn phiếu nào");
      return;
    }

    if (!transferDateBulk) {
      alert("Chưa chọn ngày chuyển tiền");
      return;
    }

    if (
      !window.confirm(
        `Cập nhật ngày chuyển tiền cho ${selectedIds.length} phiếu?`
      )
    )
      return;

    try {
      setUpdating(true);

      await axios.put(
        `${API}/vouchers/transfer-date/bulk`,
        {
          voucherIds: selectedIds,
          transferDate: transferDateBulk,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Cập nhật ngày chuyển tiền thành công");

      setSelectedIds([]);
      setTransferDateBulk("");
      load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setUpdating(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 60 }, (_, i) => currentYear - 30 + i);
  // từ (năm hiện tại - 20) → (năm hiện tại + 29)

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
        <button
          onClick={handleGoToContract}
          className={`px-3 py-1 rounded text-white ${
            isActive("/contract") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className={`px-3 py-1 rounded text-white ${
            isActive("/tcb-person") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          TCB cá nhân
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
          {YEARS.map((y) => (
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
      <div className="flex items-center gap-3 mb-2">
        <span className="font-semibold">
          Đã chọn: {selectedIds.length} phiếu
        </span>

        <input
          type="date"
          value={transferDateBulk}
          onChange={(e) => setTransferDateBulk(e.target.value)}
          onClick={(e) => e.target.showPicker()}
          className="border px-2 py-1 rounded cursor-pointer"
        />

        <button
          disabled={updating || selectedIds.length === 0}
          onClick={handleUpdateTransferDateBulk}
          className={`px-3 py-1 rounded text-white ${
            updating || selectedIds.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {updating ? "Đang cập nhật..." : "Cập nhật ngày chuyển tiền"}
        </button>
      </div>

      <div className="overflow-auto mb-6 max-h-[600px] border min-w-0">
        <table
          style={{
            tableLayout: "fixed",
            width: "max-content",
            maxWidth: "max-content",
            borderCollapse: "separate", // important: avoid collapse seams
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {originColOrder.map((key) => (
                <th
                  key={key}
                  draggable
                  onDragStart={() => setDragCol(key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() =>
                    moveCol(originColOrder, dragCol, key, setOriginColOrder)
                  }
                  className="border p-2 resize-x overflow-hidden select-none"
                  style={{ resize: "horizontal", ...cellStyle }}
                >
                  {
                    {
                      select: (
                        <input
                          type="checkbox"
                          checked={
                            vouchersOriginal.length > 0 &&
                            selectedIds.length === vouchersOriginal.length
                          }
                          onChange={() => toggleSelectAll(vouchersOriginal)}
                        />
                      ),
                      stt: "STT",
                      date: "Ngày tạo phiếu",
                      code: "Mã phiếu chi",
                      source: "Tài khoản chi",
                      receiver: "Người nhận",
                      company: "Tên công ty",
                      content: "Nội dung",
                      reason: "Lý do chi",
                      transferDate: "Ngày chuyển tiền",
                      amount: "Số tiền",
                      status: "Trạng thái",
                      action: "Hành động",
                    }[key]
                  }
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={originColOrder.length} className="p-4 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : vouchersOriginal.length === 0 ? (
              <tr>
                <td colSpan={originColOrder.length} className="p-4 text-center">
                  Không có phiếu gốc
                </td>
              </tr>
            ) : (
              vouchersOriginal.map((v, idx) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  {originColOrder.map((col) => {
                    switch (col) {
                      case "select":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2 text-center"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(v._id)}
                              onChange={() => toggleSelectOne(v._id)}
                            />
                          </td>
                        );

                      case "stt":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {idx + 1}
                          </td>
                        );
                      case "date":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {new Date(v.dateCreated).toLocaleDateString(
                              "vi-VN"
                            )}
                          </td>
                        );
                      case "code":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {v.voucherCode}
                          </td>
                        );
                      case "source":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {PAYMENT_SOURCE_LABEL[v.paymentSource] ||
                              v.paymentSource}
                          </td>
                        );
                      case "receiver":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {v.receiverName}
                          </td>
                        );
                      case "company":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {v.receiverCompany}
                          </td>
                        );
                      case "content":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {v.transferContent}
                          </td>
                        );
                      case "reason":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            {v.reason}
                          </td>
                        );
                      case "transferDate":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2 text-center"
                          >
                            {v.transferDate
                              ? new Date(v.transferDate).toLocaleDateString(
                                  "vi-VN"
                                )
                              : "-"}
                          </td>
                        );

                      case "amount":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2 text-right"
                          >
                            {v.amount?.toLocaleString()}
                          </td>
                        );
                      case "status":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2 text-center font-semibold"
                          >
                            {v.status === "waiting_check" && (
                              <span className="text-yellow-600">
                                Đang chờ duyệt
                              </span>
                            )}
                            {v.status === "approved" && (
                              <span className="text-green-600">Đã duyệt</span>
                            )}
                            {v.status === "adjusted" && (
                              <span className="text-purple-600">
                                Đã điều chỉnh
                              </span>
                            )}
                          </td>
                        );
                      case "action":
                        return (
                          <td
                            key={col}
                            style={cellStyle}
                            className="border p-2"
                          >
                            <div className="flex justify-center gap-2">
                              <button
                                className="text-blue-600"
                                onClick={() => setDetailId(v._id)}
                              >
                                Xem
                              </button>
                              <button
                                className="text-red-600"
                                onClick={() =>
                                  window.open(`/voucher/${v._id}/print`)
                                }
                              >
                                In phiếu
                              </button>
                            </div>
                          </td>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bảng phiếu điều chỉnh */}
      <h2 className="font-bold mb-2">Phiếu điều chỉnh</h2>
      <div className="overflow-auto max-h-[600px] border min-w-0">
        <table style={{
            tableLayout: "fixed",
            width: "max-content",
            maxWidth: "max-content",
            borderCollapse: "separate", // important: avoid collapse seams
            borderSpacing: 0,
          }}>
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {adjustColOrder.map((key) => (
                <th
                  key={key}
                  draggable
                  onDragStart={() => setDragCol(key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() =>
                    moveCol(adjustColOrder, dragCol, key, setAdjustColOrder)
                  }
                  className="border p-2 resize-x overflow-hidden select-none"
                  style={{
                    resize: "horizontal",
                    ...cellStyle
                  }}
                >
                  {
                    {
                      stt: "STT",
                      date: "Ngày",
                      code: "Mã phiếu chi",
                      source: "Tài khoản chi",
                      receiver: "Người nhận",
                      company: "Tên công ty",
                      content: "Nội dung",
                      reason: "Lý do chi",
                      transferDate: "Ngày chuyển tiền",
                      amount: "Số tiền",
                      orig: "Phiếu gốc",
                      status: "Trạng thái",
                      action: "Hành động",
                    }[key]
                  }
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={adjustColOrder.length} className="p-4 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : vouchersAdjusted.length === 0 ? (
              <tr>
                <td colSpan={adjustColOrder.length} className="p-4 text-center">
                  Không có phiếu điều chỉnh
                </td>
              </tr>
            ) : (
              vouchersAdjusted.map((v, idx) => {
                const orig = getOriginalVoucher(v.adjustedFrom);
                return (
                  <tr key={v._id} className="hover:bg-gray-50">
                    {adjustColOrder.map((col) => {
                      switch (col) {
                        case "stt":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className="border p-2"
                            >
                              {idx + 1}
                            </td>
                          );
                        case "date":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.dateCreated !== orig?.dateCreated
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {new Date(v.dateCreated).toLocaleDateString(
                                "vi-VN"
                              )}
                            </td>
                          );
                        case "code":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className="border p-2"
                            >
                              {v.voucherCode}
                            </td>
                          );
                        case "source":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.paymentSource !== orig?.paymentSource
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {PAYMENT_SOURCE_LABEL[v.paymentSource] ||
                                v.paymentSource}
                            </td>
                          );
                        case "receiver":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.receiverName !== orig?.receiverName
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {v.receiverName}
                            </td>
                          );
                        case "company":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.receiverCompany !== orig?.receiverCompany
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {v.receiverCompany}
                            </td>
                          );
                        case "content":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.transferContent !== orig?.transferContent
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {v.transferContent}
                            </td>
                          );
                        case "reason":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 ${
                                v.reason !== orig?.reason ? "text-red-600" : ""
                              }`}
                            >
                              {v.reason}
                            </td>
                          );
                        case "transferDate":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className="border p-2 text-center"
                            >
                              {v.transferDate
                                ? new Date(v.transferDate).toLocaleDateString(
                                    "vi-VN"
                                  )
                                : "-"}
                            </td>
                          );
                        case "amount":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className={`border p-2 text-right ${
                                v.amount !== orig?.amount ? "text-red-600" : ""
                              }`}
                            >
                              {v.amount?.toLocaleString()}
                            </td>
                          );
                        case "orig":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className="border p-2"
                            >
                              {v.origVoucherCode ? (
                                <button
                                  className="text-blue-600 underline"
                                  onClick={() =>
                                    setShowOrigDetail(v.adjustedFrom)
                                  }
                                >
                                  {v.origVoucherCode}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          );
                        case "status":
                          return (
                            <td className="border p-2 text-center font-semibold">
                              {v.status === "waiting_check" && (
                                <span className="text-yellow-600">
                                  Đang chờ duyệt
                                </span>
                              )}
                              {v.status === "approved" && (
                                <span className="text-green-600">Đã duyệt</span>
                              )}
                            </td>
                          );
                        case "action":
                          return (
                            <td
                              key={col}
                              style={cellStyle}
                              className="border p-2"
                            >
                              <div className="flex justify-center gap-2">
                                <button
                                  className="text-blue-600"
                                  onClick={() => setDetailId(v._id)}
                                >
                                  Xem
                                </button>
                                {v.status === "waiting_check" &&
                                  user?.permissions?.includes(
                                    "approve_voucher"
                                  ) && (
                                    <button
                                      className="text-green-600"
                                      onClick={() =>
                                        handleApproveAdjusted(v._id)
                                      }
                                    >
                                      Duyệt
                                    </button>
                                  )}
                                {v.status === "approved" && (
                                  <button
                                    className="text-red-600"
                                    onClick={() =>
                                      window.open(`/voucher/${v._id}/print`)
                                    }
                                  >
                                    In phiếu
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        default:
                          return null;
                      }
                    })}
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
