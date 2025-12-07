const VehiclePlate = require("../models/VehiclePlate");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

/* ==============================
   LẤY DANH SÁCH
============================== */
const listVehicles = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};

    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [
        { plateNumber: re },
        { company: re },
        { vehicleType: re },
      ];
    }

    const vehicles = await VehiclePlate.find(filter)
      .sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (err) {
    console.error("Lỗi lấy danh sách xe:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách xe" });
  }
};

/* ==============================
   LẤY 1 XE
============================== */
const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const v = await VehiclePlate.findById(id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy xe" });

    res.json(v);
  } catch (err) {
    console.error("Lỗi lấy xe:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

/* ==============================
   TẠO MỚI
============================== */
const createVehicle = async (req, res) => {
  try {
    const body = req.body || {};

    const vehicleData = {
      plateNumber: body.plateNumber || "",
      company: body.company || "",
      vehicleType: body.vehicleType || "",
      length: body.length || "",
      width: body.width || "",
      height: body.height || "",
      norm: body.norm || "",
      registrationImage: body.registrationImage || "",
      inspectionImage: body.inspectionImage || "",

      // 🎯 4 TRƯỜNG NGÀY MỚI
      resDay: body.resDay || null,
      resExpDay: body.resExpDay || null,
      insDay: body.insDay || null,
      insExpDay: body.insExpDay || null,

      createdBy: req.user?.username || body.createdBy || "",
    };

    const saved = await VehiclePlate(vehicleData).save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   CẬP NHẬT
============================== */
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const vehicle = await VehiclePlate.findById(id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });

    const body = req.body || {};

    Object.assign(vehicle, {
      plateNumber: body.plateNumber ?? vehicle.plateNumber,
      company: body.company ?? vehicle.company,
      vehicleType: body.vehicleType ?? vehicle.vehicleType,
      length: body.length ?? vehicle.length,
      width: body.width ?? vehicle.width,
      height: body.height ?? vehicle.height,
      norm: body.norm ?? vehicle.norm,

      // 🎯 4 TRƯỜNG NGÀY MỚI
      resDay: body.resDay ?? vehicle.resDay,
      resExpDay: body.resExpDay ?? vehicle.resExpDay,
      insDay: body.insDay ?? vehicle.insDay,
      insExpDay: body.insExpDay ?? vehicle.insExpDay,
    });

    // ===========================
    // XỬ LÝ FILE
    // ===========================

    if (body.registrationImage) {
      if (vehicle.registrationImage) {
        const oldPath = path.join(
          process.cwd(),
          vehicle.registrationImage.replace(/^\//, "")
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      vehicle.registrationImage = body.registrationImage;
    }

    if (body.inspectionImage) {
      if (vehicle.inspectionImage) {
        const oldPath = path.join(
          process.cwd(),
          vehicle.inspectionImage.replace(/^\//, "")
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      vehicle.inspectionImage = body.inspectionImage;
    }

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    console.error("Lỗi khi cập nhật xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   XÓA
============================== */
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const vehicle = await VehiclePlate.findById(id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });

    if (vehicle.registrationImage) {
      const oldPath = path.join(process.cwd(), vehicle.registrationImage.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    if (vehicle.inspectionImage) {
      const oldPath = path.join(process.cwd(), vehicle.inspectionImage.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await vehicle.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   IMPORT EXCEL
============================== */
const importVehiclesFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chưa upload file Excel" });

    const mode = req.query.mode || "add";

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0, updated = 0, skipped = 0;
    const errors = [];

    const parseDate = (str) => {
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
        const plate = row["BSX"]?.toString().trim() || row["BIỂN SỐ XE"]?.toString().trim();

        if (!plate) {
          skipped++;
          continue;
        }

        const data = {
          plateNumber: plate,
          company: row["Đơn vị Vận tải"] || "",
          vehicleType: row["Loại xe"] || "",
          length: row["Dài"] || "",
          width: row["Rộng"] || "",
          height: row["Cao"] || "",
          norm: row["ĐỊNH MỨC"] || "",

          // 🎯 4 TRƯỜNG NGÀY ĐỌC TỪ EXCEL
          resDay: parseDate(row["Ngày đăng ký"]),
          resExpDay: parseDate(row["Ngày hết hạn đăng ký"]),
          insDay: parseDate(row["Ngày đăng kiểm"]),
          insExpDay: parseDate(row["Ngày hết hạn đăng kiểm"]),
        };

        const existing = await VehiclePlate.findOne({ plateNumber: plate });

        if (!existing) {
          await VehiclePlate.create(data);
          imported++;
        } else if (mode === "overwrite") {
          await VehiclePlate.updateOne({ plateNumber: plate }, data);
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({ message: "Import hoàn tất", imported, updated, skipped, errors });
  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   LẤY THÔNG SỐ XE
============================== */
const listVehicleNames = async (req, res) => {
  try {
    const vehicles = await VehiclePlate.find(
      {},
      {
        plateNumber: 1,
        vehicleType: 1,
        length: 1,
        width: 1,
        height: 1,
        norm: 1,
      }
    );

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: "Không thể lấy danh sách xe" });
  }
};


/* ==============================
   TOGGLE CẢNH BÁO
============================== */
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await VehiclePlate.findById(id);
    if (!schedule) return res.status(404).json({ error: "Không tìm thấy" });

    schedule.warning = !schedule.warning;
    await schedule.save();

    res.json({
      success: true,
      message: schedule.warning ? "Đã bật cảnh báo" : "Đã tắt cảnh báo",
      warning: schedule.warning,
    });
  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   XÓA TẤT CẢ XE (KHÔNG CẦN QUYỀN)
============================== */
const deleteAllVehicles = async (req, res) => {
  try {
    const vehicles = await VehiclePlate.find();

    // Xóa file ảnh nếu có
    for (const vehicle of vehicles) {
      if (vehicle.registrationImage) {
        const regPath = path.join(process.cwd(), vehicle.registrationImage.replace(/^\//, ""));
        if (fs.existsSync(regPath)) fs.unlinkSync(regPath);
      }
      if (vehicle.inspectionImage) {
        const insPath = path.join(process.cwd(), vehicle.inspectionImage.replace(/^\//, ""));
        if (fs.existsSync(insPath)) fs.unlinkSync(insPath);
      }
    }

    // Xóa tất cả bản ghi
    await VehiclePlate.deleteMany();

    res.json({ message: "Đã xóa tất cả xe thành công", count: vehicles.length });
  } catch (err) {
    console.error("Lỗi xóa tất cả xe:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  importVehiclesFromExcel,
  listVehicleNames,
  toggleWarning,
  deleteAllVehicles,
};
