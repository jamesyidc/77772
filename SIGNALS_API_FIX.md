# Signals API Fix - 信号数据源修复

## 日期 Date
2025-12-17

## 问题描述 Problem Description

### 用户反馈
信号页面 (https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals) 无法显示数据，显示 "暂无数据"。

### 根本原因 Root Cause
前端配置的数据源 URL 返回的是 **HTML 页面**，而不是 JSON 数据：

1. **Panic 持仓量监控**
   - ❌ 错误URL: `https://.../panic` → 返回 HTML 网页
   - ✅ 正确URL: `https://.../api/panic/latest` → 返回 JSON

2. **Query 交易信号数据**
   - ❌ 错误URL: `https://.../query` → 返回 HTML 网页
   - ✅ 正确URL: `https://.../api/latest` → 返回 JSON

3. **Support-Resistance 支撑阻力信号**
   - ❌ 错误URL: `https://.../support-resistance` → 返回 HTML 网页
   - ✅ 正确URL: `https://.../api/support-resistance/latest-signal` → 返回 JSON

## 解决方案 Solution

### 1. 更新默认 URL 配置

**Before (错误):**
```javascript
const DEFAULT_URLS = {
  panic: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/panic',
  query: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/query',
  supportResistance: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance'
};
```

**After (正确):**
```javascript
const DEFAULT_URLS = {
  panic: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/panic/latest',
  query: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/latest',
  supportResistance: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/support-resistance/latest-signal'
};
```

### 2. 更新字段映射

#### Panic Data (持仓量监控)

**API Response:**
```json
{
  "success": true,
  "data": {
    "total_position": 91.36,      // 亿美元
    "hour_24_people": 9.32,       // 万人
    "panic_index": 10.2,           // 恐慌指数 %
    "panic_level": "高度恐慌",
    "record_time": "2025-12-17 11:03:31"
  }
}
```

**Field Mapping:**
```javascript
// 持仓量 (亿 → USDT)
total_position * 100,000,000

// 持仓人数 (万 → 人)
hour_24_people * 10,000

// 恐慌指数
panic_index
```

#### Query Data (交易信号数据)

**API Response:**
```json
{
  "coins": [
    {
      "symbol": "BTC",
      "change": 0.07,
      "change_24h": 1.83,
      "current_price": 86904.29,
      "rush_up": 0,
      "rush_down": 0,
      "rank": 13,
      "priority": "等待6",
      "ratio1": "69.32%",
      "ratio2": "106.82%",
      "decline": -30.63,
      "high_price": 126259.48,
      "high_time": "2025-10-07",
      "update_time": "2025-12-17 11:04:58"
    }
  ]
}
```

**Field Mapping:**
| 表头 | API 字段 | 说明 |
|------|---------|------|
| 币种 | symbol | 货币符号 |
| 急涨 | rush_up | 急涨次数 |
| 急跌 | rush_down | 急跌次数 |
| 排名 | rank | 市场排名 |
| 优先级 | priority | 等级 |
| 状态 | change | >5% = 急涨, <-5% = 急跌 |
| 比值1 | ratio1 | 比值百分比 |
| 跌幅% | decline | 跌幅百分比 |
| 当前价格 | current_price | 实时价格 |
| 历史最高 | high_price | 历史最高价 |
| 24h涨≥10% | change_24h >= 10 | 是/否 |
| 24h跌≤-10% | change_24h <= -10 | 是/否 |

#### Support-Resistance (支撑阻力信号)

**API Response:**
```json
{
  "success": true,
  "signals": {
    "buy": false,
    "sell": false
  },
  "scenario_1_coins": [],
  "scenario_2_coins": [],
  "scenario_3_coins": [
    {
      "symbol": "TONUSDT",
      "current_price": 1.569,
      "resistance_line": 1.57,
      "distance": 0.064,
      "position": 99.09
    }
  ],
  "scenario_4_coins": [],
  "snapshot_time": "2025-12-17 19:04:57"
}
```

**Logic:**
- `position < 50` → 抄底信号 (买入)
- `position > 50` → 逃顶信号 (卖出)

### 3. 更新数据加载逻辑

#### loadPanicData
```javascript
// Handle API response format: {success: true, data: {...}}
if (response.data && response.data.success && response.data.data) {
  setPanicData(response.data.data);
  setPanicLastUpdate(new Date());
}
```

#### loadQueryData
```javascript
// Handle API response: {coins: [...]}
if (response.data && response.data.coins && Array.isArray(response.data.coins)) {
  const latestRecords = response.data.coins.slice(0, 10);
  setQueryData(latestRecords);
  setQueryLastUpdate(new Date());
}
```

#### loadSRData
```javascript
// Parse scenario coins
const allCoins = [
  ...(response.data.scenario_1_coins || []),
  ...(response.data.scenario_2_coins || []),
  ...(response.data.scenario_3_coins || []),
  ...(response.data.scenario_4_coins || [])
];

// Categorize by position
allCoins.forEach(coin => {
  if (coin.position < 50) {
    buySignals.push(coin);
  } else {
    sellSignals.push(coin);
  }
});
```

## 用户操作指南 User Guide

### 如何清除旧配置

如果您之前配置了错误的 URL，需要重置为新的 JSON API：

1. **打开信号页面**
   ```
   https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals
   ```

2. **点击右上角 "设置" 按钮** (⚙️图标)

3. **点击 "恢复默认" 按钮**

4. **点击 "保存" 按钮**

5. **刷新页面**，数据应该正常显示

### 或者手动清除浏览器缓存

1. 打开浏览器开发者工具 (F12)
2. 进入 Application → Local Storage
3. 删除 `signal_urls` 键
4. 刷新页面

## 测试验证 Testing

### 1. Panic Data 测试
```bash
curl -s "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/panic/latest"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "total_position": 91.36,
    "hour_24_people": 9.32,
    "panic_index": 10.2,
    ...
  }
}
```

### 2. Query Data 测试
```bash
curl -s "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/latest"
```

**Expected:**
```json
{
  "coins": [
    {
      "symbol": "BTC",
      "change": 0.07,
      ...
    }
  ]
}
```

### 3. Support-Resistance 测试
```bash
curl -s "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/support-resistance/latest-signal"
```

**Expected:**
```json
{
  "success": true,
  "signals": {...},
  "scenario_3_coins": [...]
}
```

## 技术细节 Technical Details

### API 端点对比

| 功能 | HTML 页面 | JSON API |
|------|-----------|----------|
| Panic | `/panic` | `/api/panic/latest` |
| Query | `/query` | `/api/latest` |
| SR | `/support-resistance` | `/api/support-resistance/latest-signal` |

### 数据刷新频率

| 数据源 | 刷新间隔 | 配置 |
|--------|---------|------|
| Panic | 3 分钟 | `panicIntervalRef` |
| Query | 10 分钟 | `queryIntervalRef` |
| SR | 30 秒 | `srIntervalRef` |

### LocalStorage 配置

**Key:** `signal_urls`

**Value:**
```json
{
  "panic": "https://.../api/panic/latest",
  "query": "https://.../api/latest",
  "supportResistance": "https://.../api/support-resistance/latest-signal"
}
```

## 常见问题 FAQ

### Q1: 为什么之前的 URL 不工作？
**A:** 之前配置的 URL 返回的是 HTML 网页，前端期望的是 JSON 数据。HTML 无法被 JavaScript 解析为数据对象。

### Q2: 如何验证 URL 是否正确？
**A:** 在浏览器中打开 URL：
- ✅ JSON API: 显示 JSON 格式数据
- ❌ HTML 页面: 显示完整网页

### Q3: 设置按钮在哪里？
**A:** 在信号页面右上角，"10分钟刷新" 标签旁边的 ⚙️ 图标。

### Q4: 如何确认数据已经加载？
**A:** 查看每个卡片的右上角：
- 🔄 图标旋转 = 正在加载
- 🕐 时间标签 = 最后更新时间

### Q5: 数据还是不显示怎么办？
**A:** 
1. 清除 LocalStorage 中的 `signal_urls`
2. 刷新页面（Ctrl+F5 强制刷新）
3. 打开开发者工具查看 Console 错误
4. 检查 Network 标签确认 API 请求成功

## 代码变更 Code Changes

**Commit:** `c1a2887` - fix: Update signal data sources to use JSON API endpoints

**Files Changed:**
- `frontend/src/pages/Signals.jsx`

**Changes:**
1. ✅ 更新默认 URL 为 JSON API 端点
2. ✅ 更新 Panic 数据字段映射
3. ✅ 更新 Query 数据字段映射
4. ✅ 更新 Support-Resistance 数据解析
5. ✅ 修改表格表头以匹配新数据结构
6. ✅ 优化数据显示逻辑

## 状态 Status

✅ **已修复并部署** (Fixed and Deployed)

- 默认 URL 已更新为 JSON API
- 字段映射已完成
- 数据加载逻辑已优化
- 前端自动重新编译

---

**重要提示：** 如果您之前配置了自定义 URL，请使用 "设置" 按钮中的 "恢复默认" 功能，或手动清除浏览器 LocalStorage 中的 `signal_urls` 配置。

**Pull Request:** https://github.com/jamesyidc/77772/pull/1  
**Branch:** `genspark_ai_developer`  
**Commit:** `c1a2887`  
**Author:** AI Assistant  
**Date:** 2025-12-17
