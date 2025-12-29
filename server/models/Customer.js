const mongoose = require("mongoose");
const ScheduleAdmin = require("./ScheduleAdmin");

const customerSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, unique: false }, // Mã KH
    name: { type: String, required: true, trim: true }, // Tên KH
    nameHoaDon: { type: String, default: "" }, // Tên trên hoá đơn
    mstCCCD: { type: String, default: "" }, // MST / CCCD
    address: { type: String, default: "" }, // Địa chỉ
    accountant: { type: String, default: "" }, // Ghi chú
    percentHH: { type: Number, default: 0 }, // %HH
    accUsername: { type: String, trim: true, unique: true }, // Username
    createdBy: { type: String, default: "" },
    warning: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ======================================================
   🔥 AUTO RECALC HOA HỒNG KHI SỬA Customer.percentHH
====================================================== */
customerSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();

    // chỉ chạy khi có sửa percentHH
    const newPercent =
      update?.percentHH ?? update?.$set?.percentHH;
    if (newPercent == null) return next();

    // lấy customer cũ
    const customer = await this.model.findOne(this.getQuery());
    if (!customer?.code) return next();

    // helper convert string -> number
    const toNumber = (v) => {
      if (!v) return 0;
      const n = Number(String(v).replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    // lấy tất cả chuyến của khách
    const schedules = await ScheduleAdmin.find({
      maKH: customer.code,
      isDeleted: false,
    });

    for (const sch of schedules) {
      const cuocPhiBS = toNumber(sch.cuocPhiBS);
      const themDiem = toNumber(sch.themDiem);
      const hangVeBS = toNumber(sch.hangVeBS);

      const baseHH = cuocPhiBS + themDiem + hangVeBS;

      sch.percentHH = Number(newPercent) || 0;
      sch.moneyHH = Math.round((baseHH * sch.percentHH) / 100);
      sch.moneyConLai = cuocPhiBS - sch.moneyHH;

      await sch.save();
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Customer", customerSchema);
