# 交易信号功能

## 功能概述

交易信号页面是一个实时监控和显示交易买卖点信号的功能模块。系统每 30 秒自动抓取一次信号数据，显示最近 1 小时内的所有信号，并自动去重。

---

## 主要功能

### 1. 自动信号抓取
- ⏰ **自动刷新**: 每 30 秒自动抓取一次信号数据
- 🕐 **历史记录**: 保留最近 1 小时内的信号
- 🔄 **自动去重**: 根据信号 ID（交易对 + 时间 + 信号类型）自动去重
- 🔴 **实时更新**: 新信号自动添加到列表顶部

### 2. 信号统计
- 📊 **总信号数**: 显示当前缓存中的总信号数量
- 📈 **买入信号**: 统计买入信号数量（绿色）
- 📉 **卖出信号**: 统计卖出信号数量（红色）

### 3. 信号展示
- 🏷️ **交易对**: 显示信号对应的交易对（如 BTC-USDT-SWAP）
- 🚦 **信号类型**: 
  - 🟢 买入信号（BUY）
  - 🔴 卖出信号（SELL）
- 💰 **价格**: 显示信号触发时的价格
- 🕒 **时间**: 精确到秒的时间戳
- 📝 **原因**: 信号触发原因（如支撑位、阻力位等）

### 4. 信号过滤与排序
- 🔍 **按信号类型过滤**: 可以只显示买入或卖出信号
- ⬆️ **时间排序**: 默认按时间倒序，最新信号在最前
- 📄 **分页显示**: 每页显示 20 条信号，支持自定义页面大小

### 5. 信号源配置
- ⚙️ **可配置 URL**: 可以通过设置界面更新信号源 URL
- 🔄 **动态切换**: 更新信号源后自动清除缓存并重新抓取
- 💾 **持久化**: 新的信号源 URL 自动保存到 `.env` 文件

---

## 使用说明

### 访问信号页面

前端地址: https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals

点击左侧菜单的 **"交易信号"** 即可进入。

### 手动刷新

点击页面右上角的 **"刷新"** 按钮可以立即获取最新信号。

### 更新信号源

1. 点击页面右上角的 **"设置"** 按钮
2. 在弹出的对话框中输入新的信号源 URL
3. 点击 **"保存"** 按钮
4. 系统会自动清除旧信号并开始从新源抓取

### 当前信号源

默认信号源: `https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance`

**注意**: 由于沙箱环境的 URL 会变化，您需要通过设置功能更新为最新的信号源地址。

---

## API 端点

### 1. 获取交易信号

```http
GET /api/v1/signals
```

**Query 参数**:
- `force_refresh` (可选): 强制立即刷新，默认 `false`

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "signals": [
      {
        "symbol": "BTC-USDT-SWAP",
        "signal": "BUY",
        "price": 43250.5,
        "timestamp": "2024-12-16T12:30:45",
        "reason": "Support level",
        "id": "BTC-USDT-SWAP_2024-12-16T12:30:45_BUY"
      }
    ],
    "total_count": 15,
    "last_update": "2024-12-16T12:30:00",
    "source_url": "https://..."
  }
}
```

### 2. 更新信号源 URL

```http
POST /api/v1/signals/source
```

**请求体**:
```json
{
  "url": "https://new-signal-source.com/api"
}
```

**响应示例**:
```json
{
  "code": "0",
  "msg": "Signal source URL updated successfully",
  "data": {
    "new_url": "https://new-signal-source.com/api"
  }
}
```

### 3. 获取当前信号源 URL

```http
GET /api/v1/signals/source
```

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "url": "https://current-signal-source.com/api"
  }
}
```

---

## 技术实现

### 后端 (Python/FastAPI)

#### SignalService (`backend/services/signal_service.py`)

**主要功能**:
1. **异步信号抓取**: 使用 `aiohttp` 异步请求信号源
2. **信号缓存**: 在内存中缓存最近 1 小时的信号
3. **自动去重**: 基于唯一 ID 去重
4. **定时刷新**: 每 30 秒自动检查并刷新

**核心方法**:
- `fetch_signals()`: 从信号源抓取数据
- `get_signals(force_refresh)`: 获取信号（带缓存）
- `update_signal_source(url)`: 更新信号源 URL
- `_process_signals(raw_data)`: 处理和标准化信号数据

**信号数据结构**:
```python
{
    'symbol': 'BTC-USDT-SWAP',      # 交易对
    'signal': 'BUY',                # 信号类型 (BUY/SELL)
    'price': 43250.5,               # 价格
    'timestamp': '2024-12-16T...',  # 时间戳
    'reason': 'Support level',      # 原因
    'id': 'unique_id',              # 唯一标识
    'datetime': datetime_obj         # Python datetime 对象（用于过滤）
}
```

#### API 路由 (`backend/api/routes.py`)

添加了 3 个新端点：
1. `GET /api/v1/signals` - 获取信号
2. `POST /api/v1/signals/source` - 更新信号源
3. `GET /api/v1/signals/source` - 查询当前信号源

### 前端 (React/Ant Design)

#### Signals 页面 (`frontend/src/pages/Signals.jsx`)

**主要组件**:
1. **统计卡片**: 显示总信号数、买入信号数、卖出信号数
2. **信号源显示**: 显示当前使用的信号源 URL
3. **信号表格**: 
   - 支持按时间排序
   - 支持按信号类型过滤
   - 分页显示
4. **操作按钮**:
   - 刷新按钮：手动刷新信号
   - 设置按钮：打开设置对话框
5. **设置对话框**: 允许用户更新信号源 URL

**自动刷新机制**:
```javascript
useEffect(() => {
  loadSignals();
  
  // 每 30 秒自动刷新
  intervalRef.current = setInterval(() => {
    loadSignals(false);  // 静默刷新（不显示加载动画）
  }, 30000);

  return () => {
    clearInterval(intervalRef.current);
  };
}, []);
```

#### API 服务 (`frontend/src/services/api.js`)

添加了 `signalAPI` 对象：
```javascript
export const signalAPI = {
  getSignals: (forceRefresh) => api.get('/signals', { params: { force_refresh: forceRefresh } }),
  updateSignalSource: (url) => api.post('/signals/source', { url }),
  getSignalSource: () => api.get('/signals/source'),
};
```

---

## 信号源格式要求

信号源 API 应该返回以下格式的 JSON 数据：

```json
{
  "signals": [
    {
      "symbol": "BTC-USDT-SWAP",
      "signal": "BUY",
      "price": "43250.5",
      "timestamp": "2024-12-16T12:30:45",
      "reason": "Support level"
    },
    {
      "symbol": "ETH-USDT-SWAP",
      "signal": "SELL",
      "price": "2280.3",
      "timestamp": "2024-12-16T12:31:12",
      "reason": "Resistance level"
    }
  ]
}
```

**字段说明**:
- `symbol` (必须): 交易对标识，如 `BTC-USDT-SWAP`
- `signal` (必须): 信号类型，`BUY` 或 `SELL`
- `price` (必须): 信号触发价格（字符串或数字）
- `timestamp` (必须): ISO 格式时间戳
- `reason` (可选): 信号触发原因

---

## 配置说明

### 环境变量

在 `.env` 文件中配置信号源：

```ini
# Trading Signals Configuration
SIGNAL_SOURCE_URL=https://your-signal-source.com/api
```

### 修改刷新间隔

如需修改自动刷新间隔（默认 30 秒），编辑 `frontend/src/pages/Signals.jsx`:

```javascript
// 将 30000 改为所需的毫秒数
intervalRef.current = setInterval(() => {
  loadSignals(false);
}, 30000);  // 30 秒 = 30000 毫秒
```

### 修改信号保留时长

如需修改信号保留时长（默认 1 小时），编辑 `backend/services/signal_service.py`:

```python
def __init__(self):
    # ...
    self.cache_duration = timedelta(hours=1)  # 改为所需的时长
```

---

## 故障排查

### 问题 1: 信号显示为空

**可能原因**:
1. 信号源 URL 不正确
2. 信号源 API 未返回数据
3. 信号源格式不符合要求

**解决方案**:
1. 检查后端日志：`tail -f /tmp/backend.log`
2. 手动测试信号源 API：`curl https://your-signal-source.com/api`
3. 验证信号源返回的 JSON 格式是否正确

### 问题 2: 信号未自动刷新

**可能原因**:
1. 页面未激活（浏览器标签页在后台）
2. JavaScript 定时器被浏览器限制

**解决方案**:
1. 保持页面标签页在前台激活状态
2. 手动点击刷新按钮强制刷新

### 问题 3: 更新信号源后无效

**可能原因**:
1. 新的 URL 无法访问
2. 网络连接问题

**解决方案**:
1. 验证新 URL 的可访问性
2. 检查后端日志中的错误信息
3. 尝试手动刷新信号

---

## 最佳实践

### 1. 信号源设计

- ✅ 使用标准化的 JSON 格式
- ✅ 包含完整的时间戳信息
- ✅ 提供清晰的信号原因
- ✅ 确保 API 响应速度快（< 2 秒）

### 2. 使用建议

- ✅ 定期查看信号统计，了解市场趋势
- ✅ 结合其他指标分析，不要单纯依赖信号
- ✅ 设置合理的止损和止盈
- ✅ 在信号源更换后，观察一段时间再交易

### 3. 性能优化

- ✅ 系统已实现内存缓存，避免频繁请求
- ✅ 使用异步请求，不阻塞其他操作
- ✅ 自动清理过期信号，防止内存溢出

---

## 未来增强

可能的功能增强方向：

1. **信号推送通知**
   - 浏览器桌面通知
   - 邮件/短信通知
   - Webhook 集成

2. **信号历史分析**
   - 信号准确率统计
   - 盈亏回测
   - 信号质量评分

3. **多信号源支持**
   - 同时连接多个信号源
   - 信号源切换和比较
   - 信号聚合和过滤

4. **自动交易**
   - 根据信号自动下单
   - 可配置的交易策略
   - 风险控制参数

5. **信号订阅**
   - 只订阅特定交易对的信号
   - 自定义信号过滤规则
   - 信号优先级设置

---

## 技术栈

- **后端**: Python 3.8+, FastAPI, aiohttp
- **前端**: React 18, Ant Design 5, Axios
- **部署**: Uvicorn (ASGI 服务器)

---

## 相关文件

### 后端文件
- `backend/services/signal_service.py` - 信号服务核心逻辑
- `backend/api/routes.py` - API 路由定义
- `.env` - 环境变量配置

### 前端文件
- `frontend/src/pages/Signals.jsx` - 信号页面组件
- `frontend/src/pages/Signals.css` - 信号页面样式
- `frontend/src/services/api.js` - API 客户端
- `frontend/src/App.jsx` - 应用路由配置
- `frontend/src/components/MainLayout.jsx` - 主布局（菜单）

---

## 版本历史

### v1.0.0 (2024-12-16)

**新增功能**:
- ✨ 交易信号页面
- ⏰ 30 秒自动刷新
- 🕐 1 小时信号历史
- 🔄 自动去重
- 📊 信号统计仪表板
- ⚙️ 可配置信号源
- 🔍 信号过滤和排序

**技术实现**:
- SignalService 后端服务
- Signals React 组件
- 3 个新 API 端点
- 环境变量配置

---

## 支持

如有问题或建议，请查看：
- 项目 README: `/home/user/webapp/README.md`
- API 文档: https://8000-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/docs
- GitHub 仓库: https://github.com/jamesyidc/77772

---

**最后更新**: 2024-12-16
**文档版本**: 1.0
**状态**: ✅ 已完成并测试
