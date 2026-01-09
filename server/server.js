const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const authRoutes = require("./routes/authRoutes");
const scheduleAdminRoutes = require("./routes/scheduleAdminRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const driverRoutes = require("./routes/driverRoutes");
const customerRoutes = require("./routes/customerRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const paymentHistoryRoutes = require("./routes/paymentHistoryRoutes");
const oddCustomerDebtRoutes = require("./routes/oddCustomerDebt.routes");
const voucherRoutes = require("./routes/voucherRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

require("./models/cron");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => console.error("❌ Lỗi MongoDB:", err));

app.use("/api/auth", authRoutes);
app.use("/api/schedule-admin", scheduleAdminRoutes);
app.use("/api/schedules", scheduleRoutes);

// serve uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// mount drivers
app.use("/api/drivers", driverRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/payment-history", paymentHistoryRoutes);
app.use("/api/odd-debt", oddCustomerDebtRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/expense", expenseRoutes);

app.use("/api/fuel-vinh-khuc", require("./routes/fuelVinhKhuc.routes"));
app.use("/api/fuel-ngoc-long", require("./routes/fuelNgocLong.routes"));

app.use("/api/repair", require("./routes/repair.routes"));
app.use("/api/tire", require("./routes/tire.routes"));
app.use("/api/depreciation", require("./routes/depreciation.routes"));
app.use("/api/epass-month", require("./routes/epassMonth.routes"));
app.use("/api/epass-turn", require("./routes/epassTurn.routes"));
app.use("/api/etc", require("./routes/etc.routes"));
app.use("/api/vehicle-legal", require("./routes/vehicleLegal.routes"));
app.use("/api/salary", require("./routes/salary.routes"));
app.use("/api/trip-payment-kt", require("./routes/tripPaymentKT.routes"));
app.use(
  "/api/transportation-contract",
  require("./routes/transportationContract.routes")
);
app.use("/api/tcb-person", require("./routes/TCBperson.routes"));

app.use("/api/address", require("./routes/address.routes"));
app.use("/api/customer2", require("./routes/customer2.routes"));

app.get("/", (req, res) => {
  res.send("Server hoạt động!");
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`)
);
