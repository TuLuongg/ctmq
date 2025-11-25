const VehiclePlate = require("../models/VehiclePlate");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ==============================
// LẤY DANH SÁCH
// ==============================
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
    const vehicles = await VehiclePlate.find(filter).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    console.error("Lỗi lấy danh sách xe:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách xe" });
  }
};

// ==============================
// LẤY 1 XE
// ==============================
const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const v = await VehiclePlate.findById(id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy xe" });
    res.json(v);
  } catch (err) {
    console.error("Lỗi lấy xe:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ==============================
// TẠO MỚI
// ==============================
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
      registrationImage: req.body.registrationImage || "",
      inspectionImage: req.body.inspectionImage || "", 
      createdBy: req.user?.username || body.createdBy || "",
    };

    const saved = await VehiclePlate(vehicleData).save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo xe:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// CẬP NHẬT
// ==============================
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });

    const vehicle = await VehiclePlate.findById(id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });

    const body = req.body || {};
    Object.assign(vehicle, {
      plateNumber: body.plateNumber || vehicle.plateNumber,
      company: body.company || vehicle.company,
      vehicleType: body.vehicleType || vehicle.vehicleType,
      length: body.length || vehicle.length,
      width: body.width || vehicle.width,
      height: body.height || vehicle.height,
      norm: body.norm || vehicle.norm,
    });

    // Xử lý file
    if (req.body.registrationImage) {
      if (vehicle.registrationImage) {
        const oldPath = path.join(process.cwd(), vehicle.registrationImage.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      vehicle.registrationImage = req.body.registrationImage;
    }
    if (req.body.inspectionImage) {
      if (vehicle.inspectionImage) {
        const oldPath = path.join(process.cwd(), vehicle.inspectionImage.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      vehicle.inspectionImage = req.body.inspectionImage;
    }

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    console.error("Lỗi khi cập nhật xe:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// XOÁ
// ==============================
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "ID không hợp lệ" });

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

// ==============================
// IMPORT EXCEL
// ==============================
const importVehiclesFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chưa upload file Excel" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    const errors = [];

    for (const [idx, row] of rows.entries()) {
      try {
        if (!row["BSX"] && !row["BIỂN SỐ XE"]) continue;

        const vehicleData = {
          plateNumber: row["BSX"] || row["BIỂN SỐ XE"] || "",
          company: row["Đơn vị Vận tải"] || "",
          vehicleType: row["Loại xe"] || "",
          length: row["Dài"] || "",
          width: row["rộng"] || "",
          height: row["cao"] || "",
          norm: row["ĐỊNH MỨC"] || "",
          registrationImage: row["Ảnh đăng ký"] || "",
          inspectionImage: row["Ảnh đăng kiểm"] || "",
        };

        await VehiclePlate.create(vehicleData);
        imported++;
      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({ message: "Import hoàn tất", imported, errors });
  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lấy danh sách chỉ gồm _id và name
const listVehicleNames = async (req, res) => {
  try {
    const vehicles = await VehiclePlate.find({}, { plateNumber: 1 });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: "Không thể lấy danh sách xe" });
  }
};

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  importVehiclesFromExcel,
  listVehicleNames
};
