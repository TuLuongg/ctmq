const Customer = require("../models/Customer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

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
    if (!req.file) return res.status(400).json({ error: "Chưa upload file Excel" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    const errors = [];

    for (const [idx, row] of rows.entries()) {
      try {
        if (!row["DANH SÁCH KHÁCH HÀNG"]) continue;
        await Customer.create({
          name: row["DANH SÁCH KHÁCH HÀNG"] || "",
          accountant: row["TÊN NGƯỜI ĐẢM NHẬN/PHỤ TRÁCH"] || "",
          code: row["STT"] ?? "",
          accUsername: row["USERNAME"] || "",
        });
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

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomersFromExcel
};
