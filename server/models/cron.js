const cron = require("node-cron");
const ScheduleAdmin = require("./ScheduleAdmin");

// Chạy lúc 00:30 mỗi ngày
cron.schedule("30 0 * * *", async () => {
  try {
    const limit = new Date();
    limit.setDate(limit.getDate() - 60);

    const result = await ScheduleAdmin.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: limit }
    });

    console.log(`🗑️ Auto clean: Đã xóa ${result.deletedCount} chuyến quá 60 ngày`);
  } catch (err) {
    console.error("Cron error:", err);
  }
});
