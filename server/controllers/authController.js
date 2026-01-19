const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🟢 Đăng ký (chỉ admin)
exports.register = async (req, res) => {
  try {
    const { username, password, role, fullname, phone, avatar, permissions, email } = req.body;

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin && role !== 'admin') {
      return res.status(403).json({ message: 'Chưa có admin, phải tạo admin trước!' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role, fullname, phone, avatar, permissions, email });
    await user.save();

    res.json({ message: 'Tạo tài khoản thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// 🔑 Đăng nhập
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  // 👉 Tạo accessToken (hết hạn nhanh) và refreshToken (hết hạn lâu)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, username: user.username, fullname: user.fullname, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '6h' } // 1 tiếng
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 ngày
  );

  res.json({
    accessToken,
    refreshToken,
    _id: user._id,
    role: user.role,
    username: user.username,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    permissions: user.permissions || []
  });
};

// 📋 Danh sách user (chỉ admin)
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

// ➕ Admin tạo user mới
exports.adminCreate = async (req, res) => {
  try {
    const { username, password, role, fullname, phone, avatar, email } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Tài khoản đã tồn tại' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role, fullname, phone, avatar, permissions, email });
    await user.save();

    res.json({ message: 'Tạo tài khoản thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ❌ Xóa user (chỉ admin)
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa tài khoản' });
};

// Lấy danh sách tất cả điều vận (chỉ cần đăng nhập)
exports.getAllDieuVan = async (req, res) => {
  try {
    const dieuVans = await User.find({ role: 'dieuVan' }).select('username fullname phone avatar');
    res.json(dieuVans);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách điều vận', error: err.message });
  }
};

// 🔄 Làm mới access token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Không có refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Tạo lại access token mới
    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
};

// Bật tắt quyền cho user
exports.updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const user = await User.findByIdAndUpdate(id, { permissions }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật quyền", error: err.message });
  }
};

// 🔄 Cập nhật thông tin người dùng
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullname, phone, avatar, email, passwordOld, passwordNew } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (fullname !== undefined) user.fullname = fullname;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;

    if (passwordNew) {
      if (!passwordOld) {
        return res.status(400).json({ message: "Phải nhập mật khẩu cũ để đổi mật khẩu" });
      }
      const isMatch = await bcrypt.compare(passwordOld, user.password);
      if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
      user.password = await bcrypt.hash(passwordNew, 10);
    }

    await user.save();

    res.json({
      message: "Cập nhật thông tin thành công",
      user: {
        fullname: user.fullname,
        phone: user.phone,
        avatar: user.avatar,
        email: user.email
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi cập nhật thông tin", error: err.message });
  }
};


// 🔐 Admin reset mật khẩu user
exports.adminResetPassword = async (req, res) => {
  try {
    // đã có authMiddleware(['admin']) nên không cần check lại role
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải >= 6 ký tự' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(id, {
      password: hashed
    });

    res.json({ message: 'Đã reset mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({
      message: 'Lỗi reset mật khẩu',
      error: err.message
    });
  }
};


const { sendOTPEmail } = require("../services/mailService");

// 🔐 Quên mật khẩu
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Thiếu email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // ⛔ OTP chưa hết hạn → không cho gửi lại
    if (user.resetOTPExpire && user.resetOTPExpire > new Date()) {
      return res.status(429).json({
        message: "OTP vẫn còn hiệu lực, vui lòng đợi",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpire = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, user.fullname);

    res.json({ message: "Đã gửi OTP qua email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi gửi OTP" });
  }
};


// 🔐 Reset mật khẩu bằng OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải >= 6 ký tự" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetOTP) {
      return res.status(400).json({ message: "OTP không hợp lệ" });
    }

    if (user.resetOTP !== otp) {
      return res.status(400).json({ message: "OTP sai" });
    }

    if (user.resetOTPExpire < new Date()) {
      return res.status(400).json({ message: "OTP đã hết hạn" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = null;
    user.resetOTPExpire = null;

    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi reset mật khẩu" });
  }
};

