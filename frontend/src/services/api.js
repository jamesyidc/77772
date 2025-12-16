import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // If accessing through sandbox URL, use the sandbox backend URL
  if (window.location.hostname.includes('sandbox.novita.ai')) {
    const sandboxId = window.location.hostname.split('-').slice(1).join('-').replace('.sandbox.novita.ai', '');
    return `https://8000-${sandboxId}.sandbox.novita.ai/api/v1`;
  }
  // Otherwise use relative URL (works with Vite proxy in development)
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

// Account APIs
export const accountAPI = {
  getAccounts: () => api.get('/accounts'),
  getBalance: (accountNames, ccy) => {
    const params = {};
    if (accountNames) params.account_names = accountNames.join(',');
    if (ccy) params.ccy = ccy;
    return api.get('/balance', { params });
  },
  getPositions: (accountNames, instType = 'SWAP', instId) => {
    const params = { inst_type: instType };
    if (accountNames) params.account_names = accountNames.join(',');
    if (instId) params.inst_id = instId;
    return api.get('/positions', { params });
  },
  getPendingOrders: (accountNames, instType = 'SWAP', instId) => {
    const params = { inst_type: instType };
    if (accountNames) params.account_names = accountNames.join(',');
    if (instId) params.inst_id = instId;
    return api.get('/pending-orders', { params });
  },
};

// Trading APIs
export const tradingAPI = {
  placeOrder: (data) => api.post('/order/place', data),
  placeOrderByPercentage: (data) => api.post('/order/place-by-percentage', data),
  placeConditionalOrder: (data) => api.post('/order/conditional', data),
  setLeverage: (data) => api.post('/leverage/set', data),
  cancelAllOrders: (data) => api.post('/order/cancel-all', data),
  closeAllPositions: (data) => api.post('/positions/close-all', data),
};

// History APIs
export const historyAPI = {
  getOrderHistory: (data) => api.post('/history/orders', data),
  getFillsHistory: (data) => api.post('/history/fills', data),
  getPnLSummary: (data) => api.post('/analytics/pnl', data),
};

// Market Data APIs
export const marketAPI = {
  getTicker: (instId) => api.get('/market/ticker', { params: { inst_id: instId } }),
  getInstruments: (instType = 'SWAP') => api.get('/market/instruments', { params: { inst_type: instType } }),
};

export default api;
