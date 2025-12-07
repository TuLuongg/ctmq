const PaymentHistory = require("../models/PaymentHistory");
const TripPayment = require("../models/TripPayment");
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

// =====================================================
// 📌 TÍNH CÔNG NỢ KHÁCH HÀNG
// =====================================================
exports.getCustomerDebt = async (req, res) => {
  try {
    const { month, year } = req.query;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Lấy tất cả chuyến trong tháng
    let schedules = await ScheduleAdmin.find({
      ngayGiaoHang: { $gte: start, $lt: end },
    });

    // Gom theo mã KH
    const grouped = {};
    schedules.forEach((sc) => {
      if (!grouped[sc.maKH]) grouped[sc.maKH] = [];
      grouped[sc.maKH].push(sc);
    });

    const result = [];

    for (const maKH of Object.keys(grouped)) {
      // ❌ Bỏ KH 26 → không đưa vào danh sách
      if (maKH === "26") continue;
      if (!maKH || maKH.trim() === "") continue;

      let trips = grouped[maKH];

// Tính tổng cước
const tongCuoc = trips.reduce((sum, trip) => sum + calcTripCost(trip), 0);

// Tổng thanh toán theo chuyến trong ScheduleAdmin
const daThanhToanTheoChuyen = trips.reduce((sum, trip) => {
  const val = parseFloat(trip.daThanhToan) || 0;
  return sum + val;
}, 0);

// Tổng thanh toán theo bảng PaymentHistory
const pays = await PaymentHistory.aggregate([
  {
    $match: {
      customerCode: maKH,
      createdAt: { $gte: start, $lt: end },
    },
  },
  { $group: { _id: null, total: { $sum: "$amount" } } },
]);

const daThanhToanLichSu = pays.length ? pays[0].total : 0;

// ⭐ Tổng đã thanh toán cuối cùng
const daThanhToan = daThanhToanLichSu + daThanhToanTheoChuyen;

const conLai = tongCuoc - daThanhToan;


      let trangThai = "green";
if (conLai > 0) {
  const tiLe = tongCuoc === 0 ? 0 : conLai / tongCuoc;
  if (tiLe <= 0.2) trangThai = "yellow";  // còn <= 20% tổng cước → vàng
  else trangThai = "red";                  // còn > 20% → đỏ
}


      result.push({
        maKH,
        tongCuoc,
        daThanhToan,
        conLai,
        trangThai,
        soChuyen: trips.length,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy công nợ" });
  }
};

// =====================================================
// 📌 LỊCH SỬ THANH TOÁN
// =====================================================
exports.getPaymentHistory = async (req, res) => {
  try {
    const { customerCode } = req.params;
    const data = await PaymentHistory.find({ customerCode }).sort({
      createdAt: -1,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được lịch sử thanh toán" });
  }
};

// =====================================================
// 📌 THÊM THANH TOÁN
// =====================================================
exports.addPayment = async (req, res) => {
  try {
    const { customerCode, amount, method, note } = req.body;
    console.log("🔥 POST /add BODY:", req.body);

    const payment = new PaymentHistory({
      customerCode,
      amount,
      method,
      note,
    });

    await payment.save();

    res.json({ message: "Đã thêm thanh toán", payment });
  } catch (err) {
    res.status(500).json({ error: "Không thể thêm thanh toán" });
  }
};

// =====================================================
// 📌 LẤY CHUYẾN THEO KHÁCH HÀNG
// =====================================================
exports.getCustomerTrips = async (req, res) => {
  try {
    const { customerCode, month, year } = req.query;

    let query = { maKH: customerCode };

    // KH 26 → lấy toàn bộ
    if (customerCode !== "26") {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      query.ngayGiaoHang = { $gte: start, $lt: end };
    }

    const trips = await ScheduleAdmin.find(query);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được danh sách chuyến" });
  }
};


// =====================================================
// 📌 TÍNH CÔNG NỢ KHÁCH 26 THEO TỪNG CHUYẾN (CÓ RULE MÀU GIỐNG TẤT CẢ)
// =====================================================
// Lấy công nợ KH 26 theo từng chuyến và điền thông tin CK mới nhất
exports.getDebtForCustomer26 = async (req, res) => {
  try {
    let { month, year } = req.query;
    month = parseInt(month);
    year = parseInt(year);

    if (!month || !year) return res.status(400).json({ error: "Thiếu month hoặc year" });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const trips = await ScheduleAdmin.find({
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    });

    // Map từng chuyến và tính tổng + lấy thanh toán mới nhất
    const list = await Promise.all(trips.map(async (t) => {
      const tongTien = calcTripCost(t);
      const daThanhToan = parseFloat(t.daThanhToan) || 0;
      const conLai = tongTien - daThanhToan;

      // Lấy thanh toán mới nhất cho chuyến
      const latestPayment = await TripPayment.findOne({ maChuyenCode: t.maChuyen })
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
    }));

    // Áp rule màu giống tất cả KH
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

