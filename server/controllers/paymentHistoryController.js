const TripPayment = require("../models/TripPayment");
const CustomerDebtPeriod = require("../models/CustomerDebtPeriod");
const PaymentReceipt = require("../models/PaymentReceipt");
const Customer = require("../models/Customer");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const path = require("path");
const ExcelJS = require("exceljs");

// Map trường chuẩn → (base, bổ sung)
const fieldMap = {
  chiPhiKhac: { base: "luatChiPhiKhac", bs: "cpKhacBS" },
  cuocPhi: { base: "cuocPhi", bs: "cuocPhiBS" },
  bocXep: { base: "bocXep", bs: "bocXepBS" },
  ve: { base: "ve", bs: "veBS" },
  hangVe: { base: "hangVe", bs: "hangVeBS" },
  luuCa: { base: "luuCa", bs: "luuCaBS" },
  themDiem: { base: "themDiem", bs: "themDiem" },
};

const pickBaseOnly = (obj, field) => {
  const map = fieldMap[field];
  if (!map) return 0;

  return Number(obj[map.base]) || 0;
};

const pickBsOnly = (obj, field) => {
  const map = fieldMap[field];
  if (!map) return 0;

  return Number(obj[map.bs]) || 0;
};

const calcTripCostOddCustomer = (trip) => {
  return (
    pickBaseOnly(trip, "cuocPhi") +
    pickBaseOnly(trip, "bocXep") +
    pickBaseOnly(trip, "ve") +
    pickBaseOnly(trip, "hangVe") +
    pickBaseOnly(trip, "luuCa") +
    pickBaseOnly(trip, "chiPhiKhac") +
    pickBaseOnly(trip, "themDiem")
  );
};

const calcTripCostSharedCustomer = (trip) => {
  return (
    pickBsOnly(trip, "cuocPhi") +
    pickBsOnly(trip, "bocXep") +
    pickBsOnly(trip, "ve") +
    pickBsOnly(trip, "hangVe") +
    pickBsOnly(trip, "luuCa") +
    pickBsOnly(trip, "chiPhiKhac") +
    pickBsOnly(trip, "themDiem")
  );
};

//Sinh mã công nợ
const buildDebtCode = async (maKH, month, year) => {
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);

  const prefix = `CN.${maKH}.${mm}.${yy}`;

  // 🔎 tìm kỳ lớn nhất hiện có trong tháng
  const latest = await CustomerDebtPeriod.findOne({
    debtCode: { $regex: `^${prefix}\\.\\d{2}$` },
  }).sort({ debtCode: -1 });

  let nextIndex = 1;

  if (latest) {
    const parts = latest.debtCode.split(".");
    nextIndex = parseInt(parts[parts.length - 1], 10) + 1;
  }

  const xx = String(nextIndex).padStart(2, "0");

  return `${prefix}.${xx}`;
};

const calcStatus = (total, paid, remain) => {
  if (total === 0 || remain <= 0) return "HOAN_TAT";
  if (paid > 0 && remain > 0) return "TRA_MOT_PHAN";
  return "CHUA_TRA";
};

const calcPeriodMoneyFromTrips = (trips, vatPercent = 0) => {
  let totalAmountInvoice = 0;
  let totalAmountCash = 0;
  let totalOther = 0;
  let paidAmount = 0;

  for (const t of trips) {
    const tripTotal = calcTripCostSharedCustomer(t);
    const tripPaid = parseFloat(t.daThanhToan) || 0;

    if (t.paymentType === "CASH") {
      totalAmountCash += tripTotal;
    } else if (t.paymentType === "OTHER") {
      totalOther += tripTotal;
    } else {
      totalAmountInvoice += tripTotal; // INVOICE
    }

    paidAmount += tripPaid;
  }

  const vatAmount = totalAmountInvoice * (vatPercent / 100);
  const totalAmount =
    totalAmountInvoice + totalAmountCash + totalOther + vatAmount;

  const remainAmount = totalAmount - paidAmount;

  return {
    totalAmountInvoice,
    totalAmountCash,
    totalOther,
    vatAmount,
    totalAmount,
    paidAmount,
    remainAmount, // ✅ giữ nguyên âm nếu có
  };
};

// =====================================================
// 📌 LẤY CÔNG NỢ KHÁCH HÀNG (KH CHUNG, ≠26)
// =====================================================
exports.getCustomerDebt = async (req, res) => {
  try {
    const { manageMonth } = req.query;
    if (!manageMonth) {
      return res.status(400).json({ error: "Thiếu manageMonth" });
    }

    const periods = await CustomerDebtPeriod.find({
      manageMonth,
      customerCode: { $ne: "26" },
    }).sort({ customerCode: 1, fromDate: 1 });

    // 1️⃣ TRẢ DATA NGAY CHO FE (CÓ VAT)
    res.json(
      periods.map((p) => ({
        debtCode: p.debtCode,
        customerCode: p.customerCode,
        fromDate: p.fromDate,
        toDate: p.toDate,
        manageMonth: p.manageMonth,

        vatPercent: p.vatPercent || 0,
        totalAmountInvoice: p.totalAmountInvoice || 0,
        totalAmountCash: p.totalAmountCash || 0,
        totalOther: p.totalOther || 0,

        totalAmount: p.totalAmount, // sau VAT
        paidAmount: p.paidAmount,
        remainAmount: p.remainAmount,
        tripCount: p.tripCount || 0,
        status: p.status,
        isLocked: p.isLocked,
        note: p.note,
      }))
    );

    // 2️⃣ RECALC NGẦM (CHUẨN THEO CODE HIỆN CÓ)
    setImmediate(async () => {
      for (const p of periods) {
        if (p.isLocked) continue;

        // lấy lại trips của kỳ
        const trips = await ScheduleAdmin.find({ debtCode: p.debtCode });
        const tripCount = trips.length;

        const money = calcPeriodMoneyFromTrips(trips, p.vatPercent || 0);

        const changed =
          p.totalAmountInvoice !== money.totalAmountInvoice ||
          p.totalAmountCash !== money.totalAmountCash ||
          p.totalOther !== money.totalOther ||
          p.totalAmount !== money.totalAmount ||
          p.paidAmount !== money.paidAmount ||
          p.remainAmount !== money.remainAmount ||
          p.tripCount !== tripCount;

        if (changed) {
          p.totalAmountInvoice = money.totalAmountInvoice;
          p.totalAmountCash = money.totalAmountCash;
          p.totalOther = money.totalOther;
          p.totalAmount = money.totalAmount;
          p.paidAmount = money.paidAmount;
          p.remainAmount = money.remainAmount;
          p.tripCount = tripCount;
          p.status = calcStatus(
            money.totalAmount,
            money.paidAmount,
            money.remainAmount
          );

          await p.save();
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy công nợ khách hàng" });
  }
};

// =====================================================
// 📌 LẤY TẤT CẢ KỲ CÔNG NỢ CỦA 1 KHÁCH HÀNG THEO NĂM
// =====================================================
exports.getCustomerDebtPeriodsByYear = async (req, res) => {
  try {
    const { customerCode } = req.params;
    const { year } = req.query;

    if (!customerCode) {
      return res.status(400).json({ error: "Thiếu customerCode" });
    }

    if (!year || isNaN(year)) {
      return res.status(400).json({ error: "Thiếu hoặc sai year" });
    }

    // KH 26 dùng API riêng
    if (customerCode === "26") {
      return res.status(400).json({ error: "KH 26 không dùng API này" });
    }

    const y = Number(year);

    // from 01/01/yyyy → 31/12/yyyy
    const fromDate = new Date(y, 0, 1);
    const toDate = new Date(y, 11, 31, 23, 59, 59, 999);

    const periods = await CustomerDebtPeriod.find({
      customerCode,
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    }).sort({ fromDate: 1 });

    // Recalc NGẦM giống getCustomerDebt
    setImmediate(async () => {
      for (const p of periods) {
        if (p.isLocked) continue;

        const trips = await ScheduleAdmin.find({
          debtCode: p.debtCode,
        });

        const tripCount = trips.length;

        const money = calcPeriodMoneyFromTrips(trips, p.vatPercent || 0);

        const changed =
          p.totalAmountInvoice !== money.totalAmountInvoice ||
          p.totalAmountCash !== money.totalAmountCash ||
          p.totalOther !== money.totalOther ||
          p.totalAmount !== money.totalAmount ||
          p.paidAmount !== money.paidAmount ||
          p.remainAmount !== money.remainAmount ||
          p.tripCount !== tripCount;

        if (changed) {
          p.totalAmountInvoice = money.totalAmountInvoice;
          p.totalAmountCash = money.totalAmountCash;
          p.totalOther = money.totalOther;
          p.totalAmount = money.totalAmount;
          p.paidAmount = money.paidAmount;
          p.remainAmount = money.remainAmount;
          p.tripCount = tripCount;
          p.status = calcStatus(
            money.totalAmount,
            money.paidAmount,
            money.remainAmount
          );

          await p.save();
        }
      }
    });

    // Trả data cho FE
    res.json(
      periods.map((p) => ({
        debtCode: p.debtCode,
        customerCode: p.customerCode,
        manageMonth: p.manageMonth,
        fromDate: p.fromDate,
        toDate: p.toDate,

        vatPercent: p.vatPercent || 0,
        totalAmountInvoice: p.totalAmountInvoice || 0,
        totalAmountCash: p.totalAmountCash || 0,
        totalOther: p.totalOther || 0,

        totalAmount: p.totalAmount,
        paidAmount: p.paidAmount,
        remainAmount: p.remainAmount,
        tripCount: p.tripCount || 0,

        status: p.status,
        isLocked: p.isLocked,
        note: p.note || "",
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy kỳ công nợ theo năm" });
  }
};

// =====================================================
// 📌 TẠO KỲ CÔNG NỢ (KH CHUNG)
// =====================================================
exports.createDebtPeriod = async (req, res) => {
  try {
    const {
      customerCode,
      manageMonth,
      fromDate,
      toDate,
      note,
      vatPercent = 0,
    } = req.body;

    if (!customerCode || !fromDate || !toDate) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    if (customerCode === "26") {
      return res.status(400).json({ error: "KH 26 không dùng API này" });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // parse manageMonth dạng MM/YYYY
    let month, year;
    if (manageMonth && manageMonth.includes("/")) {
      const [m, y] = manageMonth.split("/");
      month = Number(m);
      year = Number(y);
    }

    if (!month || !year) {
      return res.status(400).json({
        error: "manageMonth không đúng định dạng MM/YYYY",
      });
    }

    // ✅ TẠO debtCode TRƯỚC
    const debtCode = await buildDebtCode(customerCode, month, year);

    // ✅ GÁN debtCode + paymentType cho chuyến
    await ScheduleAdmin.updateMany(
      {
        maKH: customerCode,
        ngayGiaoHang: { $gte: from, $lte: to },

        // ✅ CHỈ CHẤP NHẬN NULL
        debtCode: null,
      },
      {
        $set: {
          debtCode,
          paymentType: "INVOICE",
        },
      }
    );

    // ✅ LẤY LẠI CHUYẾN SAU KHI ĐÃ GÁN debtCode
    const trips = await ScheduleAdmin.find({ debtCode });

    // ✅ TÍNH TIỀN
    const money = calcPeriodMoneyFromTrips(trips, vatPercent);

    // ✅ TẠO KỲ CÔNG NỢ
    const period = new CustomerDebtPeriod({
      debtCode,
      customerCode,
      manageMonth,
      fromDate: from,
      toDate: to,
      vatPercent,
      totalAmountInvoice: money.totalAmountInvoice,
      totalAmountCash: money.totalAmountCash,
      totalOther: money.totalOther,
      totalAmount: money.totalAmount,
      paidAmount: money.paidAmount,
      remainAmount: money.remainAmount,
      status: calcStatus(
        money.totalAmount,
        money.paidAmount,
        money.remainAmount
      ),
      note,
    });

    await period.save();

    res.json({
      message: "Đã tạo kỳ công nợ",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không tạo được kỳ công nợ" });
  }
};

// =====================================================
// ✏️ SỬA KỲ CÔNG NỢ (GIỚI HẠN THEO KỲ TRƯỚC)
// =====================================================
exports.updateDebtPeriod = async (req, res) => {
  try {
    const { debtCode } = req.params;
    const { fromDate, toDate, note, vatPercent } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "Thiếu fromDate hoặc toDate" });
    }

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    if (period.isLocked) {
      return res.status(400).json({ error: "Kỳ đã bị khoá, không thể sửa" });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from > to) {
      return res.status(400).json({ error: "fromDate phải <= toDate" });
    }

    // =================================================
    // ✅ GÁN THÊM CHUYẾN CHƯA THUỘC KỲ NÀO
    // =================================================
    await ScheduleAdmin.updateMany(
      {
        maKH: period.customerCode,
        ngayGiaoHang: { $gte: from, $lte: to },

        // 🔒 CHỈ NHẬN CHUYẾN CHƯA THUỘC KỲ
        $or: [{ debtCode: null }, { debtCode: { $exists: false } }],
      },
      {
        $set: {
          debtCode: period.debtCode,
          paymentType: "INVOICE",
        },
      }
    );

    // =================================================
    // 🔄 TÍNH LẠI TIỀN TOÀN KỲ
    // =================================================
    const trips = await ScheduleAdmin.find({
      debtCode: period.debtCode,
    });

    const money = calcPeriodMoneyFromTrips(
      trips,
      vatPercent ?? period.vatPercent
    );

    period.fromDate = from;
    period.toDate = to;
    period.vatPercent = vatPercent ?? period.vatPercent;

    period.totalAmountInvoice = money.totalAmountInvoice;
    period.totalAmountCash = money.totalAmountCash;
    period.totalOther = money.totalOther;
    period.totalAmount = money.totalAmount;
    period.paidAmount = money.paidAmount;
    period.remainAmount = money.remainAmount;
    period.status = calcStatus(
      money.totalAmount,
      money.paidAmount,
      money.remainAmount
    );

    period.note = note ?? period.note;

    await period.save();

    res.json({
      message: "Đã cập nhật kỳ công nợ",
      tripCount: trips.length,
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không sửa được kỳ công nợ" });
  }
};

// =====================================================
// ✂️ XOÁ CHUYẾN KHỎI KỲ CÔNG NỢ
// =====================================================
exports.removeTripFromDebtPeriod = async (req, res) => {
  try {
    const { debtCode, maChuyen } = req.params;

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    if (period.isLocked) {
      return res.status(400).json({ error: "Kỳ công nợ đã bị khoá" });
    }

    const trip = await ScheduleAdmin.findOne({ maChuyen, debtCode });
    if (!trip) {
      return res.status(404).json({ error: "Chuyến không thuộc kỳ này" });
    }

    // ❌ GỠ debtCode
    trip.debtCode = null;
    await trip.save();

    // 🔄 TÍNH LẠI TIỀN KỲ
    const trips = await ScheduleAdmin.find({ debtCode });
    const tripCount = trips.length;

    period.tripCount = tripCount;

    const money = calcPeriodMoneyFromTrips(trips, period.vatPercent || 0);

    period.totalAmountInvoice = money.totalAmountInvoice;
    period.totalAmountCash = money.totalAmountCash;
    period.totalOther = money.totalOther;
    period.totalAmount = money.totalAmount;
    period.paidAmount = money.paidAmount;
    period.remainAmount = money.remainAmount;
    period.status = calcStatus(
      money.totalAmount,
      money.paidAmount,
      money.remainAmount
    );

    await period.save();

    res.json({
      message: "Đã xoá chuyến khỏi kỳ công nợ",
      maChuyen,
      debtCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không xoá được chuyến khỏi kỳ" });
  }
};

// =====================================================
// ➕ ADD CHUYẾN VÀO KỲ CÔNG NỢ (THEO MÃ CHUYẾN)
// =====================================================
exports.addTripToDebtPeriod = async (req, res) => {
  try {
    const { debtCode } = req.params;
    const { maChuyen } = req.body;

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    if (period.isLocked) {
      return res.status(400).json({ error: "Kỳ công nợ đã bị khoá" });
    }

    const trip = await ScheduleAdmin.findOne({ maChuyen });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    if (trip.maKH !== period.customerCode) {
      return res.status(400).json({
        error: "Chuyến không thuộc khách hàng của kỳ công nợ",
      });
    }

    // 🚫 CHUYẾN ĐÃ THUỘC KỲ KHÁC
    if (trip.debtCode && trip.debtCode !== debtCode) {
      return res.status(400).json({
        error: `Chuyến ${maChuyen} đã thuộc kỳ công nợ ${trip.debtCode}`,
        existedDebtCode: trip.debtCode,
      });
    }

    // ✅ GÁN debtCode
    trip.debtCode = debtCode;

    if (!trip.paymentType) {
      trip.paymentType = "INVOICE";
    }

    await trip.save();

    // 🔄 TÍNH LẠI TIỀN KỲ
    const trips = await ScheduleAdmin.find({ debtCode });
    period.tripCount = trips.length;

    const money = calcPeriodMoneyFromTrips(trips, period.vatPercent || 0);

    period.totalAmountInvoice = money.totalAmountInvoice;
    period.totalAmountCash = money.totalAmountCash;
    period.totalOther = money.totalOther;
    period.totalAmount = money.totalAmount;
    period.paidAmount = money.paidAmount;
    period.remainAmount = money.remainAmount;
    period.status = calcStatus(
      money.totalAmount,
      money.paidAmount,
      money.remainAmount
    );

    await period.save();

    res.json({
      message: "Đã thêm chuyến vào kỳ công nợ",
      maChuyen,
      debtCode,
    });
  } catch (err) {
    console.error("❌ addTripToDebtPeriod:", err);
    res.status(500).json({ error: "Không thêm được chuyến vào kỳ" });
  }
};

// =====================================================
// SET CASH / INVOICE CHO CHUYẾN (THEO BODY)
// =====================================================
exports.toggleTripPaymentType = async (req, res) => {
  try {
    const { maChuyenCode } = req.params;
    const { paymentType } = req.body; // 👈 nhận từ FE

    if (!["CASH", "INVOICE", "OTHER"].includes(paymentType)) {
      return res.status(400).json({
        error: "paymentType phải là CASH hoặc INVOICE",
      });
    }

    const trip = await ScheduleAdmin.findOne({ maChuyen: maChuyenCode });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // ❗ nếu không đổi thì khỏi làm gì
    if (trip.paymentType === paymentType) {
      return res.json({
        message: "paymentType không thay đổi",
        paymentType: trip.paymentType,
      });
    }

    // ✅ SET TRỰC TIẾP
    trip.paymentType = paymentType;
    await trip.save();

    // 🔄 tính lại kỳ công nợ (nếu có & chưa khóa)
    const period = await CustomerDebtPeriod.findOne({
      debtCode: trip.debtCode,
      isLocked: false,
    });

    if (period) {
      const trips = await ScheduleAdmin.find({
        debtCode: period.debtCode,
      });

      const money = calcPeriodMoneyFromTrips(trips, period.vatPercent || 0);

      period.totalAmountInvoice = money.totalAmountInvoice;
      period.totalAmountCash = money.totalAmountCash;
      period.totalOther = money.totalOther;
      period.totalAmount = money.totalAmount;
      period.paidAmount = money.paidAmount;
      period.remainAmount = money.remainAmount;
      period.status = calcStatus(
        money.totalAmount,
        money.paidAmount,
        money.remainAmount
      );

      await period.save();
    }

    res.json({
      message: "Đã cập nhật paymentType",
      paymentType: trip.paymentType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không cập nhật được paymentType" });
  }
};

// =====================================================
// 📌 THANH TOÁN KỲ CÔNG NỢ (KH CHUNG)
// =====================================================
exports.addPaymentReceipt = async (req, res) => {
  try {
    const { debtCode, customerCode, amount, method, note, createdBy } =
      req.body;

    if (!customerCode || !amount) {
      return res.status(400).json({ error: "Thiếu customerCode hoặc amount" });
    }

    let remainMoney = parseFloat(amount);
    const allocations = [];

    // Lấy các kỳ công nợ chưa hoàn tất, sắp xếp từ cũ → mới
    const periods = await CustomerDebtPeriod.find({
      customerCode,
      status: { $ne: "HOAN_TAT" },
    }).sort({ fromDate: 1 });

    // Cập nhật công nợ từng kỳ trước khi tạo phiếu
    for (const p of periods) {
      if (remainMoney <= 0) break;

      // Số tiền có thể trừ vào kỳ này
      const deduct = Math.min(p.remainAmount, remainMoney);

      p.paidAmount = (parseFloat(p.paidAmount) || 0) + deduct;
      p.remainAmount = (parseFloat(p.remainAmount) || 0) - deduct;
      p.status = p.remainAmount <= 0 ? "HOAN_TAT" : "TRA_MOT_PHAN";

      await p.save(); // ✅ lưu vào DB

      allocations.push({
        debtPeriodId: p._id, // đúng theo model PaymentReceipt
        amount: deduct,
      });

      remainMoney -= deduct;
    }

    // Tạo phiếu thu
    const receipt = new PaymentReceipt({
      debtCode,
      customerCode,
      amount,
      method,
      note,
      allocations, // mảng allocations đúng model
      createdBy,
    });

    await receipt.save();

    res.json({
      message:
        "Đã ghi nhận phiếu thu (KH chung) và tự động trừ vào kỳ công nợ cũ nhất",
      receipt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể tạo phiếu thu" });
  }
};

// =====================================================
// 🔄 HUỶ PHIẾU THU
// =====================================================
exports.rollbackPaymentReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    const receipt = await PaymentReceipt.findById(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu thu" });
    }

    for (const alloc of receipt.allocations) {
      const period = await CustomerDebtPeriod.findById(alloc.debtPeriodId);
      if (!period) continue;

      // 1️⃣ rollback paidAmount
      period.paidAmount = Math.max((period.paidAmount || 0) - alloc.amount, 0);

      // 2️⃣ TÍNH LẠI remainAmount (❗ QUAN TRỌNG)
      period.remainAmount = Math.max(
        (period.totalAmount || 0) - period.paidAmount,
        0
      );

      // 3️⃣ cập nhật trạng thái
      if (period.remainAmount <= 0) {
        period.status = "HOAN_TAT";
      } else if (period.paidAmount <= 0) {
        period.status = "CHUA_TRA";
      } else {
        period.status = "TRA_MOT_PHAN";
      }

      await period.save();
    }

    await receipt.deleteOne();

    res.json({ message: "Đã huỷ phiếu thu và rollback công nợ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể huỷ phiếu thu" });
  }
};

// =====================================================
// 📌 LẤY LỊCH SỬ PHIẾU THU THEO KHÁCH HÀNG
// =====================================================
exports.getPaymentHistoryByCustomer = async (req, res) => {
  try {
    const { customerCode, debtCode } = req.params;
    if (!customerCode) {
      return res.status(400).json({ error: "Thiếu customerCode" });
    }

    // Lấy tất cả phiếu thu của khách hàng, mới nhất trước
    const receipts = await PaymentReceipt.find({ customerCode, debtCode })
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      receipts.map(async (r) => {
        // Lấy thông tin phân bổ từng kỳ
        const allocationsWithPeriod = await Promise.all(
          r.allocations.map(async (alloc) => {
            const period = await CustomerDebtPeriod.findById(
              alloc.debtPeriodId
            ).lean();
            if (!period) return null;
            return {
              debtPeriodId: period._id,
              debtCode: period.debtCode,
              amountAllocated: alloc.amount,
              remainAmountAfter: period.remainAmount,
            };
          })
        );

        return {
          receiptId: r._id,
          amount: r.amount,
          method: r.method,
          note: r.note,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
          allocations: allocationsWithPeriod.filter(Boolean),
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không lấy được lịch sử phiếu thu" });
  }
};

// =====================================================
// 📌 CHUYẾN THUỘC KỲ CÔNG NỢ
// =====================================================
exports.getDebtPeriodDetail = async (req, res) => {
  try {
    const { debtCode } = req.params;

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    const trips = await ScheduleAdmin.find({
      debtCode: period.debtCode,
    });

    const receipts = await PaymentReceipt.find({
      "allocations.debtPeriodId": period._id,
    }).sort({ createdAt: -1 });

    res.json({
      period,
      trips,
      receipts,
    });
  } catch (err) {
    res.status(500).json({ error: "Không lấy được chi tiết kỳ công nợ" });
  }
};

// =====================================================
// 🔐 KHOÁ KỲ CÔNG NỢ
// =====================================================
exports.lockDebtPeriod = async (req, res) => {
  try {
    const { debtCode } = req.params;
    const { lockedBy } = req.body;

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    if (period.isLocked) {
      return res.status(400).json({ error: "Kỳ đã bị khoá" });
    }

    period.isLocked = true;
    period.lockedAt = new Date();
    period.lockedBy = lockedBy || "";

    await period.save();

    res.json({
      message: "Đã khoá kỳ công nợ",
      period,
    });
  } catch (err) {
    res.status(500).json({ error: "Không khoá được kỳ công nợ" });
  }
};

// =====================================================
// 🔓 MỞ KHOÁ KỲ CÔNG NỢ
// =====================================================
exports.unlockDebtPeriod = async (req, res) => {
  try {
    const { debtCode } = req.params;
    const { unlockedBy } = req.body;

    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    if (!period.isLocked) {
      return res.status(400).json({ error: "Kỳ công nợ chưa bị khoá" });
    }

    period.isLocked = false;
    period.unlockedAt = new Date();
    period.unlockedBy = unlockedBy || "";

    await period.save();

    res.json({
      message: "Đã mở khoá kỳ công nợ",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không mở khoá được kỳ công nợ" });
  }
};

// =====================================================
// 🗑️ XOÁ 1 KỲ CÔNG NỢ (KH CHUNG)
// =====================================================
exports.deleteDebtPeriod = async (req, res) => {
  try {
    const { debtCode } = req.params;

    if (!debtCode) {
      return res.status(400).json({ error: "Thiếu debtCode" });
    }

    // 1️⃣ Lấy kỳ công nợ
    const period = await CustomerDebtPeriod.findOne({ debtCode });
    if (!period) {
      return res.status(404).json({ error: "Không tìm thấy kỳ công nợ" });
    }

    // 2️⃣ Không cho xoá nếu kỳ đã khoá
    if (period.isLocked) {
      return res.status(400).json({
        error: "Kỳ công nợ đã bị khoá, không thể xoá",
      });
    }

    // 3️⃣ Không cho xoá nếu đã có phiếu thu
    const existedReceipt = await PaymentReceipt.findOne({
      "allocations.debtPeriodId": period._id,
    });

    if (existedReceipt) {
      return res.status(400).json({
        error: "Kỳ công nợ đã có phiếu thu, không thể xoá",
      });
    }

    // ✅ 4️⃣ RESET debtCode của các chuyến
    await ScheduleAdmin.updateMany({ debtCode }, { $set: { debtCode: null } });

    // 5️⃣ Xoá kỳ công nợ
    await period.deleteOne();

    res.json({
      message: "Đã xoá kỳ công nợ và reset debtCode các chuyến",
      debtCode,
      customerCode: period.customerCode,
      manageMonth: period.manageMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể xoá kỳ công nợ" });
  }
};

// =====================================================
// XUẤT FILE CÔNG NỢ THEO THÁNG
// =====================================================
const formatDateVN = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const STATUS_LABEL = {
  CHUA_TRA: "Chưa trả",
  TRA_MOT_PHAN: "Còn ít",
  HOAN_TAT: "Hoàn tất",
};

exports.exportCustomerDebtByMonth = async (req, res) => {
  try {
    const { fromMonth, toMonth } = req.query;
    // FE gửi: 2025-01 → 2025-03

    if (!fromMonth || !toMonth) {
      return res.status(400).json({ message: "Thiếu fromMonth / toMonth" });
    }

    // ==============================
    // 🔧 CONVERT YYYY-MM → MM/YYYY
    // ==============================
    const convertMonth = (m) => {
      const [year, month] = m.split("-");
      return `${month}/${year}`;
    };

    const from = convertMonth(fromMonth);
    const to = convertMonth(toMonth);

    // ==============================
    // 1️⃣ LẤY DATA CÔNG NỢ
    // ==============================
    const debts = await CustomerDebtPeriod.find({
      manageMonth: { $gte: from, $lte: to },
    }).sort({ manageMonth: 1 });

    if (!debts.length) {
      return res.status(400).json({ message: "Không có dữ liệu công nợ" });
    }

    // ==============================
    // 2️⃣ MAP CUSTOMER CODE → NAME
    // ==============================
    const customerCodes = [...new Set(debts.map((d) => d.customerCode))];

    const customers = await Customer.find({
      code: { $in: customerCodes },
    });

    const customerMap = {};
    customers.forEach((c) => {
      customerMap[c.code] = c.name;
    });

    // ==============================
    // 3️⃣ LOAD FILE MẪU
    // ==============================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/CONG_NO_KHACH_HANG.xlsx")
    );

    const sheet = workbook.getWorksheet("Sheet1");
    if (!sheet) {
      return res.status(500).json({ message: "Không tìm thấy sheet Sheet1" });
    }

    // ==============================
    // 4️⃣ GHI DATA (TỪ DÒNG 2)
    // ==============================
    const startRow = 2;

    debts.forEach((d, index) => {
      const row = sheet.getRow(startRow + index);

      const fromDate = formatDateVN(d.fromDate);
      const toDate = formatDateVN(d.toDate);

      row.getCell("A").value = d.customerCode ?? "";
      row.getCell("B").value = customerMap[d.customerCode] ?? "";
      row.getCell("C").value = d.debtCode ?? "";
      row.getCell("D").value =
        fromDate && toDate ? `${fromDate}-${toDate}` : "";
      row.getCell("E").value = d.totalAmountInvoice ?? 0;
      row.getCell("F").value = d.vatPercent ?? 0;
      row.getCell("G").value = d.totalAmountCash ?? 0;
      row.getCell("H").value = d.totalOther ?? 0;
      row.getCell("I").value = d.totalAmount ?? 0;
      row.getCell("J").value = d.paidAmount ?? 0;
      row.getCell("K").value = d.remainAmount ?? 0;
      row.getCell("L").value = STATUS_LABEL[d.status] ?? "";
      row.getCell("M").value = d.note ?? "";

      row.commit();
    });

    // ==============================
    // 5️⃣ TRẢ FILE
    // ==============================
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=CONG_NO_${from}_DEN_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Export debt error:", err);
    res.status(500).json({ message: "Lỗi xuất file công nợ" });
  }
};
