# OKX 多账户交易系统

一个功能完整的OKX永续合约多账户交易系统，支持批量操作、止盈止损、条件单等功能。

## 功能特性

### ✅ 核心功能

1. **多账户管理**
   - 支持配置多个OKX账户
   - 单账户操作
   - 多账户协同操作
   - 所有账户批量操作

2. **永续合约交易**
   - 市价单交易
   - 限价单交易
   - 条件单做多/做空
   - 支持双向持仓和单向持仓

3. **杠杆与保证金**
   - 自定义杠杆倍数 (1-125x)
   - 全仓/逐仓模式切换
   - 批量设置杠杆

4. **账户管理**
   - 查看账户余额
   - 查看持仓信息
   - 查看可用余额
   - 查看挂单余额

5. **订单管理**
   - 查看所有挂单
   - 查看所有条件单
   - 一键取消所有订单（包括条件单）
   - 按合约筛选

6. **历史与分析**
   - 历史成交记录
   - 盈亏统计
   - 手续费统计
   - 净盈亏计算

7. **智能开仓**
   - 按比例开仓: 10%, 20%, 25%, 33%, 50%, 66%, 100%
   - 按固定金额开仓
   - 自动计算杠杆后的仓位

8. **止盈止损**
   - 开仓时设置止盈价格
   - 开仓时设置止损价格
   - 自动触发平仓

## 技术栈

### 后端
- **FastAPI** - 现代化的Python Web框架
- **Python 3.8+** - 编程语言
- **Requests** - HTTP客户端
- **Pydantic** - 数据验证

### 前端
- **React 18** - UI框架
- **Ant Design 5** - UI组件库
- **Vite** - 构建工具
- **Axios** - HTTP客户端
- **React Router** - 路由管理

## 快速开始

### 1. 环境要求

- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 2. 安装依赖

```bash
# 安装Python依赖
pip install -r requirements.txt

# 安装Node.js依赖
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并配置你的OKX API密钥:

```bash
cp .env.example .env
```

编辑 `.env` 文件:

```env
# 服务器配置
PORT=8000
HOST=0.0.0.0

# 密钥（生产环境请修改）
SECRET_KEY=your-secret-key-here

# OKX API配置 - 账户1（POIT示例）
POIT_API_KEY=your-api-key-here
POIT_SECRET_KEY=your-secret-key-here
POIT_PASSPHRASE=your-passphrase-here

# 添加更多账户（可选）
# ACCOUNT2_API_KEY=...
# ACCOUNT2_SECRET_KEY=...
# ACCOUNT2_PASSPHRASE=...
```

### 4. 启动服务

#### 开发模式

```bash
# 终端1: 启动后端服务
cd /home/user/webapp
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 终端2: 启动前端开发服务器
npm run dev
```

#### 生产模式

```bash
# 构建前端
npm run build

# 启动后端（将自动服务前端静态文件）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 5. 访问应用

- 前端开发服务器: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## 目录结构

```
okx-trading-system/
├── backend/                 # 后端代码
│   ├── api/                # API路由
│   │   └── routes.py
│   ├── config/             # 配置管理
│   │   └── config.py
│   ├── models/             # 数据模型
│   │   └── schemas.py
│   ├── services/           # 业务逻辑
│   │   ├── okx_client.py
│   │   ├── account_manager.py
│   │   └── trading_service.py
│   ├── utils/              # 工具函数
│   │   └── okx_auth.py
│   └── main.py             # FastAPI应用入口
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── utils/         # 工具函数
│   │   ├── App.jsx        # 应用主组件
│   │   └── main.jsx       # 应用入口
│   └── index.html
├── .env.example           # 环境变量示例
├── .gitignore
├── package.json
├── requirements.txt
├── vite.config.js
└── README.md
```

## API接口文档

### 账户相关

- `GET /api/v1/accounts` - 获取所有账户
- `GET /api/v1/balance` - 获取账户余额
- `GET /api/v1/positions` - 获取持仓信息
- `GET /api/v1/pending-orders` - 获取挂单

### 交易相关

- `POST /api/v1/order/place` - 下单
- `POST /api/v1/order/place-by-percentage` - 按比例下单
- `POST /api/v1/order/conditional` - 条件单
- `POST /api/v1/leverage/set` - 设置杠杆
- `POST /api/v1/order/cancel-all` - 取消所有订单

### 历史相关

- `POST /api/v1/history/orders` - 订单历史
- `POST /api/v1/history/fills` - 成交历史
- `POST /api/v1/analytics/pnl` - 盈亏统计

### 行情相关

- `GET /api/v1/market/ticker` - 获取行情
- `GET /api/v1/market/instruments` - 获取合约列表

完整API文档请访问: http://localhost:8000/docs

## 使用指南

### 1. 添加账户

在 `.env` 文件中添加账户配置:

```env
ACCOUNT_NAME_API_KEY=your-api-key
ACCOUNT_NAME_SECRET_KEY=your-secret-key
ACCOUNT_NAME_PASSPHRASE=your-passphrase
```

账户名称可以自定义（只能包含字母、数字和下划线）。

### 2. 设置杠杆

在"设置"页面为指定合约设置杠杆倍数。

### 3. 开仓交易

在"交易"页面:
1. 选择一个或多个账户
2. 选择合约（例如：BTC-USDT-SWAP）
3. 选择方向（做多/做空）
4. 选择开仓模式（按比例/固定数量）
5. 设置止盈止损（可选）
6. 提交订单

### 4. 管理持仓和订单

- **持仓页面**: 查看所有持仓和未实现盈亏
- **订单管理页面**: 查看和管理挂单、条件单
- **历史记录页面**: 查看成交记录和盈亏统计

### 5. 条件单

条件单用于在价格达到指定条件时自动触发订单:
- 做多条件单: 当价格上涨到触发价时自动买入
- 做空条件单: 当价格下跌到触发价时自动卖出

## 安全提示

⚠️ **重要安全提示**:

1. **不要泄露API密钥**: 永远不要将 `.env` 文件提交到版本控制
2. **使用子账户**: 建议使用OKX子账户进行交易
3. **限制IP**: 在OKX后台设置API密钥的IP白名单
4. **权限最小化**: 只授予必要的API权限
5. **定期更换**: 定期更换API密钥
6. **生产环境**: 修改 `SECRET_KEY` 为强密码

## 常见问题

### Q: 如何添加多个账户？
A: 在 `.env` 文件中按格式添加多个账户配置即可。

### Q: 订单提交失败怎么办？
A: 检查以下项:
- API密钥是否正确
- 账户余额是否充足
- 杠杆是否已设置
- 合约代码是否正确

### Q: 如何设置止盈止损？
A: 在下单时填写止盈触发价格和止损触发价格即可。

### Q: 支持哪些合约？
A: 支持OKX所有永续合约（SWAP），如BTC-USDT-SWAP、ETH-USDT-SWAP等。

## 开发计划

- [ ] WebSocket实时行情推送
- [ ] 更多图表和数据可视化
- [ ] 策略回测功能
- [ ] 自动交易机器人
- [ ] 移动端适配

## 许可证

MIT License

## 免责声明

本软件仅供学习和研究使用。使用本软件进行实盘交易的风险由使用者自行承担。作者不对任何交易损失负责。

加密货币交易具有高风险，请谨慎投资。
