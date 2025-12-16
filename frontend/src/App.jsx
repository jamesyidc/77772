import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Positions from './pages/Positions';
import Orders from './pages/Orders';
import History from './pages/History';
import Settings from './pages/Settings';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </ConfigProvider>
  );
}

export default App;
