const Customer = require("../models/Customer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const ScheduleAdmin = require("../models/ScheduleAdmin");

// ==============================
// DANH SÁCH
// ==============================
const listCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [
        { name: re },
        { accountant: re },
        { code: re }
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách khách hàng" });
  }
};

// ==============================
// LẤY 1 KHÁCH HÀNG
// ==============================
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ==============================
// THÊM MỚI
// ==============================
const createCustomer = async (req, res) => {
  try {
    const body = req.body || {};
    const saved = await Customer.create({
      name: body.name,
      nameHoaDon: body.nameHoaDon,
      mstCCCD: body.mstCCCD,
      address: body.address,
      accountant: body.accountant,
      code: body.code,
      accUsername: body.accUsername,
      createdBy: req.user?.username || body.createdBy || ""
    });
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// CẬP NHẬT
// ==============================
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng" });

    const body = req.body || {};
    Object.assign(customer, {
      name: body.name || customer.name,
      nameHoaDon: body.nameHoaDon || customer.nameHoaDon,
      mstCCCD: body.mstCCCD || customer.mstCCCD,
      address: body.address || customer.address,
      accountant: body.accountant || customer.accountant,
      code: body.code || customer.code,
      accUsername: body.accUsername || customer.accUsername
    });

    await customer.save();
    res.json(customer);
  } catch (err) {
    console.error("Lỗi khi cập nhật khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// XOÁ
// ==============================
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng" });

    await customer.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// IMPORT TỪ EXCEL
// ==============================
const importCustomersFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chưa upload file Excel" });
    }

    const mode = req.query.mode || "add"; 
    // mode = add | overwrite

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [idx, row] of rows.entries()) {
      try {
        const code = row["MÃ KH"];

        if (code === undefined || code === null || code === "") {
          skipped++;
          continue;
        }

        const data = {
          name: row["DANH SÁCH KHÁCH HÀNG"] || "",
          nameHoaDon: row["TÊN KHÁCH HÀNG TRÊN HÓA ĐƠN"] || "",
          mstCCCD: row["MST/CCCD CHỦ HỘ"] || "",
          address: row["ĐỊA CHỈ"] || "",
          accountant: row["TÊN NGƯỜI ĐẢM NHẬN/PHỤ TRÁCH"] || "",
          code: code,
          accUsername: row["User"] || "",
        };

        // CHECK TRÙNG THEO CODE
        const existing = await Customer.findOne({ code });

        if (!existing) {
          // thêm mới nếu chưa có
          await Customer.create(data);
          imported++;
        } else if (mode === "overwrite") {
          // ghi đè nếu mode=overwrite
          await Customer.updateOne({ code }, data);
          updated++;
        } else {
          // nếu mode=add thì bỏ qua khách trùng code
          skipped++;
        }

      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({
      message: "Import hoàn tất",
      imported,
      updated,
      skipped,
      errors,
    });

  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};


// ⚠️ Toggle cảnh báo
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Customer.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }

    // Đảo trạng thái cảnh báo
    schedule.warning = !schedule.warning;
    await schedule.save();

    res.json({
      success: true,
      message: schedule.warning ? "Đã bật cảnh báo" : "Đã tắt cảnh báo",
      warning: schedule.warning
    });

  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// ✅ XUẤT EXCEL THEO FORM MẪU
// ==============================
// Hàm convert string số → number an toàn
function cleanNumber(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[.,]/g, "");
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
}

function cloneRowStyle(sheet, sourceRowNumber, targetRowNumber) {
  const sourceRow = sheet.getRow(sourceRowNumber);
  const targetRow = sheet.getRow(targetRowNumber);

  sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);

    // ❌ KHÔNG copy value
    targetCell.value = null;

    if (cell.style) {
      targetCell.style = JSON.parse(JSON.stringify(cell.style));
    }
    if (cell.border) {
      targetCell.border = JSON.parse(JSON.stringify(cell.border));
    }
    if (cell.alignment) {
      targetCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
    }
    if (cell.numFmt) {
      targetCell.numFmt = cell.numFmt;
    }
  });

  targetRow.height = sourceRow.height;
}

const exportTripsByCustomer = async (req, res) => {
  try {
    const { maKH } = req.params;
    const { from, to } = req.query;

    if (!maKH || !from || !to) {
      return res.status(400).json({ message: "Thiếu maKH, from hoặc to" });
    }

    const customer = await Customer.findOne({ code: maKH });
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const trips = await ScheduleAdmin.find({
      maKH,
      ngayGiaoHang: { $gte: fromDate, $lte: toDate },
    }).sort({ ngayGiaoHang: 1 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/form_mau.xlsx")
    );

    const sheet = workbook.getWorksheet("BẢNG KÊ");

    // Header
    sheet.getCell("C6").value = customer.nameHoaDon || "";
    sheet.getCell("C7").value = customer.address || "";
    sheet.getCell("C8").value = customer.mstCCCD || "";

    // ==========================
    // FIX VỠ FORM
    // ==========================
    const startRow = 12;
    const templateRows = 7;
    const extraRows =
      trips.length > templateRows ? trips.length - templateRows : 0;

    if (extraRows > 0) {
      sheet.insertRows(
        startRow + templateRows,
        Array.from({ length: extraRows }, () => [])
      );

      for (let i = 0; i < extraRows; i++) {
        cloneRowStyle(
          sheet,
          startRow,
          startRow + templateRows + i
        );
      }
    }

    // ==========================
    // GHI DỮ LIỆU
    // ==========================
    trips.forEach((trip, index) => {
      const row = sheet.getRow(startRow + index);

      row.getCell("A").value = index + 1;
      row.getCell("I").value = ""; // 🔥 CLEAR CỘT I (QUAN TRỌNG)

      const cuocPhi = trip.cuocPhiBS || trip.cuocPhi;
      const bocXep = trip.bocXepBS || trip.bocXep;
      const ve = trip.veBS || trip.ve;
      const hangVe = trip.hangVeBS || trip.hangVe;
      const luuCa = trip.luuCaBS || trip.luuCa;
      const cpKhac = trip.cpKhacBS || trip.luatChiPhiKhac;

      row.getCell("B").value = trip.ngayGiaoHang
        ? new Date(trip.ngayGiaoHang)
        : "";
      row.getCell("C").value = trip.diemXepHang || "";
      row.getCell("D").value = trip.diemDoHang || "";
      row.getCell("E").value = trip.soDiem || "";
      row.getCell("F").value = trip.trongLuong || "";
      row.getCell("G").value = trip.bienSoXe || "";
      row.getCell("I").value = trip.themDiem || "";
      row.getCell("H").value = cuocPhi || "";
      row.getCell("J").value = bocXep || "";
      row.getCell("K").value = ve || "";
      row.getCell("L").value = hangVe || "";
      row.getCell("M").value = luuCa || "";
      row.getCell("N").value = cpKhac || "";
      row.getCell("Q").value = trip.maChuyen || "";

      row.getCell("O").value =
        cleanNumber(cuocPhi) +
        cleanNumber(bocXep) +
        cleanNumber(ve) +
        cleanNumber(hangVe) +
        cleanNumber(luuCa) +
        cleanNumber(cpKhac);

      row.commit();
    });

    // ==========================
    // TỔNG
    // ==========================
    const lastRow = startRow + trips.length;

    let sumO = 0;
    for (let i = 0; i < trips.length; i++) {
      sumO += Number(sheet.getCell(`O${startRow + i}`).value) || 0;
    }

    sheet.getCell(`G${lastRow}`).value = sumO;
    sheet.getCell(`G${lastRow + 1}`).value = Math.round(sumO * 0.08);
    sheet.getCell(`G${lastRow + 2}`).value = Math.round(sumO * 1.08);

    // 🔥 CHỈ DÒNG NÀY CÓ GIÁ TRỊ
    sheet.getCell(`I${lastRow + 5}`).value = customer.nameHoaDon || "";

    // Font
    sheet.eachRow(row =>
      row.eachCell(cell => {
        cell.font = { name: "Times New Roman", size: 12 };
      })
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=BANG_KE_${maKH}_${from}_den_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất bảng kê" });
  }
};



// ==============================
// XOÁ TẤT CẢ KHÁCH HÀNG
// ==============================
const deleteAllCustomers = async (req, res) => {
  try {
    // Nếu muốn kiểm soát quyền, có thể check ở đây: req.user?.permissions
    await Customer.deleteMany({});
    res.json({ message: "Đã xóa tất cả khách hàng" });
  } catch (err) {
    console.error("Lỗi khi xóa tất cả khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};



module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomersFromExcel,
  toggleWarning,
  exportTripsByCustomer,
  deleteAllCustomers
};
