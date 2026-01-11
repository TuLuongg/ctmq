const TripPayment = require("../models/TripPayment");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const SchCustomerOdd = require("../models/SchCustomerOdd");

// ===============================
// 🔧 CALC COST – KH LẺ
// ===============================
const fieldMap = {
  luatChiPhiKhac: { base: "luatChiPhiKhac" },
  cuocPhi: { base: "cuocPhi" },
  bocXep: { base: "bocXep" },
  ve: { base: "ve" },
  hangVe: { base: "hangVe" },
  luuCa: { base: "luuCa" },
  themDiem: { base: "themDiem" },
};

const num = (v) => Number(v) || 0;

const calcOddTotalFromBaseTrip = (t) =>
  num(t.cuocPhi) +
  num(t.bocXep) +
  num(t.ve) +
  num(t.hangVe) +
  num(t.luuCa) +
  num(t.luatChiPhiKhac) +
  num(t.themDiem);

const pickBaseOnly = (obj, field) => Number(obj[fieldMap[field]?.base]) || 0;

const calcTripCostOddCustomer = (trip) =>
  pickBaseOnly(trip, "cuocPhi") +
  pickBaseOnly(trip, "bocXep") +
  pickBaseOnly(trip, "ve") +
  pickBaseOnly(trip, "hangVe") +
  pickBaseOnly(trip, "luuCa") +
  pickBaseOnly(trip, "luatChiPhiKhac") +
  pickBaseOnly(trip, "themDiem");

const genDebtCodeFromDate = (date) => {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `CN.KL.${mm}.${yy}`;
};

// =====================================================
// 📌 TẠO CÔNG NỢ KH 26
// =====================================================
exports.createOddDebtByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate)
      return res.status(400).json({ error: "Thiếu ngày" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const baseTrips = await ScheduleAdmin.find({
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    const docs = [];

    for (const t of baseTrips) {
      // 🚫 chuyến gốc đã gắn công nợ → không tạo nữa
      if (t.debtCode) continue;

      const existed = await SchCustomerOdd.findOne({ maChuyen: t.maChuyen });
      if (existed) continue;

      const tongTien = calcOddTotalFromBaseTrip(t);
      const daThanhToan = num(t.daThanhToan);
      const debtCode = genDebtCodeFromDate(t.ngayGiaoHang);

      docs.push({
        maChuyen: t.maChuyen,
        maKH: t.maKH,

        // ===== COPY =====
        tenLaiXe: t.tenLaiXe,
        bienSoXe: t.bienSoXe,
        dienGiai: t.dienGiai,
        ngayBocHang: t.ngayBocHang,
        ngayGiaoHang: t.ngayGiaoHang,
        diemXepHang: t.diemXepHang,
        diemDoHang: t.diemDoHang,
        soDiem: t.soDiem,
        trongLuong: t.trongLuong,
        ghiChu: t.ghiChu,

        cuocPhi: t.cuocPhi,
        bocXep: t.bocXep,
        ve: t.ve,
        hangVe: t.hangVe,
        luuCa: t.luuCa,
        luatChiPhiKhac: t.luatChiPhiKhac,
        themDiem: t.themDiem,

        daThanhToan,

        // ===== CÔNG NỢ =====
        debtCode,
        tongTien,
        conLai: tongTien - daThanhToan,
        status:
          tongTien - daThanhToan <= 0
            ? "HOAN_TAT"
            : daThanhToan > 0
            ? "TRA_MOT_PHAN"
            : "CHUA_TRA",
      });

      // ✅ GẮN MÃ CÔNG NỢ CHO CHUYẾN GỐC
      await ScheduleAdmin.updateOne({ _id: t._id }, { $set: { debtCode } });
    }

    if (docs.length) await SchCustomerOdd.insertMany(docs);

    res.json({
      message: "Đã tạo công nợ KH lẻ",
      soChuyenTaoMoi: docs.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi tạo công nợ KH lẻ" });
  }
};

// =====================================================
// 📌 CẬP NHẬT CÁC CHUYẾN TRONG CÔNG NỢ
// =====================================================
exports.syncOddDebtByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate)
      return res.status(400).json({ error: "Thiếu ngày" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const baseTrips = await ScheduleAdmin.find({
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    const ops = [];

    for (const t of baseTrips) {
      // 🚫 chuyến gốc đã chốt công nợ → bỏ qua
      if (t.debtCode) continue;

      const oddTrip = await SchCustomerOdd.findOne({ maChuyen: t.maChuyen });
      if (!oddTrip) continue;

      const tongTien = calcOddTotalFromBaseTrip(t);
      const daThanhToan = num(t.daThanhToan);
      const conLai = tongTien - daThanhToan;

      ops.push({
        updateOne: {
          filter: { maChuyen: t.maChuyen },
          update: {
            $set: {
              cuocPhi: t.cuocPhi,
              bocXep: t.bocXep,
              ve: t.ve,
              hangVe: t.hangVe,
              luuCa: t.luuCa,
              luatChiPhiKhac: t.luatChiPhiKhac,
              themDiem: t.themDiem,
              daThanhToan,
              tongTien,
              conLai,
              status:
                conLai <= 0
                  ? "HOAN_TAT"
                  : daThanhToan > 0
                  ? "TRA_MOT_PHAN"
                  : "CHUA_TRA",
            },
          },
        },
      });
    }

    if (ops.length) await SchCustomerOdd.bulkWrite(ops);

    res.json({
      message: "Đã cập nhật công nợ KH lẻ",
      soChuyenCapNhat: ops.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi cập nhật công nợ KH lẻ" });
  }
};

// =====================================================
// 📌 LẤY CÔNG NỢ KHÁCH LẺ (KH = 26)
// + FILTER MẢNG FIELD
// + SORT ABC & SORT NGÀY GIAO
// =====================================================
exports.getOddCustomerDebt = async (req, res) => {
  try {
    let {
      startDate,
      endDate,
      page = 1,
      limit = 50,

      // ===== FILTER =====
      nameCustomer,
      tenLaiXe,
      bienSoXe,
      dienGiai,
      cuocPhi,

      // ===== SORT =====
      sortDate, // asc | desc
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu startDate hoặc endDate" });
    }

    page = Number(page);
    limit = Number(limit);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const condition = {
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    };

    // ===============================
    // 🔍 FILTER THEO MẢNG FIELD
    // ===============================

    if (nameCustomer) {
      const arr = Array.isArray(nameCustomer) ? nameCustomer : [nameCustomer];
      condition.nameCustomer = { $in: arr };
    }

    if (tenLaiXe) {
      const arr = Array.isArray(tenLaiXe) ? tenLaiXe : [tenLaiXe];
      condition.tenLaiXe = { $in: arr };
    }

    if (bienSoXe) {
      const arr = Array.isArray(bienSoXe) ? bienSoXe : [bienSoXe];
      condition.bienSoXe = { $in: arr };
    }

    if (dienGiai) {
      const arr = Array.isArray(dienGiai) ? dienGiai : [dienGiai];
      condition.dienGiai = { $in: arr };
    }

    if (cuocPhi) {
      const arr = Array.isArray(cuocPhi) ? cuocPhi : [cuocPhi];
      condition.cuocPhi = { $in: arr };
    }

    // ===============================
    // 🔃 SORT
    // ===============================

    // ===============================
    // 🔃 SORT (DYNAMIC – FE TRUYỀN)
    // ===============================
    let sortObj = {};

    // FE truyền sort dạng JSON
    if (req.query.sort) {
      try {
        let sort = req.query.sort;

        if (typeof sort === "string") {
          sort = JSON.parse(sort);
        }

        if (Array.isArray(sort)) {
          sort.forEach((s) => {
            if (s?.field) {
              sortObj[s.field] = s.order === "asc" ? 1 : -1;
            }
          });
        }
      } catch (e) {
        console.warn("⚠️ Sort parse error");
      }
    }

    // fallback mặc định (nếu FE không truyền)
    if (Object.keys(sortObj).length === 0) {
      sortObj = {
        ngayGiaoHang: req.query.sortDate === "asc" ? 1 : -1,
        nameCustomer: 1,
        dienGiai: 1,
      };
    }

    const skip = (page - 1) * limit;

    const [total, trips] = await Promise.all([
      SchCustomerOdd.countDocuments(condition),
      SchCustomerOdd.find(condition)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const list = await Promise.all(
      trips.map(async (t) => {
        const latestPayment = await TripPayment.findOne({
          maChuyenCode: t.maChuyen,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...t,
          ngayCK: latestPayment?.createdAt || null,
          taiKhoanCK: latestPayment?.method || "",
          noiDungCK: latestPayment?.note || "",
        };
      })
    );

    res.json({
      maKH: "26",
      soChuyen: total,
      page,
      limit,
      chiTietChuyen: list,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy công nợ KH lẻ" });
  }
};

// ==============================
// Lấy tất cả filter options theo khoảng ngày giao
// ==============================
exports.getAllOddDebtFilterOptions = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const baseFilter = {
      isDeleted: { $ne: true },
    };

    // ===== THÊM LỌC NGÀY GIAO =====
    if (fromDate || toDate) {
      baseFilter.ngayGiaoHang = {};
      if (fromDate)
        baseFilter.ngayGiaoHang.$gte = new Date(fromDate + "T00:00:00");
      if (toDate) baseFilter.ngayGiaoHang.$lte = new Date(toDate + "T23:59:59");
    }

    const [nameCustomer, tenLaiXe, bienSoXe, dienGiai, cuocPhi] =
      await Promise.all([
        SchCustomerOdd.distinct("nameCustomer", baseFilter),
        SchCustomerOdd.distinct("tenLaiXe", baseFilter),
        SchCustomerOdd.distinct("bienSoXe", baseFilter),
        SchCustomerOdd.distinct("dienGiai", baseFilter),
        SchCustomerOdd.distinct("cuocPhi", baseFilter),
      ]);

    res.json({
      nameCustomer: nameCustomer.filter(Boolean).sort(),
      tenLaiXe: tenLaiXe.filter(Boolean).sort(),
      bienSoXe: bienSoXe.filter(Boolean).sort(),
      dienGiai: dienGiai.filter(Boolean).sort(),
      cuocPhi: cuocPhi.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("❌ Filter options error:", err);
    res.status(500).json({ error: err.message });
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
    const { maChuyenCode, createdDay, amount, method, note, createdBy } =
      req.body;

    if (!maChuyenCode || !amount) {
      return res.status(400).json({ error: "Thiếu maChuyenCode hoặc amount" });
    }

    const createdDayDate = createdDay
      ? new Date(createdDay + "T00:00:00.000Z")
      : new Date();

    // 1️⃣ Thêm payment
    const payment = await TripPayment.create({
      maChuyenCode,
      amount: Number(amount),
      method: method || "CASH",
      note: note || "",
      createdBy: createdBy || "",
      createdDay: createdDayDate,
    });

    // 2️⃣ Cập nhật SCH CUSTOMER ODD
    const oddTrip = await SchCustomerOdd.findOne({ maChuyen: maChuyenCode });
    if (!oddTrip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    oddTrip.daThanhToan += Number(amount);
    oddTrip.conLai = oddTrip.tongTien - oddTrip.daThanhToan;
    oddTrip.status =
      oddTrip.conLai <= 0
        ? "HOAN_TAT"
        : oddTrip.daThanhToan > 0
        ? "TRA_MOT_PHAN"
        : "CHUA_TRA";

    await oddTrip.save();

    res.json({
      message: "Đã thêm thanh toán",
      payment,
      daThanhToan: oddTrip.daThanhToan,
      conLai: oddTrip.conLai,
      status: oddTrip.status,
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
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ error: "Thiếu paymentId" });
    }

    const payment = await TripPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Không tìm thấy thanh toán" });
    }

    const { maChuyenCode, amount } = payment;

    await payment.deleteOne();

    const oddTrip = await SchCustomerOdd.findOne({ maChuyen: maChuyenCode });
    if (!oddTrip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    oddTrip.daThanhToan -= Number(amount);
    if (oddTrip.daThanhToan < 0) oddTrip.daThanhToan = 0;

    oddTrip.conLai = oddTrip.tongTien - oddTrip.daThanhToan;
    oddTrip.status =
      oddTrip.conLai <= 0
        ? "HOAN_TAT"
        : oddTrip.daThanhToan > 0
        ? "TRA_MOT_PHAN"
        : "CHUA_TRA";

    await oddTrip.save();

    res.json({
      message: "Đã xoá thanh toán",
      maChuyen: maChuyenCode,
      daThanhToan: oddTrip.daThanhToan,
      conLai: oddTrip.conLai,
      status: oddTrip.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể xoá thanh toán" });
  }
};

// =====================================================
// ✏️ CẬP NHẬT nameCustomer THEO DANH SÁCH CHUYẾN
// =====================================================
exports.updateTripNameCustomer = async (req, res) => {
  try {
    const { maChuyenList, nameCustomer } = req.body;

    if (!Array.isArray(maChuyenList) || maChuyenList.length === 0) {
      return res.status(400).json({ error: "maChuyenList không hợp lệ" });
    }

    if (nameCustomer === undefined) {
      return res.status(400).json({ error: "Thiếu nameCustomer" });
    }

    const result = await SchCustomerOdd.updateMany(
      { maChuyen: { $in: maChuyenList } },
      { $set: { nameCustomer } }
    );

    res.json({
      message: "Đã cập nhật nameCustomer cho các chuyến",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể cập nhật nameCustomer" });
  }
};

// =====================================================
// ✏️ CẬP NHẬT noteOdd THEO DANH SÁCH CHUYẾN
// =====================================================
exports.updateTripNoteOdd = async (req, res) => {
  try {
    const { maChuyenList, noteOdd } = req.body;

    if (!Array.isArray(maChuyenList) || maChuyenList.length === 0) {
      return res.status(400).json({ error: "maChuyenList không hợp lệ" });
    }

    // noteOdd cho phép rỗng => chỉ check undefined
    if (noteOdd === undefined) {
      return res.status(400).json({ error: "Thiếu noteOdd" });
    }

    const result = await SchCustomerOdd.updateMany(
      { maChuyen: { $in: maChuyenList } },
      { $set: { noteOdd } }
    );

    res.json({
      message: "Đã cập nhật noteOdd cho các chuyến",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể cập nhật noteOdd" });
  }
};

const parseMoneyStr = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

// =====================================================
// ✏️ SỬA CÁC TRƯỜNG TIỀN – GIỮ STRING (KH LẺ)
// =====================================================
exports.updateOddTripMoney = async (req, res) => {
  try {
    const {
      maChuyen,
      cuocPhi,
      bocXep,
      ve,
      hangVe,
      luuCa,
      luatChiPhiKhac,
      themDiem,
      daThanhToan,
    } = req.body;

    if (!maChuyen) {
      return res.status(400).json({ error: "Thiếu maChuyen" });
    }

    const trip = await SchCustomerOdd.findOne({ maChuyen });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // ✅ GHI STRING NGUYÊN VẸN (CHO PHÉP ÂM)
    if (cuocPhi !== undefined) trip.cuocPhi = cuocPhi;
    if (bocXep !== undefined) trip.bocXep = bocXep;
    if (ve !== undefined) trip.ve = ve;
    if (hangVe !== undefined) trip.hangVe = hangVe;
    if (luuCa !== undefined) trip.luuCa = luuCa;
    if (luatChiPhiKhac !== undefined) trip.luatChiPhiKhac = luatChiPhiKhac;
    if (themDiem !== undefined) trip.themDiem = themDiem;
    if (daThanhToan !== undefined) trip.daThanhToan = daThanhToan;

    // 🔢 PARSE TẠM ĐỂ TÍNH
    const tongTien =
      parseMoneyStr(trip.cuocPhi) +
      parseMoneyStr(trip.bocXep) +
      parseMoneyStr(trip.ve) +
      parseMoneyStr(trip.hangVe) +
      parseMoneyStr(trip.luuCa) +
      parseMoneyStr(trip.luatChiPhiKhac) +
      parseMoneyStr(trip.themDiem);

    const daTT = parseMoneyStr(trip.daThanhToan);
    const conLai = tongTien - daTT;

    trip.tongTien = tongTien;
    trip.conLai = conLai;

    // ✅ STATUS (LOGIC MÀY ĐANG DÙNG)
    if (tongTien === 0) {
      trip.status = "CHUA_TRA";
    } else if (conLai <= 0) {
      trip.status = "HOAN_TAT";
    } else if (daTT !== 0) {
      trip.status = "TRA_MOT_PHAN";
    } else {
      trip.status = "CHUA_TRA";
    }

    await trip.save();

    res.json({
      message: "Đã cập nhật tiền chuyến",
      maChuyen,
      tongTien,
      daThanhToan: trip.daThanhToan,
      conLai,
      status: trip.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi sửa tiền chuyến KH lẻ" });
  }
};

// =====================================================
// 🔁 CHÈN KH LẺ → CHUYẾN GỐC THEO NGÀY GIAO
// =====================================================
exports.syncOddToBaseByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    // lấy toàn bộ odd trong khoảng ngày
    const oddTrips = await SchCustomerOdd.find({
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    if (!oddTrips.length) {
      return res.json({
        message: "Không có chuyến KH lẻ trong khoảng ngày",
        soChuyenCapNhat: 0,
      });
    }

    const ops = [];

    for (const o of oddTrips) {
      ops.push({
        updateOne: {
          filter: { maChuyen: o.maChuyen },
          update: {
            $set: {
              // ===== MAP TIỀN BS =====
              cuocPhiBS: parseMoneyStr(o.cuocPhi),
              veBS: parseMoneyStr(o.ve),
              hangVeBS: parseMoneyStr(o.hangVe),
              luuCaBS: parseMoneyStr(o.luuCa),
              bocXepBS: parseMoneyStr(o.bocXep),
              cpKhacBS: parseMoneyStr(o.luatChiPhiKhac),

              // ===== GIỮ NGUYÊN =====
              themDiem: parseMoneyStr(o.themDiem),
              daThanhToan: parseMoneyStr(o.daThanhToan),
            },
          },
        },
      });
    }

    if (ops.length) {
      await ScheduleAdmin.bulkWrite(ops);
    }

    res.json({
      message: "Đã chèn chi phí KH lẻ vào chuyến gốc",
      soChuyenCapNhat: ops.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi sync KH lẻ → chuyến gốc" });
  }
};

// =====================================================
// HIGHLIGHT
// =====================================================
exports.updateHighlight = async (req, res) => {
  const { maChuyen, color } = req.body;

  await SchCustomerOdd.updateOne({ maChuyen }, { highlightColor: color || "" });

  res.json({ success: true });
};
