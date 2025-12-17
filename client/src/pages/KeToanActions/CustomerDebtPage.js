import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API from "../../api";
import PaymentHistoryModal from "../../components/PaymentHistoryModal";
import TripListModal from "../../components/TripListModal";

// Chuyển string sang dạng không dấu, thường
const normalizeString = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD") // tách các dấu
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .toLowerCase();
};

export default function CustomerDebtPage() {
  const token = localStorage.getItem("token");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [customers, setCustomers] = useState([]);
  const [debtList, setDebtList] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showTripList, setShowTripList] = useState(false);

  const [showAutoCreateModal, setShowAutoCreateModal] = useState(false);
  const [autoDebtData, setAutoDebtData] = useState({
    month,
    year,
    manageMonth: `${String(month).padStart(2, "0")}/${year}`, // default manageMonth
    customDates: {}, // { [customerCode]: { fromDate, toDate } }
    globalFromDate: "",
    globalToDate: "",
    note: "",
    vatPercent: 0,
  });

  const [selectedCustomers, setSelectedCustomers] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;

  const isActive = (path) => location.pathname === path;

  // ====================== NAVIGATION ======================
  const handleGoToDrivers = () =>
    navigate("/manage-driver", { state: { user } });
  const handleGoToCustomers = () =>
    navigate("/manage-customer", { state: { user } });
  const handleGoToVehicles = () =>
    navigate("/manage-vehicle", { state: { user } });
  const handleGoToTrips = () => navigate("/manage-trip", { state: { user } });
  const handleGoToAllTrips = () =>
    navigate("/manage-all-trip", { state: { user } });
  const handleGoToAllCustomers = () =>
    navigate("/customer-debt", { state: { user } });
  const handleGoToCustomer26 = () =>
    navigate("/customer-debt-26", { state: { user } });
  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  const [searchText, setSearchText] = useState("");

  // ====================== LOAD DATA ======================
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${API}/customers`);

        const filtered = (res.data || [])
          .filter((c) => String(c.code) !== "26") // loại KH 26
          .reverse(); // đảo ngược thứ tự

        setCustomers(filtered);
      } catch (err) {
        console.error("Lỗi load customers", err);
      }
    };

    fetchCustomers();
  }, []);

  const loadData = async () => {
    try {
      const manageMonth = `${String(month).padStart(2, "0")}/${year}`;
      const res = await axios.get(
        `${API}/payment-history/debt?manageMonth=${manageMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mapped = customers.map((c) => {
        const debt = res.data.find((d) => d.customerCode === c.code);
        let trangThai = "green";
        if (debt?.remainAmount > 0) {
          const tiLe = debt.totalAmount
            ? debt.remainAmount / debt.totalAmount
            : 0;
          trangThai = tiLe <= 0.2 ? "yellow" : "red";
        }

        return {
          debtCode: debt?.debtCode || null,
          maKH: c.code,
          tenKH: c.name,
          fromDate: debt?.fromDate ? new Date(debt.fromDate) : null,
          toDate: debt?.toDate ? new Date(debt.toDate) : null,
          thangQuanLy: debt?.manageMonth || manageMonth,
          tongCuoc: Number(debt?.totalAmount || 0),
          tongHoaDon: Number(debt?.totalAmountInvoice || 0),
          tongTienMat: Number(debt?.totalAmountCash || 0),
          thueVAT: Number(debt?.vatPercent || 0),
          daThanhToan: Number(debt?.paidAmount || 0),
          conLai: Number(debt?.remainAmount || 0),
          status: debt?.status || "CHUA_TRA",
          trangThai,
          soChuyen: Number(debt?.soChuyen || 0),
          isLocked: debt?.isLocked,
        };
      });

      setDebtList(mapped);
    } catch (err) {
      console.error(err);
      alert("Không lấy được công nợ");
    }
  };

  useEffect(() => {
    if (customers.length > 0) loadData();
  }, [month, year, customers]);

  // ====================== HELPERS ======================
  const getCustomerName = (maKH) => {
    const found = customers.find((c) => c.code === maKH);
    return found ? found.name : "";
  };

  // ====================== ACTIONS ======================
  const handleLockDebt = async (debtCode) => {
    if (!debtCode) return alert("Kỳ công nợ chưa tồn tại để khoá");
    try {
      await axios.post(
        `${API}/payment-history/debt-period/${debtCode}/lock`,
        { lockedBy: user?.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Đã khoá kỳ công nợ");
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Lỗi khi khoá kỳ công nợ");
    }
  };

  const handleUnlockDebt = async (debtCode) => {
    try {
      await axios.post(
        `${API}/payment-history/debt-period/${debtCode}/unlock`,
        { unlockedBy: user?.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Đã mở khoá kỳ công nợ");
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Lỗi khi mở khoá kỳ công nợ");
    }
  };

  // ====================== TẠO KỲ CÔNG NỢ TỰ ĐỘNG ======================
  const [isCreatingDebt, setIsCreatingDebt] = useState(false);

  const handleAutoCreateDebt = async () => {
    if (isCreatingDebt) return; // chặn double click

    setIsCreatingDebt(true);
    try {
      for (const c of selectedCustomerList) {
        const { fromDate, toDate } = autoDebtData.customDates[c.code] || {};
        const finalFrom = fromDate || autoDebtData.globalFromDate;
        const finalTo = toDate || autoDebtData.globalToDate;

        if (!finalFrom || !finalTo) {
          alert(`Chưa chọn khoảng ngày cho KH ${c.name}`);
          return;
        }

        await axios.post(
          `${API}/payment-history/debt-period`,
          {
            customerCode: c.code,
            fromDate: finalFrom,
            toDate: finalTo,
            manageMonth: autoDebtData.manageMonth,
            note: autoDebtData.note || "",
            vatPercent: autoDebtData.vatPercent,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert("Đã tạo kỳ công nợ tự động");
      setShowAutoCreateModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Lỗi tạo kỳ công nợ");
    } finally {
      setIsCreatingDebt(false); // 🔓 mở khoá dù success hay lỗi
    }
  };

  const selectedCustomerList = customers.filter((c) =>
    selectedCustomers.includes(c.code)
  );

  //update khoảng của kỳ công nợ
  const [showEditDebtModal, setShowEditDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

  const [editFromDate, setEditFromDate] = useState("");
  const [editToDate, setEditToDate] = useState("");
  const [editVatPercent, setEditVatPercent] = useState(0);

  const handleUpdateDebtPeriod = async () => {
    if (!editFromDate || !editToDate) {
      alert("Vui lòng chọn đủ ngày");
      return;
    }

    try {
      await axios.put(
        `${API}/payment-history/debt-period/${editingDebt.debtCode}`,
        {
          fromDate: editFromDate,
          toDate: editToDate,
          vatPercent: editVatPercent,
          updatedBy: user?.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Đã cập nhật kỳ công nợ");
      setShowEditDebtModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Không sửa được kỳ công nợ");
    }
  };

  const filteredDebtList = debtList.filter((c) => {
    const normSearch = normalizeString(searchText);
    const normCode = normalizeString(c.maKH);
    const normName = normalizeString(c.tenKH);

    return normCode.includes(normSearch) || normName.includes(normSearch);
  });

  const visibleCustomerCodes = filteredDebtList.map((c) => c.maKH);

  // ====================== RENDER ======================
  return (
    <div className="p-4 text-xs">
      {/* NAVIGATION */}
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
              alert("Bạn không có quyền!");
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
          className={`px-3 py-1 rounded text-white ${
            isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Công nợ KH
        </button>
        <button
          onClick={handleGoToCustomer26}
          className={`px-3 py-1 rounded text-white ${
            isActive("/customer-debt-26") ? "bg-green-600" : "bg-blue-500"
          }`}
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

      {/* Tiêu đề + bộ lọc */}
      <h1 className="text-xl font-bold mb-4">TỔNG CÔNG NỢ KHÁCH HÀNG</h1>
      <div className="flex gap-3 mb-4">
        <input
          type="number"
          value={month}
          min={1}
          max={12}
          onChange={(e) => setMonth(e.target.value)}
          className="border p-2"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border p-2"
        />
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          LỌC
        </button>
        <button
          onClick={() => {
            if (selectedCustomers.length === 0) {
              alert("Vui lòng chọn khách hàng");
              return;
            }
            setShowAutoCreateModal(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          TẠO KỲ CÔNG NỢ
        </button>
      </div>
      <div className="flex gap-2 mb-2 items-center">
        <input
          type="text"
          placeholder="Mã KH / Tên KH"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border p-2 w-52 rounded"
        />
        {searchText && (
          <button
            className="px-2 py-1 bg-gray-300 rounded"
            onClick={() => setSearchText("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Bảng công nợ */}
      <div className="overflow-auto max-h-[650px] border relative">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                <input
                  type="checkbox"
                  checked={
                    visibleCustomerCodes.length > 0 &&
                    visibleCustomerCodes.every((code) =>
                      selectedCustomers.includes(code)
                    )
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCustomers((prev) => [
                        ...new Set([...prev, ...visibleCustomerCodes]),
                      ]);
                    } else {
                      setSelectedCustomers((prev) =>
                        prev.filter(
                          (code) => !visibleCustomerCodes.includes(code)
                        )
                      );
                    }
                  }}
                />
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                MÃ KH
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                TÊN KH
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                MÃ CÔNG NỢ
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                KỲ CÔNG NỢ
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                HOÁ ĐƠN
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">VAT</th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                TIỀN MẶT
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                TỔNG TIỀN
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                ĐÃ THANH TOÁN
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                CÒN LẠI
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                TRẠNG THÁI
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                SỐ CHUYẾN
              </th>
              <th className="border p-2 sticky top-0 bg-gray-200 z-20">
                HÀNH ĐỘNG
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDebtList.map((c) => (
              <tr key={c.maKH} className="h-[15px]">
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(c.maKH)}
                    onChange={(e) =>
                      setSelectedCustomers((prev) =>
                        e.target.checked
                          ? [...prev, c.maKH]
                          : prev.filter((x) => x !== c.maKH)
                      )
                    }
                  />
                </td>

                <td className="border p-2">{c.maKH}</td>
                <td className="border p-2">{c.tenKH}</td>
                <td className="border p-2">{c.debtCode || "-"}</td>
                <td className="border p-2">
                  {c.fromDate && c.toDate
                    ? `${c.fromDate.toLocaleDateString()} - ${c.toDate.toLocaleDateString()}`
                    : "-"}
                </td>
                <td className="border p-2 text-blue-700 font-bold">
                  {c.tongHoaDon.toLocaleString()}
                </td>
                <td className="border p-2 text-blue-700 font-bold">
                  {c.thueVAT.toLocaleString()}%
                </td>
                <td className="border p-2 text-blue-700 font-bold">
                  {c.tongTienMat.toLocaleString()}
                </td>
                <td
                  className="border p-2 text-blue-700 font-bold underline cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowTripList(true);
                  }}
                >
                  {c.tongCuoc.toLocaleString()}
                </td>
                <td className="border p-2 font-bold">
                  {c.daThanhToan.toLocaleString()}
                </td>
                <td className="border p-2 font-bold text-red-600">
                  {c.conLai.toLocaleString()}
                </td>
                <td className="border p-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setShowPaymentHistory(true);
                    }}
                  >
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        display: "inline-block",
                        backgroundColor:
                          c.trangThai === "green"
                            ? "#00cc44"
                            : c.trangThai === "yellow"
                            ? "#ffcc00"
                            : "#ff3333",
                      }}
                    />
                    <span>
                      {c.trangThai === "green"
                        ? "Hoàn tất"
                        : c.trangThai === "yellow"
                        ? "Còn ít"
                        : "Chưa trả"}
                    </span>
                  </div>
                </td>
                <td className="border p-2">{c.soChuyen}</td>
                <td className="border p-2 flex gap-1 justify-center">
                  {c.debtCode && (
                    <>
                      {c.isLocked ? (
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded"
                          onClick={() => handleUnlockDebt(c.debtCode)}
                        >
                          Mở KCN
                        </button>
                      ) : (
                        <button
                          className="px-2 py-1 bg-yellow-500 text-white rounded"
                          onClick={() => handleLockDebt(c.debtCode)}
                        >
                          Khoá KCN
                        </button>
                      )}

                      <button
                        disabled={c.isLocked}
                        className={`px-2 py-1 rounded text-white ${
                          c.isLocked
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500"
                        }`}
                        onClick={() => {
                          if (c.isLocked) return;
                          setEditingDebt(c);
                          setEditFromDate(
                            c.fromDate
                              ? c.fromDate.toISOString().slice(0, 10)
                              : ""
                          );
                          setEditToDate(
                            c.toDate ? c.toDate.toISOString().slice(0, 10) : ""
                          );
                          setEditVatPercent(c.thueVAT || 0);
                          setShowEditDebtModal(true);
                        }}
                      >
                        Sửa
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal lịch sử thanh toán */}
      {showPaymentHistory && selectedCustomer && (
        <PaymentHistoryModal
          debtCode={selectedCustomer.debtCode}
          customerCode={selectedCustomer.maKH}
          onClose={() => setShowPaymentHistory(false)}
          onPaymentAdded={loadData}
        />
      )}

      {/* Modal danh sách chuyến */}
      {showTripList && selectedCustomer && (
        <TripListModal
          customer={selectedCustomer}
          onClose={() => setShowTripList(false)}
          onPaymentTypeChanged={loadData}
        />
      )}

      {/* Modal tạo kỳ công nợ tự động */}
      {showAutoCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded w-[600px] max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-bold mb-2">Tạo kỳ công nợ tự động</h2>

            {/* manageMonth + note */}
            <div className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                placeholder="MM/YYYY"
                value={autoDebtData.manageMonth || ""}
                onChange={(e) =>
                  setAutoDebtData({
                    ...autoDebtData,
                    manageMonth: e.target.value,
                  })
                }
                className="border p-2 w-36"
              />

              <input
                type="text"
                placeholder="Ghi chú"
                value={autoDebtData.note || ""}
                onChange={(e) =>
                  setAutoDebtData({ ...autoDebtData, note: e.target.value })
                }
                className="border p-2 flex-1"
              />

              <div className="flex items-center gap-1">
                <label className="text-xs whitespace-nowrap">VAT (%): </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={autoDebtData.vatPercent}
                  onChange={(e) =>
                    setAutoDebtData({
                      ...autoDebtData,
                      vatPercent: Number(e.target.value) || 0,
                    })
                  }
                  className="border p-2 w-24"
                  placeholder="VD: 8, 10"
                />
              </div>
            </div>

            {/* Ngày chung */}
            <div className="mb-2 text-xs font-semibold">
              Khoảng ngày chung cho tất cả khách hàng ( chọn chung trước chọn
              riêng sau )
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="date"
                value={autoDebtData.globalFromDate || ""}
                onChange={(e) => {
                  const newFrom = e.target.value;
                  const updatedCustomDates = { ...autoDebtData.customDates };
                  customers.forEach((c) => {
                    if (!autoDebtData.customDates[c.code]?.customized) {
                      updatedCustomDates[c.code] = {
                        ...updatedCustomDates[c.code],
                        fromDate: newFrom,
                        customized: false,
                      };
                    }
                  });
                  setAutoDebtData({
                    ...autoDebtData,
                    globalFromDate: newFrom,
                    customDates: updatedCustomDates,
                  });
                }}
                className="border p-1 w-36"
              />
              <input
                type="date"
                value={autoDebtData.globalToDate || ""}
                onChange={(e) => {
                  const newTo = e.target.value;
                  const updatedCustomDates = { ...autoDebtData.customDates };
                  customers.forEach((c) => {
                    if (!autoDebtData.customDates[c.code]?.customized) {
                      updatedCustomDates[c.code] = {
                        ...updatedCustomDates[c.code],
                        toDate: newTo,
                        customized: false,
                      };
                    }
                  });
                  setAutoDebtData({
                    ...autoDebtData,
                    globalToDate: newTo,
                    customDates: updatedCustomDates,
                  });
                }}
                className="border p-1 w-36"
              />
            </div>

            {/* Danh sách khách hàng dạng bảng */}
            <div className="overflow-auto max-h-[300px] border mb-2">
              <table className="w-full border-collapse">
                <thead className="bg-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="border p-2">Mã KH</th>
                    <th className="border p-2">Tên KH</th>
                    <th className="border p-2">Từ ngày</th>
                    <th className="border p-2">Đến ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomerList.map((c) => {
                    const custDate = autoDebtData.customDates[c.code] || {};
                    return (
                      <tr key={c.code}>
                        <td className="border p-2">{c.code}</td>
                        <td className="border p-2">{c.name}</td>
                        <td className="border p-2">
                          <input
                            type="date"
                            value={
                              custDate.fromDate ||
                              autoDebtData.globalFromDate ||
                              ""
                            }
                            onChange={(e) =>
                              setAutoDebtData({
                                ...autoDebtData,
                                customDates: {
                                  ...autoDebtData.customDates,
                                  [c.code]: {
                                    ...custDate,
                                    fromDate: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="date"
                            value={
                              custDate.toDate || autoDebtData.globalToDate || ""
                            }
                            onChange={(e) =>
                              setAutoDebtData({
                                ...autoDebtData,
                                customDates: {
                                  ...autoDebtData.customDates,
                                  [c.code]: {
                                    ...custDate,
                                    toDate: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Nút tạo / huỷ */}
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowAutoCreateModal(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded"
              >
                Huỷ
              </button>
              <button
                disabled={isCreatingDebt}
                className={`px-3 py-1 rounded text-white ${
                  isCreatingDebt
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600"
                }`}
                onClick={handleAutoCreateDebt}
              >
                {isCreatingDebt ? "Đang tạo..." : "Tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditDebtModal && editingDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded w-[400px]">
            <h2 className="text-lg font-bold mb-3">
              Sửa kỳ công nợ – {editingDebt.debtCode}
            </h2>

            <div className="flex flex-col gap-2">
              <label className="text-xs">Từ ngày</label>
              <input
                type="date"
                value={editFromDate}
                onChange={(e) => setEditFromDate(e.target.value)}
                className="border p-2"
              />

              <label className="text-xs">Đến ngày</label>
              <input
                type="date"
                value={editToDate}
                onChange={(e) => setEditToDate(e.target.value)}
                className="border p-2"
              />

              <label className="text-xs">VAT (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editVatPercent}
                onChange={(e) => setEditVatPercent(Number(e.target.value) || 0)}
                className="border p-2"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded"
                onClick={() => setShowEditDebtModal(false)}
              >
                Huỷ
              </button>

              <button
                className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={handleUpdateDebtPeriod}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
