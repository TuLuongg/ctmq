const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: { type: String, default: "" },      // Họ tên đầy đủ
    phone: { type: String, default: "" },         // Số điện thoại
    avatar: { type: String, default: "" },        // Link ảnh đại diện

    role: {
      type: String,
      enum: ["admin", "dieuVan", "keToan"],
      default: "dieuVan",
    },

    // 🧩 Quyền chi tiết cho từng danh sách
    // admin có full quyền, các role khác chỉ có quyền trong mảng này
    permissions: {
      type: [String],
      default: [], // ví dụ: ["edit_driver", "edit_customer", "edit_vehicle", "edit_trip", "edit_trip_full"]
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("User", userSchema);
