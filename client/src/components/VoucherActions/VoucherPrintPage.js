import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API from "../../api";

const boxClass =
  "border border-gray-300 p-2 mt-1 " +
  "text-gray-900 font-bold " 


function formatBankAccountWithText(raw) {
  if (!raw) return "";

  // Tách phần số đầu tiên
  const match = raw.match(/^([\d\s]+)(.*)$/);

  if (!match) return raw;

  const numberPart = match[1].replace(/\D/g, "");
  const textPart = match[2] || "";

  const formattedNumber = numberPart
    .replace(/(.{4})/g, "$1 ")
    .trim();

  return `${formattedNumber}${textPart}`;
}


const PAYMENT_SOURCE_LABEL = {
  PERSONAL_VCB: "Cá nhân - VCB",
  PERSONAL_TCB: "Cá nhân - TCB",
  COMPANY_VCB: "Công ty - VCB",
  COMPANY_TCB: "Công ty - TCB",
  CASH: "Tiền mặt",
  OTHER: "Khác",
};

export default function VoucherPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  console.log(data);

  useEffect(() => {
    axios.get(`${API}/vouchers/${id}`).then((res) => {
      setData(res.data);
    });
  }, [id]);

  if (!data) return <div className="p-4">Đang tải...</div>;

  const isCompanyPayment = data.paymentSource?.startsWith("COMPANY");

  const voucherTitle = isCompanyPayment ? "ĐỀ NGHỊ THANH TOÁN" : "PHIẾU CHI";

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
      <div className="flex justify-end font-semibold">
        <span>{data.voucherCode}</span>
      </div>
      <h1 className="text-center text-xl font-bold mb-2 mt-0">
        {voucherTitle}
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
          {PAYMENT_SOURCE_LABEL[data.paymentSource] || data.paymentSource}
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
        <div className={boxClass}>{formatBankAccountWithText(data.receiverBankAccount)}</div>
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
          <div className={`${boxClass} text-lg`}>{data.expenseType}</div>
        </div>

        <div>
          <div className="font-semibold">SỐ TIỀN (VNĐ)</div>
          <div className={`${boxClass} text-lg`}>
            {data.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* --- SỐ TIỀN BẰNG CHỮ --- */}
      <div className="mb-6">
        <div className="font-semibold">SỐ TIỀN BẰNG CHỮ</div>
        <div className={`${boxClass} italic text-red-600 text-lg print:text-red-700`}>
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
