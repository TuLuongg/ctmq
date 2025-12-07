import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API from "../../api";

export default function VoucherPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  console.log("VoucherPrintPage id:", data);

  useEffect(() => {
    axios.get(`${API}/vouchers/${id}`).then((res) => {
      setData(res.data);
    });
  }, [id]);

  if (!data) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="p-6 text-sm w-[800px] mx-auto border rounded bg-white">
      <h1 className="text-center text-xl font-bold mb-2">PHIẾU CHI</h1>

      {/* --- DATE --- */}
      <div className="mb-4">
        <div className="font-semibold">NGÀY LẬP</div>
        <div className="border p-2 inline-block mt-1">
          {new Date(data.dateCreated).toLocaleDateString("vi-VN")}
        </div>
      </div>

      {/* --- TÀI KHOẢN CHI --- */}
      <div className="mb-4">
        <div className="font-semibold">📌 TÀI KHOẢN CHI (CHỌN NGUỒN TIỀN)</div>
        <div className="border p-2 mt-1 inline-block">
          {data.paymentSource === "company" ? "CÔNG TY" : "CÁ NHÂN"}
        </div>
      </div>

      {/* --- NGƯỜI NHẬN --- */}
      <div className="mb-4">
        <div className="font-semibold">NGƯỜI NHẬN</div>
        <div className="border p-2 mt-1">{data.receiverName}</div>
      </div>

      {/* --- CÔNG TY NHẬN --- */}
      <div className="mb-4">
        <div className="font-semibold">TÊN CÔNG TY</div>
        <div className="border p-2 mt-1">{data.receiverCompany}</div>
      </div>

      {/* --- SỐ TK NHẬN --- */}
      <div className="mb-4">
        <div className="font-semibold">SỐ TÀI KHOẢN NHẬN TIỀN</div>
        <div className="border p-2 mt-1">{data.receiverBankAccount}</div>
      </div>

      {/* --- NỘI DUNG CHUYỂN KHOẢN --- */}
      <div className="mb-4">
        <div className="font-semibold">NỘI DUNG CHUYỂN KHOẢN</div>
        <div className="border p-2 mt-1">
          {data.transferContent || data.reason}
        </div>
      </div>

      {/* --- LÝ DO CHI --- */}
      <div className="mb-4">
        <div className="font-semibold">LÝ DO CHI</div>
        <div className="border p-2 mt-1 whitespace-pre-line">
          {data.reason}
        </div>
      </div>

      {/* --- SỐ TIỀN --- */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">PHÂN LOẠI CHI</div>
          <div className="border p-2 mt-1">{data.expenseType}</div>
        </div>

        <div>
          <div className="font-semibold">SỐ TIỀN (VNĐ)</div>
          <div className="border p-2 mt-1 text-right">
            {data.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* --- SỐ TIỀN BẰNG CHỮ --- */}
      <div className="mb-8">
        <div className="font-semibold">SỐ TIỀN BẰNG CHỮ</div>
        <div className="border italic text-red-600 p-2 mt-1">
          {data.amountInWords}
        </div>
      </div>

      {/* --- KÝ TÊN --- */}
      <div className="grid grid-cols-2 text-center mt-10 mb-20">
        <div>
          <div className="font-semibold mb-2">GIÁM ĐỐC</div>
          <div style={{ height: "80px" }}></div>
        </div>
        <div>
          <div className="font-semibold mb-2">KẾ TOÁN</div>
          <div style={{ height: "80px" }}></div>
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded bg-green-600 text-white"
        >
          In phiếu
        </button>
      </div>
    </div>
  );
}
