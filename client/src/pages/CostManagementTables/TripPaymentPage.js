import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function TripPaymentKTPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/trip-payment-kt`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  /* ================= FILTER OPTIONS ================= */
  const [driverOptions, setDriverOptions] = useState([]);
  const [plateOptions, setPlateOptions] = useState([]);

  const [driverFilter, setDriverFilter] = useState([]);
  const [plateFilter, setPlateFilter] = useState([]);

  // dropdown control
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // search trong dropdown
  const [driverFilterSearch, setDriverFilterSearch] = useState("");
  const [plateFilterSearch, setPlateFilterSearch] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchFilterOptions = async () => {
    try {
      const [driversRes, platesRes] = await Promise.all([
        axios.get(`${baseUrl}/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/plates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDriverOptions(driversRes.data);
      setPlateOptions(platesRes.data);
      setDriverFilter([]);
      setPlateFilter([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  /* ================= FETCH DATA ================= */
  const [page, setPage] = useState(1);
  const limit = 150;
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit };

      // ================= FILTER BIỂN SỐ XE =================
      // chỉ gửi khi KHÔNG chọn tất cả
      if (
        plateFilter.length > 0 &&
        plateFilter.length !== plateOptions.length
      ) {
        params.bienSoXe = plateFilter;
      }

      // ================= FILTER NGÀY =================
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      // ================= FILTER TÊN LÁI XE =================
      if (
        driverFilter.length > 0 &&
        driverFilter.length !== driverOptions.length
      ) {
        params.tenLaiXe = driverFilter;
      }

      const res = await axios.get(baseUrl, {
        params,
        paramsSerializer: (params) => {
          const qs = [];
          Object.keys(params).forEach((key) => {
            const value = params[key];
            if (Array.isArray(value)) {
              value.forEach((v) => qs.push(`${key}=${encodeURIComponent(v)}`));
            } else {
              qs.push(`${key}=${encodeURIComponent(value)}`);
            }
          });
          return qs.join("&");
        },
      });

      setData(Array.isArray(res.data.data) ? res.data.data : []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setEditing(null);
    setForm({});
  }, [page, plateFilter.join(","), driverFilter.join(","), fromDate, toDate]);

  /* ================= IMPORT ================= */
  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (file) setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return alert("Chưa chọn file");

    const formData = new FormData();
    formData.append("file", importFile);

    setImporting(true);
    setImportTotal(0);
    setImportDone(0);

    try {
      const res = await axios.post(`${baseUrl}/import-excel`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setImportTotal(res.data.totalValid || res.data.inserted || 0);
      setImportDone(res.data.inserted || 0);
      await fetchData();
    } catch (err) {
      alert("Import thất bại");
    } finally {
      setImporting(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ================= CRUD ================= */
  const handleEdit = (row) => {
    setEditing(row._id);
    setForm({ ...row });
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddNew = () => {
    setEditing("new");
    setForm({});
  };

  const handleSave = async () => {
    try {
      if (editing === "new") {
        await axios.post(baseUrl, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${baseUrl}/${editing}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchData();
      handleCancel();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa dòng này?")) return;
    await axios.delete(`${baseUrl}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };
  const handleDeleteByDate = async () => {
    if (!fromDate && !toDate) {
      alert("Chọn từ ngày / đến ngày trước");
      return;
    }

    if (
      !window.confirm(
        `Xoá tất cả dữ liệu từ ${fromDate || "đầu"} đến ${toDate || "cuối"} ?`
      )
    )
      return;

    try {
      await axios.delete(`${baseUrl}/delete-by-date`, {
        params: {
          from: fromDate || undefined,
          to: toDate || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setPage(1); // quay về trang 1 cho an toàn
      fetchData();
    } catch (err) {
      alert("Xoá thất bại");
    }
  };

  const dateFields = ["ngayThang", "dayPayment"];

  /* ================= TOOLBAR ================= */
  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center">
      {/* FROM DATE */}
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="border px-2 py-1"
      />

      {/* TO DATE */}
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="border px-2 py-1"
      />

      <button
        onClick={handleDeleteByDate}
        disabled={!fromDate && !toDate}
        className="bg-red-600 text-white px-2 py-1 disabled:opacity-50"
      >
        Xoá theo khoảng ngày
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current.click()}
        className="border px-2 py-1"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1"
      >
        Import
      </button>

      <button
        onClick={handleAddNew}
        className="bg-green-600 text-white px-2 py-1"
      >
        + Thêm
      </button>
    </div>
  );

  /* ================= TABLE ================= */
  const columns = [
    "tenLaiXe",
    "bienSoXe",
    "ngayThang",
    "totalMoney",
    "ghiChu",
    "dayPayment",
  ];

  const headers = [
    "Tên lái xe",
    "Biển số xe",
    "Ngày tháng",
    "Tổng tiền lịch trình",
    "Ghi chú",
    "Ngày thanh toán",
    "Hành động",
  ];

  return (
    <div className="p-4">
      <Toolbar />
      {loading && <p>Đang tải...</p>}

      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="min-w-[1000px] w-full text-xs table-auto border-separate border-spacing-0">
          <thead className="sticky top-0 bg-blue-600 text-white z-20">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border px-2 py-1 whitespace-nowrap relative"
                >
                  {/* ===== FILTER TÊN LÁI XE ===== */}
                  {h === "Tên lái xe" ? (
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setDropdownPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });
                          setShowDriverDropdown((p) => !p);
                          setShowPlateDropdown(false);
                        }}
                      >
                        {h}
                      </span>

                      {showDriverDropdown && (
                        <div
                          className="fixed z-[999] w-56 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm tên lái xe..."
                            className="w-full border rounded px-1 mb-1"
                            value={driverFilterSearch}
                            onChange={(e) =>
                              setDriverFilterSearch(e.target.value)
                            }
                          />

                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={
                                driverFilter.length === driverOptions.length
                              }
                              onChange={(e) =>
                                setDriverFilter(
                                  e.target.checked ? [...driverOptions] : []
                                )
                              }
                            />
                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {driverOptions
                              .filter((d) =>
                                d
                                  .toLowerCase()
                                  .includes(driverFilterSearch.toLowerCase())
                              )
                              .map((d) => (
                                <label
                                  key={d}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={driverFilter.includes(d)}
                                    onChange={(e) =>
                                      setDriverFilter((p) =>
                                        e.target.checked
                                          ? [...p, d]
                                          : p.filter((x) => x !== d)
                                      )
                                    }
                                  />
                                  <span>{d}</span>
                                </label>
                              ))}
                          </div>

                          <button
                            onClick={() => setShowDriverDropdown(false)}
                            className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                          >
                            Đóng
                          </button>
                        </div>
                      )}
                    </div>
                  ) : h === "Biển số xe" ? (
                    /* ===== FILTER BIỂN SỐ XE ===== */
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setDropdownPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });
                          setShowPlateDropdown((p) => !p);
                          setShowDriverDropdown(false);
                        }}
                      >
                        {h}
                      </span>

                      {showPlateDropdown && (
                        <div
                          className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm biển số..."
                            className="w-full border rounded px-1 mb-1"
                            value={plateFilterSearch}
                            onChange={(e) =>
                              setPlateFilterSearch(e.target.value)
                            }
                          />

                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={
                                plateFilter.length === plateOptions.length
                              }
                              onChange={(e) =>
                                setPlateFilter(
                                  e.target.checked ? [...plateOptions] : []
                                )
                              }
                            />
                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {plateOptions
                              .filter((p) =>
                                p
                                  .toLowerCase()
                                  .includes(plateFilterSearch.toLowerCase())
                              )
                              .map((p) => (
                                <label
                                  key={p}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={plateFilter.includes(p)}
                                    onChange={(e) =>
                                      setPlateFilter((prev) =>
                                        e.target.checked
                                          ? [...prev, p]
                                          : prev.filter((x) => x !== p)
                                      )
                                    }
                                  />
                                  <span>{p}</span>
                                </label>
                              ))}
                          </div>

                          <button
                            onClick={() => setShowPlateDropdown(false)}
                            className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                          >
                            Đóng
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    h
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {editing === "new" && (
              <tr className="bg-green-100">
                {columns.map((k) => (
                  <td key={k} className="border px-1">
                    <input
                      type={k.includes("ngay") ? "date" : "text"}
                      name={k}
                      value={form[k] || ""}
                      onChange={handleChange}
                      className="w-full border px-1"
                    />
                  </td>
                ))}
                <td className="border text-center">
                  <button onClick={handleSave}>Lưu</button>
                  <button onClick={handleCancel}>Huỷ</button>
                </td>
              </tr>
            )}

            {data.map((r) => (
              <tr key={r._id}>
                {editing === r._id ? (
                  <>
                    {columns.map((k) => (
                      <td key={k} className="border px-1">
                        <input
                          type={dateFields.includes(k) ? "date" : "text"}
                          name={k}
                          value={
                            dateFields.includes(k) && form[k]
                              ? form[k].slice(0, 10)
                              : form[k] || ""
                          }
                          onChange={handleChange}
                          className="w-full border px-1"
                        />
                      </td>
                    ))}
                    <td className="border text-center">
                      <button
                        onClick={handleSave}
                        className="mr-2 text-green-600"
                      >
                        Lưu
                      </button>
                      <button onClick={handleCancel} className="text-red-600">
                        Huỷ
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border px-2">{r.tenLaiXe}</td>
                    <td className="border px-2">{r.bienSoXe}</td>
                    <td className="border px-2 text-center">
                      {new Date(r.ngayThang).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="border px-2 text-right">
                      {r.totalMoney?.toLocaleString()}
                    </td>
                    <td className="border px-2">{r.ghiChu}</td>
                    <td className="border px-2 text-center">
                      {r.dayPayment
                        ? new Date(r.dayPayment).toLocaleDateString("vi-VN")
                        : ""}
                    </td>
                    <td className="border px-2 text-center">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-600 mr-2"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-600"
                      >
                        Xóa
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-center mt-3 text-xs items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="border px-2 py-1"
        >
          ◀ Trước
        </button>

        <span>
          Trang {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="border px-2 py-1"
        >
          Sau ▶
        </button>
      </div>
    </div>
  );
}
