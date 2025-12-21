const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
  repairUnit: {             // Đơn vị sửa chữa (bắt buộc)
    type: String,
    required: true,
  },
  repairDate: {             // Ngày sửa chữa
    type: Date,
    default: Date.now,      // mặc định là ngày hiện tại
  },
  vehiclePlate: {           // Biển số xe
    type: String,
    default: '',            // mặc định rỗng
  },
  repairDetails: {          // Chi tiết sửa chữa
    type: String,
    default: '',
  },
  unit: {                   // Đơn vị tính (ĐVT)
    type: String,
    default: '',
  },
  quantity: {               // Số lượng
    type: Number,
    default: 0,
  },
  unitPrice: {              // Đơn giá
    type: Number,
    default: 0,
  },
  totalAmount: {            // Thành tiền
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {               // Khuyến mãi
    type: String,
    default: 0,
  },
  warrantyDays: {           // Số ngày bảo hành
    type: Number,
    default: 0,
  },
  warrantyEndDate: {        // Ngày hết bảo hành
    type: Date,
  },
  note: {                   // Ghi chú
    type: String,
    default: '',
  },
  paymentDate: {            // Ngày thanh toán
    type: Date,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);
