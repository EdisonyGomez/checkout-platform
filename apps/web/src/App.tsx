import { BrowserRouter, Routes, Route } from 'react-router-dom';

import CheckoutFlowPage from './pages/CheckoutFlowPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
                <Route path="/" element={<CheckoutFlowPage />} />

      </Routes>
    </BrowserRouter>
  );
}

