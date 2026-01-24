import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import Privacy from './pages/Privacy';
import RegisterPage from './pages/RegisterPage';
import Terms from './pages/Terms';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/restaurants"
          element={<div className="p-8">Restaurants Page</div>}
        />
        <Route
          path="/categories"
          element={<div className="p-8">Categories Page</div>}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/restaurant/:id"
          element={<div className="p-8">Restaurant Detail Page</div>}
        />
      </Routes>
    </Router>
  );
}

export default App;
