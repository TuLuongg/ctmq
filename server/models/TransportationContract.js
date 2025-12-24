const mongoose = require("mongoose");

const TransportationContractSchema = new mongoose.Schema({
  khachHang: { type: String, required: true },              //Tên khách hàng
  numberTrans: { type: String, required: true },            //Số hợp đồng vận chuyển
  typeTrans: { type: String, default:'' },                   // Loại hợp đồng
  timeStart: { type: Date, default: '' },                    //Thời gian bắt đầu
  timeEnd: { type: Date, default: '' },                    //Thời gian kết thúc
  timePay: { type: Date, default:'' },                   // Thời hạn thanh toán
  yesOrNo: { type: String, default:'' },                   // Có báo giá (Có/Không)
  dayRequest: { type: Date, default:'' },                   //Ngày yêu cầu
  dayUse: { type: Date, default:'' },                   // Ngày áp dụng
  price: { type: Number, default: 0 },                  //Giá dầu
  numberPrice: { type: String, default:'' },             //Số báo giá
  daDuyet: { type: String, default:'' },             //Đã duyệt
  ghiChu: { type: String, default:'' },                      // Ghi chú
  isLocked: {type: Boolean, default: false}
});


const TransportationContract = mongoose.model("TransportationContract", TransportationContractSchema);

module.exports = TransportationContract;
