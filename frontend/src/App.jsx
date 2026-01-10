import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurants" element={<div className="p-8">Restaurants Page</div>} />
        <Route path="/categories" element={<div className="p-8">Categories Page</div>} />
        <Route path="/login" element={<div className="p-8">Login Page</div>} />
        <Route path="/register" element={<div className="p-8">Register Page</div>} />
        <Route path="/restaurant/:id" element={<div className="p-8">Restaurant Detail Page</div>} />
      </Routes>
    </Router>
  );
}

export default App
