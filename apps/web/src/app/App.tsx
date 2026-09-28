import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { ProductDetailPage } from '@/pages/product-detail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

