const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/expenseController");

router.get("/expense-types", ctrl.getExpenseTypes);
router.post("/expense-types", ctrl.createExpenseType);

router.get("/receiver-names", ctrl.getReceiverNames);
router.post("/receiver-names", ctrl.createReceiverName);

router.get("/receiver-companies", ctrl.getReceiverCompanies);
router.post("/receiver-companies", ctrl.createReceiverCompany);


module.exports = router;
