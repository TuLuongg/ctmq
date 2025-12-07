import { useEffect, useState } from "react";
import axios from "axios";
import API from "../../api";

import VoucherEditModal from "./VoucherEditModal";
import VoucherAdjustModal from "./VoucherAdjustModal";

function formatAccountNumber(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim(); 
}

export default function VoucherDetailModal({ id, customers, onClose, onSuccess }) {
  const [v, setV] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = storedUser.permissions || [];

  const load = async () => {
    const res = await axios.get(`${API}/vouchers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setV(res.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!v) return null;

  async function handleApprove() {
    if (!window.confirm("Bạn chắc chắn muốn duyệt?")) return;

    await axios.post(
      `${API}/vouchers/${id}/approve`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await load();
    onSuccess?.();
  }

  async function handleDelete() {
    if (!window.confirm("Xoá phiếu?")) return;

    await axios.delete(`${API}/vouchers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    onSuccess?.();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[820px] max-h-[90vh] overflow-auto p-6 rounded shadow-lg">
        <h3 className="text-lg font-bold mb-2">Phiếu chi</h3>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Ngày:</b> {new Date(v.dateCreated).toLocaleDateString("vi-VN")}</div>
          <div><b>Trạng thái:</b>                    {v.status === "waiting_check" && (
                      <span className="text-yellow-600">Đang chờ duyệt</span>
                    )}

                    {v.status === "approved" && (
                      <span className="text-green-600">Đã duyệt</span>
                    )}</div>
          <div><b>Tài khoản chi:</b> {v.paymentSource === "caNhan" ? "Cá nhân" : "Công ty"}</div>
          <div><b>Tên công ty:</b> {v.receiverCompany}</div>
          <div><b>Người nhận:</b> {v.receiverName}</div>
          <div><b>Số tài khoản nhận tiền:</b> {formatAccountNumber(v.receiverBankAccount)}</div>
          <div><b>Phân loại chi:</b> {v.expenseType}</div>
          <div className="col-span-2"><b>Nội dung chuyển khoản:</b> {v.transferContent}</div>
          <div className="col-span-2"><b>Lý do chi:</b> {v.reason}</div>
          <div><b>Số tiền:</b> {v.amount?.toLocaleString()}</div>
          <div><b>Bằng chữ:</b> {v.amountInWords}</div>
        </div>

<div className="flex gap-2 mt-4">

  {/* ============================== */}
  {/* Khi CHƯA duyệt → hiện nút theo permissions */}
  {/* ============================== */}
  {v.status !== "approved" && (
    <>

      {/* ---- nếu có quyền EDIT ---- */}
      {permissions.includes("edit_voucher") && (
        <>
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            Sửa
          </button>

          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Xóa
          </button>
        </>
      )}

      {/* ---- nếu có quyền APPROVE ---- */}
      {permissions.includes("approve_voucher") && (
        <button
          onClick={handleApprove}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Duyệt
        </button>
      )}
    </>
  )}

  {/* ============================== */}
  {/* Khi ĐÃ duyệt → chỉ hiện Tạo điều chỉnh */}
  {/* ============================== */}
  {v.status === "approved" && (
    <button
      onClick={() => setShowAdjust(true)}
      className="px-3 py-1 bg-purple-600 text-white rounded"
    >
      Tạo điều chỉnh
    </button>
  )}

  {/* Nút đóng */}
  <button
    onClick={onClose}
    className="px-3 py-1 bg-gray-400 text-white rounded ml-auto"
  >
    Đóng
  </button>
</div>



        {showEdit && (
          <VoucherEditModal
            id={id}
            customers={customers}
            voucher={v}
            onClose={() => {
              setShowEdit(false);
              load();
              onSuccess?.();
            }}
          />
        )}

        {showAdjust && (
          <VoucherAdjustModal
            id={id}
            customers={customers}
            onClose={() => {
              setShowAdjust(false);
              load();
              onSuccess?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
