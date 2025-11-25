const jwt = require('jsonwebtoken');

/**
 * Middleware kiểm tra xác thực & phân quyền
 * @param {Array} roles - Danh sách role được phép (vd: ['admin', 'dieuVan'])
 */
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res.status(401).json({ message: 'Chưa đăng nhập' });

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Kiểm tra quyền truy cập nếu có truyền roles
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }

      // Gắn thông tin user vào request để controller dùng
      req.user = {
        id: decoded.id,
        role: decoded.role,
        username: decoded.username || decoded.name || null,
      };

      next();
    } catch (err) {
      console.error('❌ Auth error:', err.message);
      res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
    }
  };
};

module.exports = authMiddleware;
