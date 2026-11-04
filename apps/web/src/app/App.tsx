import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/entities/session';
import { AdminUsersPage } from '@/pages/admin-users';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { ProductDetailPage } from '@/pages/product-detail';
import styles from './App.module.css';

export default function App() {
  const status = useAuthStore((state) => state.status);
  const loadMe = useAuthStore((state) => state.loadMe);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  if (status === 'checking') {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  if (status !== 'authenticated') {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}

