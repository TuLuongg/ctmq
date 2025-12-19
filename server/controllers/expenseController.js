const ExpenseType = require("../models/ExpenseType");
const ReceiverName = require("../models/ReceiverName");
const ReceiverCompany = require("../models/ReceiverCompany");


// GET /api/expense-types
exports.getExpenseTypes = async (req, res) => {
  try {
    const list = await ExpenseType
      .find({}, { name: 1 })   // chỉ lấy name
      .sort({ name: 1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/expense-types
exports.createExpenseType = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Thiếu tên phân loại chi" });
    }

    const exist = await ExpenseType.findOne({
      name: name.trim()
    });

    if (exist) {
      return res.status(400).json({ error: "Phân loại chi đã tồn tại" });
    }

    const expenseType = await ExpenseType.create({
      name: name.trim()
    });

    res.json(expenseType);
  } catch (err) {
    // trùng unique
    if (err.code === 11000) {
      return res.status(400).json({ error: "Phân loại chi đã tồn tại" });
    }
    res.status(500).json({ error: err.message });
  }
};

// GET /api/receiver-names
exports.getReceiverNames = async (req, res) => {
  try {
    const list = await ReceiverName
      .find({}, { name: 1 })
      .sort({ name: 1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/receiver-names
exports.createReceiverName = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Thiếu tên người nhận" });
    }

    const exist = await ReceiverName.findOne({ name: name.trim() });
    if (exist) {
      return res.status(400).json({ error: "Người nhận đã tồn tại" });
    }

    const item = await ReceiverName.create({
      name: name.trim()
    });

    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Người nhận đã tồn tại" });
    }
    res.status(500).json({ error: err.message });
  }
};

// GET /api/receiver-companies
exports.getReceiverCompanies = async (req, res) => {
  try {
    const list = await ReceiverCompany
      .find({}, { name: 1 })
      .sort({ name: 1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/receiver-companies
exports.createReceiverCompany = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Thiếu tên công ty nhận" });
    }

    const exist = await ReceiverCompany.findOne({ name: name.trim() });
    if (exist) {
      return res.status(400).json({ error: "Công ty nhận đã tồn tại" });
    }

    const item = await ReceiverCompany.create({
      name: name.trim()
    });

    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Công ty nhận đã tồn tại" });
    }
    res.status(500).json({ error: err.message });
  }
};
