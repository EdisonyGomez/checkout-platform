import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </BrowserRouter>
  );
}

