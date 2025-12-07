const Driver = require("../models/Driver");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ==============================
// LẤY DANH SÁCH
// ==============================
const listDrivers = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [
        { name: re },
        { nameZalo: re },
        { phone: re },
        { company: re },
        { cccd: re },
        { hometown: re },
        { resHometown: re },
        { licenseClass: re },
        { bsx: re },
      ];
    }
    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách lái xe" });
  }
};

// ==============================
// LẤY 1 LÁI XE
// ==============================
const getDriver = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: "Không tìm thấy lái xe" });
    res.json(driver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ==============================
// THÊM MỚI
// ==============================
const createDriver = async (req, res) => {
  try {
    const body = req.body || {};
    const driverData = {
      name: body.name,
      nameZalo: body.nameZalo || "",
      birthYear: body.birthYear ? new Date(body.birthYear) : null,
      company: body.company || "",
      bsx: body.bsx || "",
      phone: body.phone || "",
      hometown: body.hometown || "",
      resHometown: body.resHometown || "",
      address: body.address || "",
      cccd: body.cccd || "",
      cccdIssuedAt: body.cccdIssuedAt ? new Date(body.cccdIssuedAt) : null,
      cccdExpiryAt: body.cccdExpiryAt ? new Date(body.cccdExpiryAt) : null,
      licenseImageCCCD: body.licenseImageCCCD || "",
      numberClass: body.numberClass || "",
      licenseClass: body.licenseClass || "",
      licenseIssuedAt: body.licenseIssuedAt ? new Date(body.licenseIssuedAt) : null,
      licenseExpiryAt: body.licenseExpiryAt ? new Date(body.licenseExpiryAt) : null,
      licenseImage: body.licenseImage || "",
      numberHDLD: body.numberHDLD || "",
      dayStartWork: body.dayStartWork ? new Date(body.dayStartWork) : null,
      dayEndWork: body.dayEndWork ? new Date(body.dayEndWork) : null,
      createdBy: req.user?.username || body.createdBy || "",
    };

    const saved = await new Driver(driverData).save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo lái xe:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// CẬP NHẬT
// ==============================
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: "Không tìm thấy lái xe" });

    const body = req.body || {};

    // Cập nhật các trường text
    Object.assign(driver, {
      name: body.name || driver.name,
      nameZalo: body.nameZalo || driver.nameZalo,
      birthYear: body.birthYear ? new Date(body.birthYear) : driver.birthYear,
      company: body.company || driver.company,
      bsx: body.bsx || driver.bsx,
      phone: body.phone || driver.phone,
      hometown: body.hometown || driver.hometown,
      resHometown: body.resHometown || driver.resHometown,
      address: body.address || driver.address,
      cccd: body.cccd || driver.cccd,
      cccdIssuedAt: body.cccdIssuedAt ? new Date(body.cccdIssuedAt) : driver.cccdIssuedAt,
      cccdExpiryAt: body.cccdExpiryAt ? new Date(body.cccdExpiryAt) : driver.cccdExpiryAt,
      numberClass: body.numberClass || driver.numberClass,
      licenseClass: body.licenseClass || driver.licenseClass,
      licenseIssuedAt: body.licenseIssuedAt ? new Date(body.licenseIssuedAt) : driver.licenseIssuedAt,
      licenseExpiryAt: body.licenseExpiryAt ? new Date(body.licenseExpiryAt) : driver.licenseExpiryAt,
      numberHDLD: body.numberHDLD || driver.numberHDLD,
      dayStartWork: body.dayStartWork ? new Date(body.dayStartWork) : driver.dayStartWork,
      dayEndWork: body.dayEndWork ? new Date(body.dayEndWork) : driver.dayEndWork,
    });

    // Xử lý file
    if (req.body.licenseImage) {
      if (driver.licenseImage) {
        const oldPath = path.join(process.cwd(), driver.licenseImage.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      driver.licenseImage = req.body.licenseImage;
    }
    if (req.body.licenseImageCCCD) {
      if (driver.licenseImageCCCD) {
        const oldPath = path.join(process.cwd(), driver.licenseImageCCCD.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      driver.licenseImageCCCD = req.body.licenseImageCCCD;
    }

    await driver.save();
    res.json(driver);

  } catch (err) {
    console.error("Lỗi khi cập nhật lái xe:", err);
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// XOÁ
// ==============================
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: "Không tìm thấy lái xe" });

    if (driver.licenseImage) {
      const oldPath = path.join(process.cwd(), driver.licenseImage.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) {}
      }
    }

    await driver.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa lái xe:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// IMPORT TỪ EXCEL
// ==============================
const importDriversFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chưa upload file Excel" });

    const mode = req.query.mode || "append"; 
    // append = thêm hết, KHÔNG kiểm tra trùng
    // overwrite = ghi đè nếu trùng cccd

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    let updated = 0;
    const errors = [];

    const parseExcelDate = (str) => {
  if (!str) return null;
  // Nếu Excel trả về số thì giữ nguyên (Excel đôi khi trả kiểu số cho date)
  if (typeof str === "number") {
    // XLSX.SSF.parse_date_code có thể dùng nếu cần, nhưng hầu hết XLSX.utils.sheet_to_json sẽ trả về string
    return new Date(Math.round((str - 25569)*86400*1000));
  }
  if (typeof str === "string") {
    const parts = str.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }
  return null;
};


    for (const [idx, row] of rows.entries()) {
      try {
        if (!row["HỌ TÊN LÁI XE"] && !row["Tên"]) continue;
        
        const cccd = row["SỐ CCCD"] || "";

        const driverData = {
          name: row["HỌ TÊN LÁI XE"] || row["Tên"] || "",
          nameZalo: row["TÊN ZALO"] || "",
          birthYear: parseExcelDate(row["Ngày sinh"]),
          company: row["ĐƠN VỊ"] || row["Đơn vị"] || "",
          bsx: row["BSX"] || row["bsx"] || "",
          phone: row["SĐT"] || "",
          hometown: row["NGUYÊN QUÁN"] || "",
          resHometown: row["NƠI ĐĂNG KÝ HKTT"] || "",
          address: row["NƠI Ở HIỆN TẠI"] || "",
          cccd,
          cccdIssuedAt: parseExcelDate(row["Ngày cấp CCCD"]),
          cccdExpiryAt: parseExcelDate(row["Ngày hết hạn CCCD"]),
          numberClass: row["Số GPLX"] || "",
          licenseClass: row["Hạng bằng lái xe"] || row["HẠNG BL"] || "",
          licenseIssuedAt: parseExcelDate(row["Ngày cấp GPLX"] || row["Ngày cấp BL"]),
          licenseExpiryAt: parseExcelDate(row["Ngày hết hạn GPLX"] || row["Ngày hết hạn BL"]),
          numberHDLD: row["Số HĐLĐ"] || "",
          dayStartWork: parseExcelDate(row["Ngày vào làm"]),
          dayEndWork: parseExcelDate(row["Ngày nghỉ"]),
        };

        // ============================
        // 1) APPEND: thêm hết, không check trùng
        // ============================
        if (mode === "append") {
          await Driver.create(driverData);
          imported++;
          continue;
        }

        // ============================
        // 2) OVERWRITE: trùng → update, không trùng → tạo mới
        // ============================
        if (mode === "overwrite") {
          const existing = await Driver.findOne({ cccd });

          if (existing) {
            await Driver.updateOne({ cccd }, driverData);
            updated++;
          } else {
            await Driver.create(driverData);
            imported++;
          }
          continue;
        }

      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({
      message: "Import hoàn tất",
      mode,
      imported,
      updated,
      errors
    });

  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};



// ==============================
// Lấy danh sách chỉ gồm _id và name
// ==============================
const listDriverNames = async (req, res) => {
  try {
    const drivers = await Driver.find({}, { name: 1, bsx: 1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: "Không thể lấy danh sách lái xe" });
  }
};

// ⚠️ Toggle cảnh báo
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Driver.findById(id);
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
// XOÁ TẤT CẢ LÁI XE
// ==============================
const deleteAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({});
    
    for (const driver of drivers) {
      if (driver.licenseImage) {
        const imgPath = path.join(process.cwd(), driver.licenseImage.replace(/^\//, ""));
        if (fs.existsSync(imgPath)) {
          try { fs.unlinkSync(imgPath); } catch (e) {}
        }
      }
      if (driver.licenseImageCCCD) {
        const imgCCCDPath = path.join(process.cwd(), driver.licenseImageCCCD.replace(/^\//, ""));
        if (fs.existsSync(imgCCCDPath)) {
          try { fs.unlinkSync(imgCCCDPath); } catch (e) {}
        }
      }
    }

    // Xóa tất cả driver
    await Driver.deleteMany({});
    res.json({ message: "Đã xóa tất cả lái xe thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa tất cả lái xe:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  importDriversFromExcel,
  listDriverNames,
  toggleWarning,
  deleteAllDrivers
};
