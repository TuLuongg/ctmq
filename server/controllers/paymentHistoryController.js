const PaymentHistory = require("../models/PaymentHistory");
const TripPayment = require("../models/TripPayment");
const CustomerDebtPeriod = require("../models/CustomerDebtPeriod");
const PaymentReceipt = require("../models/PaymentReceipt");

const ScheduleAdmin = require("../models/ScheduleAdmin");

// Map trường chuẩn → (base, bổ sung)
const fieldMap = {
  chiPhiKhac: { base: "luatChiPhiKhac", bs: "cpKhacBS" },
  cuocPhi: { base: "cuocPhi", bs: "cuocPhiBS" },
  bocXep: { base: "bocXep", bs: "bocXepBS" },
  ve: { base: "ve", bs: "veBS" },
  hangVe: { base: "hangVe", bs: "hangVeBS" },
  luuCa: { base: "luuCa", bs: "luuCaBS" },
};

// Lấy giá trị theo rule: nếu có bổ sung → dùng bổ sung, không thì dùng base.
const pickValue = (obj, field) => {
  const map = fieldMap[field];
  if (!map) return 0;

  const baseVal = parseFloat(obj[map.base]) || 0;
  const bsVal = parseFloat(obj[map.bs]) || 0;

  if (obj[map.bs] !== undefined && obj[map.bs] !== null && obj[map.bs] !== "")
    return bsVal;

  return baseVal;
};

// Tính tổng tiền 1 chuyến
const calcTripCost = (trip) => {
  return (
    pickValue(trip, "cuocPhi") +
    pickValue(trip, "bocXep") +
    pickValue(trip, "ve") +
    pickValue(trip, "hangVe") +
    pickValue(trip, "luuCa") +
    pickValue(trip, "chiPhiKhac")
  );
};

//Sinh mã công nợ
const buildDebtCode = (maKH, month, year) => {
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `CN.${maKH}.${mm}.${yy}`;
};

const calcStatus = (total, paid, remain) => {
  if (total === 0 || remain <= 0) return "HOAN_TAT";
  if (paid > 0 && remain > 0) return "TRA_MOT_PHAN";
  return "CHUA_TRA";
};

const calcPeriodMoneyFromTrips = (trips) => {
  let totalAmount = 0;
  let paidAmount = 0;

  for (const t of trips) {
    const tripTotal = calcTripCost(t);
    const tripPaid = parseFloat(t.daThanhToan) || 0;

    totalAmount += tripTotal;
    paidAmount += tripPaid;
  }

  const remainAmount = totalAmount - paidAmount;

  return {
    totalAmount,
    paidAmount,
    remainAmount: remainAmount < 0 ? 0 : remainAmount,
  };
};

const calcPeriodMoneyFromTripsAndReceipts = async (period) => {
  const trips = await ScheduleAdmin.find({
    maKH: period.customerCode,
    ngayGiaoHang: { $gte: period.fromDate, $lte: period.toDate },
  });

  const { totalAmount, paidAmount: paidFromTrips } = calcPeriodMoneyFromTrips(trips);

  const receipts = await PaymentReceipt.find({
    "allocations.debtPeriodId": period._id,
  });

  const paidFromReceipts = receipts.reduce((sum, r) => {
    const alloc = r.allocations.find(a => a.debtPeriodId.toString() === period._id.toString());
    return sum + (alloc ? alloc.amount : 0);
  }, 0);

  const paidAmount = paidFromTrips + paidFromReceipts;
  const remainAmount = totalAmount - paidAmount;

  return {
    totalAmount,
    paidAmount,
    remainAmount: remainAmount < 0 ? 0 : remainAmount,
  };
};


// =====================================================
// 📌 LẤY CÔNG NỢ KHÁCH HÀNG (KH CHUNG, ≠26)
// =====================================================
exports.getCustomerDebt = async (req, res) => {
  try {
    const { manageMonth } = req.query;
    if (!manageMonth)
      return res.status(400).json({ error: "Thiếu manageMonth" });

    const periods = await CustomerDebtPeriod.find({
      manageMonth,
      customerCode: { $ne: "26" },
    }).sort({ customerCode: 1, fromDate: 1 });

    // 1️⃣ TRẢ NGAY CACHE
    res.json(periods.map(p => ({
      debtCode: p.debtCode,
      customerCode: p.customerCode,
      fromDate: p.fromDate,
      toDate: p.toDate,
      manageMonth: p.manageMonth,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      remainAmount: p.remainAmount,
      status: p.status,
    })));


setImmediate(async () => {
  for (const p of periods) {
    if (p.isLocked) continue;

    const { totalAmount, paidAmount, remainAmount } = await calcPeriodMoneyFromTripsAndReceipts(p);

    const changed =
      p.totalAmount !== totalAmount ||
      p.paidAmount !== paidAmount ||
      p.remainAmount !== remainAmount;

    if (changed) {
      p.totalAmount = totalAmount;
      p.paidAmount = paidAmount;
      p.remainAmount = remainAmount;
      p.status = calcStatus(totalAmount, paidAmount, remainAmount);
      await p.save();
    }
  }
});



  } catch (err) {
    console.error(err);
  }
};

// =====================================================
// 📌 TẠO KỲ CÔNG NỢ (KH CHUNG)
// =====================================================
exports.createDebtPeriod = async (req, res) => {
  try {
    const { customerCode, fromDate, toDate, note } = req.body;

    if (!customerCode || !fromDate || !toDate) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    if (customerCode === "26") {
      return res.status(400).json({ error: "KH 26 không dùng API này" });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // tạo manageMonth từ fromDate
    const manageMonth = `${String(from.getMonth() + 1).padStart(
      2,
      "0"
    )}/${from.getFullYear()}`;

    // check trùng tháng
    const existed = await CustomerDebtPeriod.findOne({
      customerCode,
      manageMonth,
    });
    if (existed) {
      return res.status(400).json({ error: "Kỳ công nợ đã tồn tại" });
    }

    // ❗ kiểm tra chồng kỳ
    const overlapped = await CustomerDebtPeriod.findOne({
      customerCode,
      fromDate: { $lte: to },
      toDate: { $gte: from },
    });

    if (overlapped) {
      return res.status(400).json({
        error: "Khoảng ngày bị trùng với kỳ công nợ khác",
        conflictPeriod: {
          debtCode: overlapped.debtCode,
          fromDate: overlapped.fromDate,
          toDate: overlapped.toDate,
          manageMonth: overlapped.manageMonth,
        },
      });
    }

    // tính tổng cước từ ScheduleAdmin
    // lấy chuyến trong kỳ
    const trips = await ScheduleAdmin.find({
      maKH: customerCode,
      ngayGiaoHang: {
        $gte: from,
        $lte: to,
      },
    });

    // 🔥 TÍNH CẢ ĐÃ THANH TOÁN
    const { totalAmount, paidAmount, remainAmount } =
      calcPeriodMoneyFromTrips(trips);

    const debtCode = buildDebtCode(
      customerCode,
      from.getMonth() + 1,
      from.getFullYear()
    );

    const period = new CustomerDebtPeriod({
      debtCode,
      customerCode,
      manageMonth,
      fromDate: from,
      toDate: to,
      totalAmount,
      paidAmount,
      remainAmount,
      status: calcStatus(totalAmount, paidAmount, remainAmount),
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
    const { fromDate, toDate, note } = req.body;

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

    const overlapped = await CustomerDebtPeriod.findOne({
      customerCode: period.customerCode,
      debtCode: { $ne: debtCode },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    });

    if (overlapped) {
      return res.status(400).json({
        error: "Khoảng ngày sửa bị trùng với kỳ khác",
      });
    }

    // 🔄 TÍNH LẠI TIỀN THEO KHOẢNG NGÀY MỚI
    const trips = await ScheduleAdmin.find({
      maKH: period.customerCode,
      ngayGiaoHang: {
        $gte: from,
        $lte: to,
      },
    });

    // 🔥 TÍNH LẠI CẢ TOTAL + PAID
    const { totalAmount, paidAmount, remainAmount } =
      calcPeriodMoneyFromTrips(trips);

    period.fromDate = from;
    period.toDate = to;
    period.totalAmount = totalAmount;
    period.paidAmount = paidAmount;
    period.remainAmount = remainAmount;
    period.status = calcStatus(totalAmount, paidAmount, remainAmount);
    period.note = note ?? period.note;

    await period.save();

    res.json({
      message: "Đã cập nhật kỳ công nợ",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không sửa được kỳ công nợ" });
  }
};


// =====================================================
// 📌 THANH TOÁN KỲ CÔNG NỢ (KH CHUNG)
// =====================================================
exports.addPaymentReceipt = async (req, res) => {
  try {
    const {debtCode, customerCode, amount, method, note, createdBy } = req.body;

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
      message: "Đã ghi nhận phiếu thu (KH chung) và tự động trừ vào kỳ công nợ cũ nhất",
      receipt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể tạo phiếu thu" });
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
            const period = await CustomerDebtPeriod.findById(alloc.debtPeriodId).lean();
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
      maKH: period.customerCode,
      ngayGiaoHang: {
        $gte: period.fromDate,
        $lte: period.toDate,
      },
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
// 🔄 HUỶ PHIẾU THU
// =====================================================
exports.rollbackPaymentReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    // 1. Lấy phiếu thu
    const receipt = await PaymentReceipt.findById(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu thu" });
    }

    // 2. Rollback từng kỳ mà phiếu này phân bổ
    for (const alloc of receipt.allocations) {
      const period = await CustomerDebtPeriod.findById(alloc.debtPeriodId);
      if (!period) continue; // nếu kỳ đã bị xóa thì bỏ qua

      // rollback số tiền
      period.paidAmount = Math.max((period.paidAmount || 0) - alloc.amount, 0);
      period.remainAmount = (period.remainAmount || 0) + alloc.amount;

      // cập nhật trạng thái kỳ
      if (period.remainAmount === 0) {
        period.status = "HOAN_TAT";
      } else if (period.paidAmount === 0) {
        period.status = "CHUA_TRA";
      } else {
        period.status = "TRA_MOT_PHAN";
      }

      await period.save();
    }

    // 3. Xóa phiếu thu
    await receipt.deleteOne();

    return res.json({ message: "Đã huỷ phiếu thu và rollback công nợ" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không thể huỷ phiếu thu" });
  }
};
// =====================================================
// 📌 TÍNH CÔNG NỢ KHÁCH 26 THEO TỪNG CHUYẾN (CÓ RULE MÀU GIỐNG TẤT CẢ)
// =====================================================
exports.getDebtForCustomer26 = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // end tăng thêm 1 ngày để <= endDate
    end.setDate(end.getDate() + 1);

    const trips = await ScheduleAdmin.find({
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    });

    const list = await Promise.all(
      trips.map(async (t) => {
        const tongTien = calcTripCost(t);
        const daThanhToan = parseFloat(t.daThanhToan) || 0;
        const conLai = tongTien - daThanhToan;

        const latestPayment = await TripPayment.findOne({
          maChuyenCode: t.maChuyen,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          tripId: t._id,
          ngayGiaoHang: t.ngayGiaoHang,
          thongTinChuyen: t.toObject(),
          tongTien,
          daThanhToan,
          conLai,
          ngayCK: latestPayment?.createdAt || null,
          taiKhoanCK: latestPayment?.method || "",
          noiDungCK: latestPayment?.note || "",
        };
      })
    );

    const tongCuoc = list.reduce((s, r) => s + r.tongTien, 0);
    const tongDaTT = list.reduce((s, r) => s + r.daThanhToan, 0);
    const tongConLai = tongCuoc - tongDaTT;

    let trangThai = "green";
    if (tongConLai > 0) {
      const tiLe = tongCuoc === 0 ? 0 : tongConLai / tongCuoc;
      if (tiLe <= 0.2) trangThai = "yellow";
      else trangThai = "red";
    }

    res.json({
      maKH: "26",
      soChuyen: trips.length,
      tongCuoc,
      daThanhToan: tongDaTT,
      tongConLai,
      trangThai,
      chiTietChuyen: list,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi KH 26" });
  }
};

// =====================================================
// 📌 LỊCH SỬ THANH TOÁN THEO CHUYẾN
// =====================================================
exports.getTripPaymentHistory = async (req, res) => {
  try {
    const { maChuyenCode } = req.params; // lấy maChuyenCode từ params
    if (!maChuyenCode) {
      return res.status(400).json({ error: "Thiếu maChuyenCode" });
    }

    const data = await TripPayment.find({ maChuyenCode }).sort({
      createdAt: -1,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không lấy được lịch sử thanh toán chuyến" });
  }
};

// =====================================================
// 📌 THÊM THANH TOÁN THEO CHUYẾN (CẬP NHẬT SCHEDULEADMIN)
// =====================================================
exports.addTripPayment = async (req, res) => {
  try {
    const { maChuyenCode, amount, method, note, createdBy } = req.body;

    if (!maChuyenCode || !amount) {
      return res.status(400).json({ error: "Thiếu maChuyenCode hoặc amount" });
    }

    // 1️⃣ Thêm record thanh toán mới
    const payment = new TripPayment({
      maChuyenCode,
      amount,
      method: method || "CaNhan",
      note: note || "",
      createdBy: createdBy || "",
    });

    await payment.save();

    // 2️⃣ Cập nhật daThanhToan và conLai trong ScheduleAdmin
    const trip = await ScheduleAdmin.findOne({ maChuyen: maChuyenCode });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // Tăng daThanhToan
    trip.daThanhToan = (parseFloat(trip.daThanhToan) || 0) + parseFloat(amount);

    // Tính lại tổng cước
    const tongTien = calcTripCost(trip);

    // Tính conLai
    trip.conLai = tongTien - trip.daThanhToan;

    await trip.save();

    res.json({
      message: "Đã thêm thanh toán và cập nhật chuyến",
      payment,
      daThanhToan: trip.daThanhToan,
      conLai: trip.conLai,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể thêm thanh toán cho chuyến" });
  }
};

// =====================================================
// 📌 XOÁ THANH TOÁN THEO CHUYẾN (CẬP NHẬT LẠI ScheduleAdmin)
// =====================================================
exports.deleteTripPayment = async (req, res) => {
  try {
    const { paymentId } = req.params; // ID của TripPayment cần xoá

    if (!paymentId) {
      return res.status(400).json({ error: "Thiếu paymentId" });
    }

    // 1️⃣ Lấy record thanh toán để biết chuyến và số tiền
    const payment = await TripPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Không tìm thấy thanh toán" });
    }

    const { maChuyenCode, amount } = payment;

    // 2️⃣ Xoá record thanh toán
    await payment.deleteOne();

    // 3️⃣ Cập nhật lại ScheduleAdmin
    const trip = await ScheduleAdmin.findOne({ maChuyen: maChuyenCode });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // Giảm daThanhToan
    trip.daThanhToan = (parseFloat(trip.daThanhToan) || 0) - parseFloat(amount);

    // Tính lại tổng cước
    const tongTien = calcTripCost(trip);

    // Tính lại conLai
    trip.conLai = tongTien - trip.daThanhToan;

    await trip.save();

    res.json({
      message: "Đã xoá thanh toán và cập nhật chuyến",
      maChuyen: maChuyenCode,
      daThanhToan: trip.daThanhToan,
      conLai: trip.conLai,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể xoá thanh toán" });
  }
};
