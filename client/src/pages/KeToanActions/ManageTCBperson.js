import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import TCBModal from "../../components/TCBModal";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../../api";

const apiTCB = `${API}/tcb-person`;

const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatPrice = (val) => {
  if (val == null) return "";
  return new Intl.NumberFormat("vi-VN").format(val);
};

export const allColumns = [
  { key: "timePay", label: "THỜI GIAN", stickyIndex: 0 },
  { key: "maGD", label: "MÃ GD", stickyIndex: 1 },
  { key: "noiDungCK", label: "NỘI DUNG CK" },
  { key: "soTien", label: "SỐ TIỀN" },
  { key: "soDu", label: "SỐ DƯ" },
  { key: "khachHang", label: "TÊN KHÁCH HÀNG CK" },
  { key: "keToan", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "ghiChu", label: "GHI CHÚ" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const prefKey = (userId) => `tcb_table_prefs_${userId || "guest"}`;

export default function ManageTCBperson() {
  const filterPopupRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [data, setData] = useState([]);
  const [qKH, setQKH] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditTCB = permissions.includes("edit_tcb");

  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key)
  );
  const [columnWidths, setColumnWidths] = useState({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(120);
  const isResizingRef = useRef(false);

  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isActive = (path) => location.pathname === path;
  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", { state: { user } });
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", { state: { user } });
  };

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", { state: { user } });
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", { state: { user } });
  };

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", { state: { user } });
  };

  const handleGoToSumAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToSumKH26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () => {
    navigate("/voucher-list", { state: { user } });
  };

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  const [customerList, setCustomerList] = useState([]);
  const [accountantList, setAccountantList] = useState([]);

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedAccountants, setSelectedAccountants] = useState([]);
  useEffect(() => {
    axios.get(`${apiTCB}/customers`).then((res) => {
      setCustomerList(res.data.data || []);
    });

    axios.get(`${apiTCB}/accountants`).then((res) => {
      setAccountantList(res.data.data || []);
    });
  }, []);

  // ===== column filters =====
  const [colFilters, setColFilters] = useState({
    noiDungCK: "",
    ghiChu: "",
    maChuyen: "",
  });
  const [moneyFilter, setMoneyFilter] = useState({
    soTien: "",
    soDu: "",
  });
  const [searchKH, setSearchKH] = useState("");
  const [searchKT, setSearchKT] = useState("");

  // ----------------- fetch data -----------------
  const [page, setPage] = useState(1); // trang hiện tại
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const fetchData = async (p = 1) => {
    try {
      const body = {
        khachHang: selectedCustomers,
        keToan: selectedAccountants,
        from: from || undefined,
        to: to || undefined,
        noiDungCK: colFilters.noiDungCK || undefined,
        ghiChu: colFilters.ghiChu || undefined,
        maChuyen: colFilters.maChuyen || undefined,
        soTien: moneyFilter.soTien || undefined,
        soDu: moneyFilter.soDu || undefined,
        page: p, // gửi page lên server
      };
      const res = await axios.post(`${apiTCB}/all`, body, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData(res.data.data || []);
      console.log(res.data.data);
      setPage(res.data.page || p);
      setTotalPages(res.data.totalPages || 1);
      setTotalRows(res.data.total || 0);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err.response?.data || err.message);
      setData([]);
      setPage(1);
      setTotalPages(1);
      setTotalRows(0);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    from,
    to,
    colFilters,
    moneyFilter,
    selectedAccountants,
    selectedCustomers,
  ]);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    fetchData(p);
  };

  // ----------------- prefs -----------------
  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.order)) {
        const valid = parsed.order.filter((k) =>
          allColumns.some((ac) => ac.key === k)
        );
        const missing = allColumns
          .map((c) => c.key)
          .filter((k) => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }
      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!prefsLoaded || !userId) return;
    const payload = { order: visibleColumns, widths: columnWidths || {} };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
    } catch (e) {}
  }, [visibleColumns, columnWidths, userId, prefsLoaded]);

  // ---------- Drag & drop ----------
  const onDragStart = (e, colKey) => {
    dragColRef.current = colKey;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    const src = dragColRef.current;
    if (!src || src === targetKey) return;
    const idxSrc = visibleColumns.indexOf(src);
    const idxTarget = visibleColumns.indexOf(targetKey);
    if (idxSrc === -1 || idxTarget === -1) return;

    const locked = allColumns
      .filter((c) => c.stickyIndex === 0 || c.stickyIndex === 1)
      .map((c) => c.key);
    if (locked.includes(src) || locked.includes(targetKey)) return;

    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
  };

  // ---------- Resizable columns ----------
  const onMouseDownResize = (e, colKey) => {
    e.preventDefault();
    const th = e.target.closest("th");
    const startWidth = th ? th.offsetWidth : 120;
    resizingRef.current = { columnKey: colKey, startX: e.clientX, startWidth };
    window.addEventListener("mousemove", onMouseMoveResize);
    window.addEventListener("mouseup", onMouseUpResize);
  };
  const onMouseMoveResize = (e) => {
    const r = resizingRef.current;
    if (!r.columnKey) return;
    const delta = e.clientX - r.startX;
    let newWidth = r.startWidth + delta;
    if (newWidth < 60) newWidth = 60;
    setColumnWidths((prev) => ({ ...prev, [r.columnKey]: `${newWidth}px` }));
  };
  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) return;
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
  };

  // ----------------- add/edit -----------------
  const handleAdd = () => {
    if (!canEditTCB) return alert("Bạn chưa có quyền!");
    setEditItem(null);
    setShowModal(true);
  };
  const handleEdit = (v) => {
    if (!canEditTCB) return alert("Bạn chưa có quyền!");
    setEditItem(v);
    setShowModal(true);
  };
  const handleSave = (saved) => {
    setData((prev) => {
      const found = prev.find((p) => p._id === saved._id);
      if (found) return prev.map((p) => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  // ----------------- delete -----------------
  const handleDelete = async (id) => {
    if (!canEditTCB) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiTCB}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };
  const handleDeleteAll = async () => {
    if (!canEditTCB) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa tất cả?")) return;
    try {
      await axios.delete(apiTCB, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData([]);
      alert("Đã xóa tất cả!");
    } catch (err) {
      console.error(err);
      alert("Xóa tất cả thất bại");
    }
  };

  // ----------------- import/export -----------------
  const handleImportConfirm = async () => {
    if (!file) return alert("Chọn file Excel!");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${apiTCB}/import`, formData, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      alert(`Import xong — Thêm: ${res.data.inserted}`);
      setFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Không thể import Excel!");
    } finally {
      setImporting(false);
    }
  };
  const exportExcel = () => {
    if (!data.length) return alert("Không có dữ liệu để xuất");
    const headers = allColumns
      .filter((c) => visibleColumns.includes(c.key))
      .map((c) => c.label);
    const rows = data.map((d) => {
      const r = {};
      allColumns.forEach((c) => {
        if (!visibleColumns.includes(c.key)) return;
        if (["timePay"].includes(c.key)) r[c.label] = formatDate(d[c.key]);
        else if (["soTien", "soDu"].includes(c.key))
          r[c.label] = formatPrice(d[c.key]);
        else r[c.label] = d[c.key] || "";
      });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TCBperson");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `TCBperson_${formatDate(new Date())}.xlsx`
    );
  };

  const [insertAnchor, setInsertAnchor] = useState(null);
  const handleInsert = (row) => {
    if (!canEditTCB) return alert("Bạn chưa có quyền!");
    setInsertAnchor(row); // dòng mốc
    setEditItem(null); // modal rỗng
    setShowModal(true);
  };

  const [showColFilter, setShowColFilter] = useState(null);
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 });
  const filterRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowColFilter(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
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
            if (!user?.permissions?.includes("edit_trip")) {
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
          onClick={handleGoToSumAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToSumKH26}
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
      <div className="flex gap-2 items-center mb-4">
        <h1 className="text-xl font-bold">QUẢN LÝ CHUYỂN KHOẢN KHÁCH HÀNG</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap items-center justify-end">
        <input
          placeholder="Tên khách hàng"
          value={qKH}
          onChange={(e) => setQKH(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onClick={(e) => e.target.showPicker()}
          className="border px-2 py-1 rounded cursor-pointer"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onClick={(e) => e.target.showPicker()}
          className="border px-2 py-1 rounded cursor-pointer"
        />
        <button
          onClick={() => {
            setQKH("");
            setFrom("");
            setTo("");
            setMoneyFilter({ soTien: "", soDu: "" });
            setColFilters({ noiDungCK: "", ghiChu: "", maChuyen: "" });
            setSelectedAccountants([]);
            setSelectedCustomers([]);
            fetchData();
          }}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          Reset
        </button>
        <button
          onClick={handleAdd}
          className="bg-green-500 px-3 py-1 text-white rounded"
        >
          + Thêm
        </button>
        <button
          onClick={exportExcel}
          className="bg-blue-600 px-3 py-1 text-white rounded"
        >
          Xuất Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-1 rounded"
        />
        <button
          onClick={handleImportConfirm}
          className="bg-purple-600 text-white px-3 py-1 rounded"
        >
          {importing ? "Đang import..." : "Import Excel"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto border" style={{ maxHeight: "70vh" }}>
        <table
          style={{
            tableLayout: "fixed",
            width: "max-content",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-200 sticky top-0 z-40">
            {/* ================= HEADER ================= */}
            <tr>
              <th
                className="border p-1 left-0 bg-gray-200 z-50"
                style={{ width: 40 }}
              >
                STT
              </th>

              {visibleColumns.map((cKey) => {
                const colMeta = allColumns.find((c) => c.key === cKey) || {
                  label: cKey,
                };
                const widthStyle = columnWidths[cKey]
                  ? {
                      width: columnWidths[cKey],
                      minWidth: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                    }
                  : {};

                return (
                  <th
                    key={cKey}
                    className="border p-1 relative text-center select-none"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#f3f4f6",
                      ...widthStyle,
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, cKey)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, cKey)}
                      className="truncate p-1 cursor-move"
                    >
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setFilterPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });
                          setShowColFilter((p) => (p === cKey ? null : cKey));
                        }}
                      >
                        {colMeta.label}
                      </span>
                    </div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => {
                        isResizingRef.current = true;
                        e.preventDefault();
                        e.stopPropagation();
                        onMouseDownResize(e, cKey);
                      }}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: "col-resize",
                        zIndex: 100,
                      }}
                    />
                  </th>
                );
              })}

              <th className="border p-1 sticky top-0 bg-gray-200">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {data.map((v, idx) => (
              <tr
                key={v._id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border p-1 text-center left-0 bg-gray-50">
                  {idx + 1}
                </td>
                {visibleColumns.map((cKey) => (
                  <td
                    key={cKey}
                    className="border p-1"
                    style={{
                      width: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {["timePay"].includes(cKey)
                      ? formatDate(v[cKey])
                      : ["soTien", "soDu"].includes(cKey)
                      ? formatPrice(v[cKey])
                      : v[cKey]}
                  </td>
                ))}
                <td className="border p-1 flex gap-2 justify-center">
                  <button
                    onClick={() => handleEdit(v)}
                    className="text-blue-600"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleInsert(v)}
                    className="text-green-600 font-semibold"
                  >
                    Chèn
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="text-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TCBModal
          initialData={editItem}
          insertAnchor={insertAnchor}
          onClose={() => {
            setShowModal(false);
            setEditItem(null);
            setInsertAnchor(null);
          }}
          onSave={() => fetchData()} // ⚠️ reload full vì số dư thay đổi
          apiBase={apiTCB}
        />
      )}

      {/* Phân trang */}
      <div className="flex justify-center items-center gap-2 mt-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Trước
        </button>

        <span>
          Trang {page} / {totalPages}
        </span>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Sau
        </button>
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteAll}
          className={`px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 
      ${!canEditTCB ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Xóa tất cả
        </button>
      </div>
      {showColFilter && (
        <div
          ref={filterRef}
          className="fixed z-[9999] w-64 bg-white border rounded shadow p-2 text-xs"
          style={{
            top: filterPos.top,
            left: filterPos.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== KHÁCH HÀNG ===== */}
          {showColFilter === "khachHang" && (
            <>
              {/* 🔍 input tìm */}
              <input
                className="w-full border px-1 py-0.5 mb-1"
                placeholder="Tìm khách hàng..."
                value={searchKH}
                onChange={(e) => setSearchKH(e.target.value)}
              />

              {/* ✅ chọn tất cả */}
              <button
                className="mb-1 w-full bg-gray-200 hover:bg-gray-300 rounded py-0.5"
                onClick={() => {
                  const filtered = customerList.filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase())
                  );
                  const allChecked = filtered.every((c) =>
                    selectedCustomers.includes(c)
                  );

                  setSelectedCustomers(
                    (prev) =>
                      allChecked
                        ? prev.filter((x) => !filtered.includes(x)) // bỏ chọn
                        : Array.from(new Set([...prev, ...filtered])) // chọn
                  );
                }}
              >
                {customerList
                  .filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase())
                  )
                  .every((c) => selectedCustomers.includes(c))
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>

              <div className="max-h-40 overflow-auto">
                {customerList
                  .filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase())
                  )
                  .map((c) => (
                    <label key={c} className="flex items-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(c)}
                        onChange={(e) =>
                          setSelectedCustomers((p) =>
                            e.target.checked
                              ? [...p, c]
                              : p.filter((x) => x !== c)
                          )
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
              </div>
            </>
          )}

          {/* ===== KẾ TOÁN ===== */}
          {showColFilter === "keToan" && (
            <>
              {/* 🔍 input tìm */}
              <input
                className="w-full border px-1 py-0.5 mb-1"
                placeholder="Tìm kế toán..."
                value={searchKT}
                onChange={(e) => setSearchKT(e.target.value)}
              />

              {/* ✅ chọn tất cả */}
              <button
                className="mb-1 w-full bg-gray-200 hover:bg-gray-300 rounded py-0.5"
                onClick={() => {
                  const filtered = accountantList.filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase())
                  );
                  const allChecked = filtered.every((a) =>
                    selectedAccountants.includes(a)
                  );

                  setSelectedAccountants((prev) =>
                    allChecked
                      ? prev.filter((x) => !filtered.includes(x))
                      : Array.from(new Set([...prev, ...filtered]))
                  );
                }}
              >
                {accountantList
                  .filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase())
                  )
                  .every((a) => selectedAccountants.includes(a))
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>

              <div className="max-h-40 overflow-auto">
                {accountantList
                  .filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase())
                  )
                  .map((a) => (
                    <label key={a} className="flex items-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedAccountants.includes(a)}
                        onChange={(e) =>
                          setSelectedAccountants((p) =>
                            e.target.checked
                              ? [...p, a]
                              : p.filter((x) => x !== a)
                          )
                        }
                      />
                      <span>{a}</span>
                    </label>
                  ))}
              </div>
            </>
          )}

          {/* ===== TEXT FILTER ===== */}
          {["noiDungCK", "ghiChu", "maChuyen"].includes(showColFilter) && (
            <>
              <input
                autoFocus
                className="w-full border px-1 py-0.5"
                placeholder="Nhập để lọc..."
                value={colFilters[showColFilter] || ""}
                onChange={(e) =>
                  setColFilters((p) => ({
                    ...p,
                    [showColFilter]: e.target.value,
                  }))
                }
              />
            </>
          )}
          {["soTien", "soDu"].includes(showColFilter) && (
            <>
              <input
                type="number"
                className="w-full border px-1 py-0.5"
                placeholder="Nhập số tiền"
                value={moneyFilter[showColFilter] || ""}
                onChange={(e) =>
                  setMoneyFilter((p) => ({
                    ...p,
                    [showColFilter]: e.target.value,
                  }))
                }
              />
            </>
          )}

          <button
            onClick={() => {
              fetchData(1);
              setShowColFilter(null);
            }}
            className="mt-2 w-full bg-blue-600 text-white py-1 rounded"
          >
            Áp dụng
          </button>
        </div>
      )}
    </div>
  );
}
