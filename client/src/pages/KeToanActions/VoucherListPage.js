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

const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // loại bỏ các ký tự dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

const LS_ORIGIN_COL_WIDTH = "voucher_origin_col_width";
const LS_ADJUST_COL_WIDTH = "voucher_adjust_col_width";

const LS_ORIGIN_COL_ORDER = "voucher_origin_col_order";
const LS_ADJUST_COL_ORDER = "voucher_adjust_col_order";

const makeStartResize = (getWidth, setWidth, lsKey) => (e, key) => {
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startWidth = getWidth()[key] || e.target.parentElement.offsetWidth;

  const onMouseMove = (ev) => {
    const newWidth = Math.max(60, startWidth + ev.clientX - startX);

    setWidth((prev) => ({
      ...prev,
      [key]: newWidth,
    }));
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    setWidth((prev) => {
      localStorage.setItem(lsKey, JSON.stringify(prev));
      return prev;
    });
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
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

  const [originColWidth, setOriginColWidth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_ORIGIN_COL_WIDTH)) || {};
    } catch {
      return {};
    }
  });

  const [adjustColWidth, setAdjustColWidth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_ADJUST_COL_WIDTH)) || {};
    } catch {
      return {};
    }
  });

  const moveCol = (cols, from, to, type) => {
    if (!from || !to || from === to) return;

    const next = [...cols];
    const iFrom = next.indexOf(from);
    const iTo = next.indexOf(to);

    if (iFrom === -1 || iTo === -1) return;

    next.splice(iTo, 0, next.splice(iFrom, 1)[0]);

    if (type === "origin") {
      setOriginColOrder(next);
      localStorage.setItem(LS_ORIGIN_COL_ORDER, JSON.stringify(next));
    }

    if (type === "adjust") {
      setAdjustColOrder(next);
      localStorage.setItem(LS_ADJUST_COL_ORDER, JSON.stringify(next));
    }
  };

  const startResizeOrigin = makeStartResize(
    () => originColWidth,
    setOriginColWidth,
    LS_ORIGIN_COL_WIDTH
  );

  const startResizeAdjust = makeStartResize(
    () => adjustColWidth,
    setAdjustColWidth,
    LS_ADJUST_COL_WIDTH
  );

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

  // State khoảng tháng xuất excel
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromMonth, setExportFromMonth] = useState(
    `${year}-${month < 10 ? "0" + month : month}`
  );
  const [exportToMonth, setExportToMonth] = useState(
    `${year}-${month < 10 ? "0" + month : month}`
  );

  const [exporting, setExporting] = useState(false);

  // Hàm xuất Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true); // bật trạng thái đang xuất
      const res = await axios.get(`${API}/vouchers/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fromMonth: exportFromMonth,
          toMonth: exportToMonth,
        },
        responseType: "blob", // quan trọng để nhận file
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DANH_SACH_PHIEU_${exportFromMonth}_to_${exportToMonth}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Xuất Excel thất bại");
    } finally {
      setExporting(false); // reset trạng thái
    }
  };

  // Lấy thông tin phiếu gốc từ ID
  const getOriginalVoucher = (id) => list.find((v) => v._id === id);

  // ==== DRAG + RESIZE CỘT ====
  const [dragCol, setDragCol] = useState(null);

  // thứ tự cột PHIẾU GỐC
  const [originColOrder, setOriginColOrder] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(LS_ORIGIN_COL_ORDER)) || [
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
        ]
      );
    } catch {
      return [
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
      ];
    }
  });

  // thứ tự cột PHIẾU ĐIỀU CHỈNH
  const [adjustColOrder, setAdjustColOrder] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(LS_ADJUST_COL_ORDER)) || [
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
          "orig",
          "status",
          "action",
        ]
      );
    } catch {
      return [
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
        "orig",
        "status",
        "action",
      ];
    }
  });

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

  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,

    transferDateFrom: null,
    transferDateTo: null,

    paymentSources: [],

    code: "",
    receiver: "",
    company: "",
    content: "",
    reason: "",
    amountFrom: "",
    amountTo: "",
  });

  const DateFilter = ({ from, to, onChange, onClear }) => (
    <div className="p-2 bg-white border rounded shadow text-xs">
      <div className="mb-1">Từ ngày</div>
      <input
        type="date"
        value={from || ""}
        onChange={(e) => onChange("from", e.target.value)}
        className="border px-1 py-0.5 w-full mb-2"
      />

      <div className="mb-1">Đến ngày</div>
      <input
        type="date"
        value={to || ""}
        onChange={(e) => onChange("to", e.target.value)}
        className="border px-1 py-0.5 w-full"
      />

      {(from || to) && (
        <button className="mt-1 text-[10px] text-red-500" onClick={onClear}>
          ❌ Xoá lọc
        </button>
      )}
    </div>
  );

  const PaymentSourceFilter = ({ value, onChange }) => {
    const toggle = (key) => {
      if (value.includes(key)) {
        onChange(value.filter((v) => v !== key));
      } else {
        if (value.length >= 5) return;
        onChange([...value, key]);
      }
    };

    return (
      <div className="p-2 bg-white border rounded shadow text-xs max-h-48 overflow-auto">
        {Object.entries(PAYMENT_SOURCE_LABEL).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={value.includes(key)}
              onChange={() => toggle(key)}
            />
            {label}
          </label>
        ))}
        <div className="text-[10px] text-gray-500 mt-1">Chọn tối đa 5</div>
      </div>
    );
  };

  function TextFilter({ value, onChange, placeholder, onClear }) {
    return (
      <div className="bg-white border rounded shadow p-2 w-[220px]">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border px-2 py-1 text-sm rounded"
        />

        {value && (
          <button
            className="mt-1 text-[10px] text-red-500"
            onClick={() => onClear()}
          >
            ❌ Xoá lọc
          </button>
        )}
      </div>
    );
  }

  function AmountFilter({ from, to, onApply, onClear }) {
    const [tempFrom, setTempFrom] = useState(from ?? "");
    const [tempTo, setTempTo] = useState(to ?? "");

    const handleApply = () => {
      onApply({
        from: tempFrom === "" ? "" : Number(tempFrom),
        to: tempTo === "" ? "" : Number(tempTo),
      });
    };

    return (
      <div className="bg-white border rounded shadow p-2 w-[260px]">
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={tempFrom}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*$/.test(val)) setTempFrom(val);
            }}
            placeholder="Từ"
            className="w-1/2 border px-2 py-1 text-sm rounded"
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={tempTo}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*$/.test(val)) setTempTo(val);
            }}
            placeholder="Đến"
            className="w-1/2 border px-2 py-1 text-sm rounded"
          />
        </div>

        <div className="flex gap-2 mt-1">
          <button
            className="text-[12px] text-blue-500 ml-2"
            onClick={handleApply}
          >
            Áp dụng
          </button>
          {(from || to) && (
            <button className="ml-2 text-[12px] text-red-500" onClick={onClear}>
              Xoá lọc
            </button>
          )}
        </div>
      </div>
    );
  }

  const applyFilters = (list) => {
    return list.filter((v) => {
      // ===== Ngày tạo =====
      if (filters.dateFrom) {
        if (new Date(v.dateCreated) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        if (new Date(v.dateCreated) > new Date(filters.dateTo)) return false;
      }

      // ===== Ngày chuyển tiền =====
      if (filters.transferDateFrom && v.transferDate) {
        if (new Date(v.transferDate) < new Date(filters.transferDateFrom))
          return false;
      }
      if (filters.transferDateTo && v.transferDate) {
        if (new Date(v.transferDate) > new Date(filters.transferDateTo))
          return false;
      }

      // ===== Tài khoản chi =====
      if (
        filters.paymentSources.length > 0 &&
        !filters.paymentSources.includes(v.paymentSource)
      ) {
        return false;
      }

      if (
        filters.code &&
        !removeVietnameseTones(v.voucherCode).includes(
          removeVietnameseTones(filters.code)
        )
      )
        return false;

      if (
        filters.receiver &&
        !removeVietnameseTones(v.receiverName).includes(
          removeVietnameseTones(filters.receiver)
        )
      )
        return false;

      if (
        filters.company &&
        !removeVietnameseTones(v.receiverCompany).includes(
          removeVietnameseTones(filters.company)
        )
      )
        return false;
      if (
        filters.reason &&
        !removeVietnameseTones(v.reason).includes(
          removeVietnameseTones(filters.reason)
        )
      )
        return false;
      if (
        filters.content &&
        !removeVietnameseTones(v.transferContent).includes(
          removeVietnameseTones(filters.content)
        )
      )
        return false;

      // ===== Số tiền =====
      if (filters.amountFrom && Number(v.amount) < Number(filters.amountFrom))
        return false;
      if (filters.amountTo && Number(v.amount) > Number(filters.amountTo))
        return false;

      return true;
    });
  };

  const vouchersOriginal = applyFilters(list.filter((v) => !v.adjustedFrom));

  const vouchersAdjusted = applyFilters(list.filter((v) => v.adjustedFrom));

  const [filterPopup, setFilterPopup] = useState(null);

  const openFilter = (e, col) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPopup((prev) =>
      prev?.col === col
        ? null
        : {
            col,
            x: rect.left,
            y: rect.bottom + 4,
          }
    );
  };

  useEffect(() => {
    const close = () => setFilterPopup(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

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
          onClick={() => setShowExportModal(true)}
          className="px-3 py-1 rounded bg-gray-700 text-white mr-2"
        >
          Xuất Excel
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

        <button
          className="px-3 py-1 rounded bg-gray-400 text-white ml-auto"
          onClick={() =>
            setFilters({
              dateFrom: null,
              dateTo: null,
              transferDateFrom: null,
              transferDateTo: null,
              paymentSources: [],
              code: "",
              receiver: "",
              company: "",
              content: "",
              reason: "",
              amountFrom: "",
              amountTo: "",
            })
          }
        >
          RESET
        </button>
      </div>

      <div className="overflow-auto mb-6 max-h-[600px] border min-w-0">
        <table
          style={{
            tableLayout: "fixed",
            width: "max-content", // ✅ tràn màn hình
            borderCollapse: "separate",
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
                  onClick={(e) => openFilter(e, key)}
                  onDrop={() => moveCol(originColOrder, dragCol, key, "origin")}
                  className="border p-2 select-none relative"
                  style={{
                    width:
                      key === "select" || key === "stt"
                        ? 40
                        : originColWidth[key] || 120,
                    minWidth:
                      key === "select" || key === "stt"
                        ? 40
                        : originColWidth[key] || 120,
                    maxWidth:
                      key === "select" || key === "stt"
                        ? 40
                        : originColWidth[key] || 120,
                  }}
                >
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
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
                  </div>

                  {/* resize handle */}
                  {key !== "select" && key !== "stt" && (
                    <div
                      className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize z-20"
                      onMouseDown={(e) => startResizeOrigin(e, key)}
                    />
                  )}
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
                  {originColOrder.map((col) => (
                    <td
                      key={col}
                      className="border p-2"
                      style={{
                        width:
                          col === "select" || col === "stt"
                            ? 40
                            : originColWidth[col],
                        minWidth:
                          col === "select" || col === "stt"
                            ? 40
                            : originColWidth[col],
                        maxWidth:
                          col === "select" || col === "stt"
                            ? 40
                            : originColWidth[col],
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "100%",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign:
                            col === "select" || col === "stt"
                              ? "center"
                              : col === "amount"
                              ? "right"
                              : col === "transferDate" || col === "status"
                              ? "center"
                              : "left",
                        }}
                      >
                        {(() => {
                          switch (col) {
                            case "select":
                              return (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(v._id)}
                                  onChange={() => toggleSelectOne(v._id)}
                                />
                              );
                            case "stt":
                              return idx + 1;
                            case "date":
                              return new Date(v.dateCreated).toLocaleDateString(
                                "vi-VN"
                              );
                            case "code":
                              return v.voucherCode;
                            case "source":
                              return (
                                PAYMENT_SOURCE_LABEL[v.paymentSource] ||
                                v.paymentSource
                              );
                            case "receiver":
                              return v.receiverName;
                            case "company":
                              return v.receiverCompany;
                            case "content":
                              return v.transferContent;
                            case "reason":
                              return v.reason;
                            case "transferDate":
                              return v.transferDate
                                ? new Date(v.transferDate).toLocaleDateString(
                                    "vi-VN"
                                  )
                                : "-";
                            case "amount":
                              return v.amount?.toLocaleString();
                            case "status":
                              return (
                                <span
                                  className={
                                    v.status === "waiting_check"
                                      ? "text-yellow-600 font-semibold"
                                      : v.status === "approved"
                                      ? "text-green-600 font-semibold"
                                      : "text-purple-600 font-semibold"
                                  }
                                >
                                  {v.status === "waiting_check"
                                    ? "Đang chờ duyệt"
                                    : v.status === "approved"
                                    ? "Đã duyệt"
                                    : "Đã điều chỉnh"}
                                </span>
                              );

                            case "action":
                              return (
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
                              );
                            default:
                              return null;
                          }
                        })()}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bảng phiếu điều chỉnh */}
      <h2 className="font-bold mb-2">Phiếu điều chỉnh</h2>
      <div className="overflow-auto max-h-[600px] border min-w-0">
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
              {adjustColOrder.map((key) => (
                <th
                  key={key}
                  draggable
                  onDragStart={() => setDragCol(key)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={(e) => openFilter(e, key)}
                  onDrop={() => moveCol(adjustColOrder, dragCol, key, "adjust")}
                  className="border p-2 select-none relative"
                  style={{
                    width:
                      key === "select" || key === "stt"
                        ? 40
                        : adjustColWidth[key] || 120,
                    minWidth:
                      key === "select" || key === "stt"
                        ? 40
                        : adjustColWidth[key] || 120,
                    maxWidth:
                      key === "select" || key === "stt"
                        ? 40
                        : adjustColWidth[key] || 120,
                  }}
                >
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {
                      {
                        select: (
                          <input
                            type="checkbox"
                            checked={
                              vouchersAdjusted.length > 0 &&
                              selectedIds.length === vouchersAdjusted.length
                            }
                            onChange={() => toggleSelectAll(vouchersAdjusted)}
                          />
                        ),
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
                  </div>

                  {key !== "select" && (
                    <div
                      className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize z-20"
                      onMouseDown={(e) => startResizeAdjust(e, key)}
                    />
                  )}
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
                    {adjustColOrder.map((col) => (
                      <td
                        key={col}
                        className="border p-2"
                        style={{
                          width:
                            col === "select" || col === "stt"
                              ? 40
                              : adjustColWidth[col],
                          minWidth:
                            col === "select" || col === "stt"
                              ? 40
                              : adjustColWidth[col],
                          maxWidth:
                            col === "select" || col === "stt"
                              ? 40
                              : adjustColWidth[col],
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign:
                              col === "select" || col === "stt"
                                ? "center"
                                : col === "amount"
                                ? "right"
                                : col === "transferDate" || col === "status"
                                ? "center"
                                : "left",
                          }}
                          className={
                            // highlight khác phiếu gốc
                            col !== "select" &&
                            col !== "stt" &&
                            col !== "voucherCode" &&
                            orig &&
                            {
                              date: v.dateCreated !== orig.dateCreated,
                              source: v.paymentSource !== orig.paymentSource,
                              receiver: v.receiverName !== orig.receiverName,
                              company:
                                v.receiverCompany !== orig.receiverCompany,
                              content:
                                v.transferContent !== orig.transferContent,
                              reason: v.reason !== orig.reason,
                              amount: v.amount !== orig.amount,
                            }[col]
                              ? "text-red-600"
                              : ""
                          }
                        >
                          {(() => {
                            switch (col) {
                              case "select":
                                return (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(v._id)}
                                    onChange={() => toggleSelectOne(v._id)}
                                  />
                                );

                              case "stt":
                                return idx + 1;

                              case "date":
                                return new Date(
                                  v.dateCreated
                                ).toLocaleDateString("vi-VN");

                              case "code":
                                return v.voucherCode;

                              case "source":
                                return (
                                  PAYMENT_SOURCE_LABEL[v.paymentSource] ||
                                  v.paymentSource
                                );

                              case "receiver":
                                return v.receiverName;

                              case "company":
                                return v.receiverCompany;

                              case "content":
                                return v.transferContent;

                              case "reason":
                                return v.reason;

                              case "transferDate":
                                return v.transferDate
                                  ? new Date(v.transferDate).toLocaleDateString(
                                      "vi-VN"
                                    )
                                  : "-";

                              case "amount":
                                return v.amount?.toLocaleString();

                              case "orig":
                                return v.origVoucherCode ? (
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
                                );

                              case "status":
                                return (
                                  <span
                                    className={
                                      v.status === "waiting_check"
                                        ? "text-yellow-600 font-semibold"
                                        : v.status === "approved"
                                        ? "text-green-600 font-semibold"
                                        : "text-purple-600 font-semibold"
                                    }
                                  >
                                    {v.status === "waiting_check"
                                      ? "Đang chờ duyệt"
                                      : v.status === "approved"
                                      ? "Đã duyệt"
                                      : "Đã điều chỉnh"}
                                  </span>
                                );

                              case "action":
                                return (
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
                                );

                              default:
                                return null;
                            }
                          })()}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filterPopup && (
        <div
          className="fixed z-[9999]"
          style={{ left: filterPopup.x, top: filterPopup.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {filterPopup.col === "date" && (
            <DateFilter
              from={filters.dateFrom}
              to={filters.dateTo}
              onChange={(type, val) =>
                setFilters((f) => ({
                  ...f,
                  [type === "from" ? "dateFrom" : "dateTo"]: val,
                }))
              }
              onClear={() =>
                setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }))
              }
            />
          )}

          {filterPopup.col === "transferDate" && (
            <DateFilter
              from={filters.transferDateFrom}
              to={filters.transferDateTo}
              onChange={(type, val) =>
                setFilters((f) => ({
                  ...f,
                  [type === "from" ? "transferDateFrom" : "transferDateTo"]:
                    val,
                }))
              }
              onClear={() =>
                setFilters((f) => ({
                  ...f,
                  transferDateFrom: "",
                  transferDateTo: "",
                }))
              }
            />
          )}

          {filterPopup.col === "source" && (
            <PaymentSourceFilter
              value={filters.paymentSources}
              onChange={(arr) =>
                setFilters((f) => ({ ...f, paymentSources: arr }))
              }
            />
          )}

          {filterPopup.col === "code" && (
            <TextFilter
              value={filters.code}
              placeholder="Nhập mã phiếu chi"
              onChange={(v) => setFilters((f) => ({ ...f, code: v }))}
              onClear={() => setFilters((f) => ({ ...f, code: "" }))}
            />
          )}

          {filterPopup.col === "receiver" && (
            <TextFilter
              value={filters.receiver}
              placeholder="Nhập tên người nhận"
              onChange={(v) => setFilters((f) => ({ ...f, receiver: v }))}
              onClear={() => setFilters((f) => ({ ...f, receiver: "" }))}
            />
          )}

          {filterPopup.col === "company" && (
            <TextFilter
              value={filters.company}
              placeholder="Nhập tên công ty"
              onChange={(v) => setFilters((f) => ({ ...f, company: v }))}
              onClear={() => setFilters((f) => ({ ...f, company: "" }))}
            />
          )}

          {filterPopup.col === "content" && (
            <TextFilter
              value={filters.content}
              placeholder="Nhập nội dung"
              onChange={(v) => setFilters((f) => ({ ...f, content: v }))}
              onClear={() => setFilters((f) => ({ ...f, content: "" }))}
            />
          )}

          {filterPopup.col === "reason" && (
            <TextFilter
              value={filters.reason}
              placeholder="Nhập lý do"
              onChange={(v) => setFilters((f) => ({ ...f, reason: v }))}
              onClear={() => setFilters((f) => ({ ...f, reason: "" }))}
            />
          )}

          {filterPopup.col === "amount" && (
            <AmountFilter
              from={filters.amountFrom}
              to={filters.amountTo}
              onApply={({ from, to }) =>
                setFilters((f) => ({ ...f, amountFrom: from, amountTo: to }))
              }
              onClear={() =>
                setFilters((f) => ({ ...f, amountFrom: "", amountTo: "" }))
              }
            />
          )}
        </div>
      )}

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

      {showExportModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-[400px]">
            <h2 className="text-lg font-bold mb-4">
              Chọn khoảng tháng xuất Excel
            </h2>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="month"
                value={exportFromMonth}
                onChange={(e) => setExportFromMonth(e.target.value)}
                className="border px-2 py-1 rounded w-full"
              />
              <span>→</span>
              <input
                type="month"
                value={exportToMonth}
                onChange={(e) => setExportToMonth(e.target.value)}
                className="border px-2 py-1 rounded w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-300"
                onClick={() => setShowExportModal(false)}
              >
                Huỷ
              </button>
              <button
                className="px-3 py-1 rounded bg-gray-700 text-white"
                disabled={exporting} // disable khi đang xuất
                onClick={async () => {
                  await handleExportExcel();
                  setShowExportModal(false);
                }}
              >
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
