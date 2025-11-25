import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./App.css";
import Login from "./pages/Login";
import AdminPage from "./pages/AdminPage";
import DieuVanPage from "./pages/DieuVanPage";
import KeToanPage from "./pages/KeToanPage";
import PrivateRoute from "./components/PrivateRoute";
import TongHop from "./pages/DieuVanActions/TongHop";
import DriverPage from "./pages/DriverPage";
import ManageDriver from "./pages/KeToanActions/ManageDriver";
import ManageCustomer from "./pages/KeToanActions/ManageCustomer";
import ManageVehicle from "./pages/KeToanActions/ManageVehicle";
import ManageTrip from "./pages/KeToanActions/ManageTrip";
import ManageAllTrip from "./pages/KeToanActions/ManageAllTrip";
import ManageTripAdmin from "./pages/AdminActions/ManageTripAdmin";
import FinalPage from "./pages/FinalPage"


function App() {
  const [user, setUser] = useState(null);

  // 🧠 Lấy user từ localStorage khi load trang
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // 🧩 Hàm logout (xoá user và quay về login)
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Trang đăng nhập */}
        <Route
          path="/login"
          element={<Login setUser={setUser} />}
        />

        <Route
          path="/driver"
          element={<DriverPage/>}
        />
        <Route
          path="/final"
          element={<FinalPage />}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <AdminPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-trip-admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <ManageTripAdmin user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Điều vận */}
        <Route
          path="/dieu-van"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <DieuVanPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/tonghop"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <TongHop user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Kế toán */}
        <Route
          path="/ke-toan"
          element={
            <PrivateRoute roles={["keToan"]}>
              <KeToanPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/manage-driver"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageDriver user={user}/>
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-customer"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageCustomer user={user}/>
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-vehicle"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageVehicle user={user}/>
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-trip"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageTrip user={user}/>
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-all-trip"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageAllTrip user={user}/>
            </PrivateRoute>
          }
        />

        {/* Redirect mặc định */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
