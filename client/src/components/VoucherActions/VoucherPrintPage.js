import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API from "../../api";

const boxClass = "border-2 border-black p-2 mt-1 print:border-black";

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
    <div
      className="
    mx-auto
    bg-white
    border-2 border-black
    box-border
    text-[16px]
    p-[12mm]

    w-full
    print:w-[210mm]
    print:h-[273mm]
    print:overflow-hidden
  "
    >
      <h1 className="text-center text-xl font-bold mb-2 mt-0">
        PHIẾU CHI
      </h1>

      {/* --- DATE --- */}
      <div className="mb-2">
        <div className="font-semibold">NGÀY LẬP</div>
        <div className={`${boxClass} inline-block`}>
          {new Date(data.dateCreated).toLocaleDateString("vi-VN")}
        </div>
      </div>

      {/* --- TÀI KHOẢN CHI --- */}
      <div className="mb-2">
        <div className="font-semibold">TÀI KHOẢN CHI (CHỌN NGUỒN TIỀN)</div>
        <div className={`${boxClass} inline-block`}>
          {data.paymentSource === "company" ? "CÔNG TY" : "CÁ NHÂN"}
        </div>
      </div>

      {/* --- NGƯỜI NHẬN --- */}
      <div className="mb-2">
        <div className="font-semibold">NGƯỜI NHẬN</div>
        <div className={boxClass}>{data.receiverName}</div>
      </div>

      {/* --- CÔNG TY NHẬN --- */}
      <div className="mb-2">
        <div className="font-semibold">TÊN CÔNG TY</div>
        <div className={boxClass}>{data.receiverCompany}</div>
      </div>

      {/* --- SỐ TK NHẬN --- */}
      <div className="mb-2">
        <div className="font-semibold">SỐ TÀI KHOẢN NHẬN TIỀN</div>
        <div className={boxClass}>{data.receiverBankAccount}</div>
      </div>

      {/* --- NỘI DUNG CHUYỂN KHOẢN --- */}
      <div className="mb-2">
        <div className="font-semibold">NỘI DUNG CHUYỂN KHOẢN</div>
        <div className={boxClass}>{data.transferContent || data.reason}</div>
      </div>

      {/* --- LÝ DO CHI --- */}
      <div className="mb-2">
        <div className="font-semibold">LÝ DO CHI</div>
        <div className={`${boxClass} min-h-[60px] whitespace-pre-line`}>
          {data.reason}
        </div>
      </div>

      {/* --- SỐ TIỀN --- */}
      <div className="mb-2 grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">PHÂN LOẠI CHI</div>
          <div className={boxClass}>{data.expenseType}</div>
        </div>

        <div>
          <div className="font-semibold">SỐ TIỀN (VNĐ)</div>
          <div className={boxClass}>{data.amount.toLocaleString()}</div>
        </div>
      </div>

      {/* --- SỐ TIỀN BẰNG CHỮ --- */}
      <div className="mb-6">
        <div className="font-semibold">SỐ TIỀN BẰNG CHỮ</div>
        <div className={`${boxClass} italic text-red-600`}>
          {data.amountInWords}
        </div>
      </div>

      {/* --- KÝ TÊN --- */}
      <div className="grid grid-cols-2 text-center mt-4">
        <div>
          <div className="font-semibold">GIÁM ĐỐC</div>
          <div style={{ height: "60px" }}></div>
        </div>
        <div>
          <div className="font-semibold">KẾ TOÁN</div>
          <div style={{ height: "60px" }}></div>
        </div>
      </div>

      <div className="text-center mt-4 print:hidden">
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
