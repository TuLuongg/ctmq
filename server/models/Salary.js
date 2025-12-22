const mongoose = require("mongoose");

const SalarySchema = new mongoose.Schema(
  {
    /* ===== THỜI GIAN ===== */
    ngayThang: { type: Date, required: true }, // Ngày tháng

    /* ===== XE ===== */
    bienSoXe: { type: String, default: "" }, // BIỂN SỐ XE

    /* ===== NHÂN SỰ ===== */
    stt: { type: Number },                   // STT
    tenNhanVien: { type: String, required: true }, // Tên nhân viên

    soTaiKhoan: { type: String, default: "" }, // Số TK ngân hàng
    tenNganHang: { type: String, default: "" }, // Tên ngân hàng

    /* ===== LƯƠNG CƠ BẢN ===== */
    luongThoaThuan: { type: Number, default: 0 },   // Lương thỏa thuận
    donGiaNgayCong: { type: Number, default: 0 },   // Đơn giá ngày công

    /* ===== CÔNG ===== */
    soNgayCongDiLam: { type: Number, default: 0 },  // Số ngày công đi làm
    tienCongDiLam: { type: Number, default: 0 },    // Số tiền công đi làm
    tienDienThoai: { type: Number, default: 0 },    // Tiền điện thoại

    soNgayCongNghi: { type: Number, default: 0 },   // Số ngày công nghỉ
    tienCongNghi: { type: Number, default: 0 },     // Số tiền công nghỉ

    /* ===== PHỤ CẤP / TRỪ ===== */
    muoiPhanTramLuong: { type: Number, default: 0 },// 10% Lương
    tongSo: { type: Number, default: 0 },             // Tổng số
    soTienTamUng: { type: Number, default: 0 },       // Số tiền tạm ứng
    bhxh: { type: Number, default: 0 },              // BHXH

    hoTroTienDienThoai: { type: Number, default: 0 }, // Hỗ trợ tiền điện thoại
    thuongLeTet: { type: Number, default: 0 },        // Thưởng lễ tết
    diMuonVeSom: { type: Number, default: 0 },        // Đi muộn / về sớm
    damHieu: { type: Number, default: 0 },            // Đám hiếu
    chuyenCan: { type: Number, default: 0 },          // Chuyên cần

    /* ===== TỔNG & THANH TOÁN ===== */
    soTienConDuocLinh: { type: Number, default: 0 },  // Số tiền còn được lĩnh

    /* ===== KHÁC ===== */
    ghiChu: { type: String, default: "" }, // Ghi chú

    soTienLuongDaGiu: { type: Number, default: 0 },   // Số tiền lương đã giữ
    soTienLuongConPhaiGiu: { type: Number, default: 0 }, // Số tiền lương còn phải giữ

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Salary", SalarySchema);
