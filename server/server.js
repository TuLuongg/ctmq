const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require("path");
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const scheduleAdminRoutes = require('./routes/scheduleAdminRoutes')
const scheduleRoutes = require('./routes/scheduleRoutes')
const driverRoutes = require('./routes/driverRoutes')
const customerRoutes = require('./routes/customerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes')

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/schedule-admin', scheduleAdminRoutes);
app.use('/api/schedules', scheduleRoutes)

// serve uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// mount drivers
app.use("/api/drivers", driverRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vehicles", vehicleRoutes);

app.get('/', (req, res) => {
  res.send('Server hoạt động!');
});

app.listen(process.env.PORT, () => console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`));
