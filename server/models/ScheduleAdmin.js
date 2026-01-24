const mongoose = require("mongoose");

const scheduleAdminSchema = new mongoose.Schema(
  {
    //Trạng thái chung
    ltState: { type: String, default: "" },
    onlState: { type: String, default: "" },
    offState: { type: String, default: "" },

    // 🧑‍💼 Thông tin người phụ trách
    dieuVan: { type: String, required: true }, // tên hoặc username điều vận
    dieuVanID: { type: String, required: true }, // _id thật của điều vận (string)
    createdBy: { type: String, required: true }, // người tạo chuyến (username hoặc fullName)
    keToanPhuTrach: { type: String, default: "" }, // tên kế toán phụ trách

    // 🧾 Thông tin chuyến
    tenLaiXe: { type: String, default: "" }, // TÊN LÁI XE
    khachHang: { type: String, default: "" }, // KHÁCH HÀNG
    dienGiai: { type: String, default: "" }, // DIỄN GIẢI
    ngayBocHang: { type: Date, default: null }, // NGÀY BỐC HÀNG
    ngayGiaoHang: { type: Date, default: null }, // NGÀY GIAO HÀNG
    diemXepHang: { type: String, default: "" }, // ĐIỂM XẾP HÀNG
    diemDoHang: { type: String, default: "" }, // ĐIỂM DỠ HÀNG
    soDiem: { type: String, default: "" }, // SỐ ĐIỂM
    themDiem: { type: String, default: "" }, // THÊM ĐIỂM
    trongLuong: { type: String, default: "" }, // TRỌNG LƯỢNG
    bienSoXe: { type: String, default: "" }, // BIỂN SỐ XE
    cuocPhi: { type: String, default: "" }, // CƯỚC PHÍ
    laiXeThuCuoc: { type: String, default: "" }, // LÁI XE THU CƯỚC
    bocXep: { type: String, default: "" }, // BỐC XẾP
    ve: { type: String, default: "" }, // VÉ
    hangVe: { type: String, default: "" }, // HÀNG VỀ
    luuCa: { type: String, default: "" }, // LƯU CA
    luatChiPhiKhac: { type: String, default: "" }, // LUẬT CP KHÁC
    ghiChu: { type: String, default: "" }, // GHI CHÚ
    maChuyen: { type: String, unique: true }, // MÃ CHUYẾN
    ngayBoc: { type: Date, default: null }, // NGÀY NHẬP
    accountUsername: { type: String, default: "" }, // USERNAME TÀI KHOẢN
    maHoaDon: { type: String, default: "" }, // MÃ HÓA ĐƠN
    maKH: { type: String, default: "" }, // MÃ KHÁCH HÀNG
    khoangCach: { type: String, default: "" }, // KHOẢNG CÁCH
    cuocPhiBS: { type: String, default: "" }, // CƯỚC PHÍ BỔ SUNG
    daThanhToan: { type: String, default: "" }, // ĐÃ THANH TOÁN
    bocXepBS: { type: String, default: "" }, // BỐC XẾP BỔ SUNG
    veBS: { type: String, default: "" }, // VÉ BỔ SUNG
    hangVeBS: { type: String, default: "" }, // HÀNG VỀ BỔ SUNG
    luuCaBS: { type: String, default: "" }, // LƯU CA BỔ SUNG
    cpKhacBS: { type: String, default: "" }, // CHI PHÍ KHÁC BỔ SUNG
    warning: { type: Boolean, default: false },

    diemXepHangNew: { type: String, default: "" }, // ĐIỂM XẾP HÀNG MỚI
    diemDoHangNew: { type: String, default: "" }, // ĐIỂM DỠ HÀNG MỚI
    KHdiemGiaoHang: { type: String, default: "" }, // KH ĐIỂM GIAO HÀNG

    percentHH: { type: Number, default: 0 }, //%HH
    moneyHH: { type: Number, default: 0 }, //Tiền HH
    moneyConLai: { type: Number, default: 0 }, //Tiền còn lại
    cuocTraXN: { type: Number, default: 0 }, //Cước trả xe ngoài
    doanhThu: { type: Number, default: 0 }, //Doanh thu

    tongTien: { type: Number, default: 0 }, // tổng tiền chuyến
    conLai: { type: Number, default: 0 }, // còn lại = tongTien - daThanhToan

    // ⚙️ Trạng thái chuyến
    trangThai: {
      type: String,
      enum: ["chuaChay", "dangChay", "hoanThanh"],
      default: "chuaChay",
    },

    // 🗑️ Thùng rác
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    debtCode: {
      type: String,
      default: null, // kỳ được chuyển sang
    },

    // 💰 HÌNH THỨC THANH TOÁN (MẶC ĐỊNH)
    paymentType: {
      type: String,
      enum: ["INVOICE", "CASH", "OTHER"],
      default: "INVOICE", // mặc định là hoá đơn
    },
  },
  { timestamps: true }
);

const ScheduleAdmin = mongoose.model("ScheduleAdmin", scheduleAdminSchema);
module.exports = ScheduleAdmin;
