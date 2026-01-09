const mongoose = require("mongoose");

const SchCustomerOddSchema = new mongoose.Schema(
  {
    //lấy ở chuyến gốc
    tenLaiXe: { type: String, default: "" }, // TÊN LÁI XE
    dienGiai: { type: String, default: "" }, // DIỄN GIẢI
    ngayBocHang: { type: Date, default: null }, // NGÀY BỐC HÀNG
    ngayGiaoHang: { type: Date, default: null }, // NGÀY GIAO HÀNG
    diemXepHang: { type: String, default: "" }, // ĐIỂM XẾP HÀNG
    diemDoHang: { type: String, default: "" }, // ĐIỂM DỠ HÀNG
    soDiem: { type: String, default: "" }, // SỐ ĐIỂM
    trongLuong: { type: String, default: "" }, // TRỌNG LƯỢNG
    bienSoXe: { type: String, default: "" }, // BIỂN SỐ XE
    cuocPhi: { type: String, default: "" }, // CƯỚC PHÍ
    themDiem: { type: String, default: "" }, // THÊM ĐIỂM
    bocXep: { type: String, default: "" }, // BỐC XẾP
    ve: { type: String, default: "" }, // VÉ
    hangVe: { type: String, default: "" }, // HÀNG VỀ
    luuCa: { type: String, default: "" }, // LƯU CA
    luatChiPhiKhac: { type: String, default: "" }, // LUẬT CP KHÁC
    ghiChu: { type: String, default: "" }, // GHI CHÚ
    maChuyen: { type: String, unique: true }, // MÃ CHUYẾN
    maKH: { type: String, default: "" }, // MÃ KHÁCH HÀNG
    daThanhToan: { type: String, default: "" }, // ĐÃ THANH TOÁN

    diemXepHangNew: { type: String, default: "" }, // ĐIỂM XẾP HÀNG MỚI
    diemDoHangNew: { type: String, default: "" }, // ĐIỂM DỠ HÀNG MỚI
    KHdiemGiaoHang: { type: String, default: "" }, // KH ĐIỂM GIAO HÀNG

    //tự tạo khác
    tongTien: { type: Number, default: 0 }, // tổng tiền chuyến
    conLai: { type: Number, default: 0 }, // còn lại = tongTien - daThanhToan

    debtCode: {
      type: String,
      default: null, // kỳ được chuyển sang
    },

    nameCustomer: { type: String, default: "" },
    noteOdd: { type: String, default: "" },

    status: {
      type: String,
      enum: ["CHUA_TRA", "TRA_MOT_PHAN", "HOAN_TAT"],
      default: "CHUA_TRA",
    },

    highlightColor: {
      type: String,
      default: "", // ví dụ: "yellow", "green", "#FFF3CD"
    },
  },
  { timestamps: true }
);

const SchCustomerOdd = mongoose.model("SchCustomerOdd", SchCustomerOddSchema);
module.exports = SchCustomerOdd;
