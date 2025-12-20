import { NavLink, Outlet, useNavigate } from "react-router-dom";
import React from "react";

export default function CostManagementPage() {
  const navigate = useNavigate();
  return (
    <div className="h-screen flex flex-col">
      {/* ===== HEADER MENU CỐ ĐỊNH ===== */}
      <div className="h-10 fixed top-0 left-0 right-0 bg-white border-b z-50 flex items-center px-4">
        {/* 🔙 QUAY VỀ KẾ TOÁN */}
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-2 rounded border text-xs hover:bg-gray-100 mr-2"
        >
          Trang chính
        </button>
        <div className="flex gap-2 text-xs">
          <Menu to="fuel" label="Nhiên liệu" />
          <Menu to="repair" label="Sửa xe" />
          <Menu to="tire" label="Lốp" />
          <Menu to="salary" label="Lương" />
          <Menu to="depreciation" label="Khấu hao xe" />
          <Menu to="epass-month" label="Epass (tháng)" />
          <Menu to="epass-turn" label="Epass (lượt)" />
          <Menu to="etc" label="ETC" />
          <Menu to="vehicle-legal" label="ĐK - ĐK - BH xe" />
          <Menu to="trip-payment" label="Thanh toán lịch trình" highlight />
        </div>
      </div>

      {/* ===== NỘI DUNG ===== */}
      <div className="flex-1 mt-14 overflow-auto p-4 bg-gray-50 text-xs">
        <Outlet />
      </div>
    </div>
  );
}

const Menu = ({ to, label, highlight }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `
      px-3 py-2 rounded whitespace-nowrap
      ${
        isActive
          ? highlight
            ? "bg-purple-600 text-white"
            : "bg-blue-600 text-white"
          : highlight
          ? "border border-purple-600 text-purple-600 hover:bg-purple-50"
          : "hover:bg-gray-100"
      }
    `
    }
  >
    {label}
  </NavLink>
);
