# OKX 多账户交易系统 - 项目概述

## 🎯 项目简介

这是一个功能完整的 OKX 永续合约多账户交易系统，支持批量操作、条件单、止盈止损等专业交易功能。系统采用前后端分离架构，提供直观的 Web 界面和完善的 REST API。

**项目状态**: ✅ 生产就绪

## ✨ 核心功能

### 1. 多账户管理
- ✅ 支持配置无限数量的 OKX 账户
- ✅ 单账户独立操作
- ✅ 多账户协同操作
- ✅ 所有账户批量操作
- ✅ 灵活的账户选择机制

### 2. 永续合约交易
- ✅ 市价单交易
- ✅ 限价单交易
- ✅ 条件单做多/做空
- ✅ 支持所有 OKX SWAP 合约
- ✅ 双向持仓和单向持仓支持

### 3. 智能开仓
- ✅ 按比例开仓: 10%, 20%, 25%, 33%, 50%, 66%, 100%
- ✅ 固定数量开仓
- ✅ 自动计算杠杆后的仓位
- ✅ 实时市场价格获取

### 4. 止盈止损
- ✅ 开仓时设置止盈价格
- ✅ 开仓时设置止损价格
- ✅ 自动触发平仓
- ✅ 支持市价和限价止盈止损

### 5. 杠杆管理
- ✅ 自定义杠杆倍数 (1-125x)
- ✅ 全仓/逐仓模式切换
- ✅ 批量设置多账户杠杆
- ✅ 持仓方向独立设置

### 6. 账户信息
- ✅ 实时账户余额查询
- ✅ 持仓信息展示
- ✅ 未实现盈亏统计
- ✅ 可用余额和冻结余额
- ✅ 保证金使用情况

### 7. 订单管理
- ✅ 查看所有挂单
- ✅ 查看所有条件单
- ✅ 一键取消所有订单（包括条件单）
- ✅ 按合约筛选订单
- ✅ 实时订单状态更新

### 8. 历史与分析
- ✅ 历史成交记录查询
- ✅ 盈亏统计（含手续费）
- ✅ 净盈亏计算
- ✅ 成交笔数统计
- ✅ 时间范围筛选

## 🏗️ 系统架构

### 技术栈

#### 后端
- **框架**: FastAPI (Python 3.8+)
- **HTTP客户端**: Requests
- **数据验证**: Pydantic
- **异步支持**: asyncio
- **环境管理**: python-dotenv

#### 前端
- **框架**: React 18
- **UI库**: Ant Design 5
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **状态管理**: React Hooks

#### API集成
- **OKX REST API v5**
- **WebSocket支持** (计划中)

### 项目结构

```
okx-trading-system/
├── backend/                    # 后端服务
│   ├── api/                   # API路由层
│   │   └── routes.py         # REST API端点定义
│   ├── config/               # 配置管理
│   │   └── config.py        # 环境变量和配置
│   ├── models/              # 数据模型
│   │   └── schemas.py       # Pydantic模型定义
│   ├── services/            # 业务逻辑层
│   │   ├── okx_client.py   # OKX API客户端
│   │   ├── account_manager.py  # 多账户管理
│   │   └── trading_service.py  # 交易服务
│   ├── utils/               # 工具函数
│   │   └── okx_auth.py     # OKX认证工具
│   └── main.py             # FastAPI应用入口
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   └── MainLayout.jsx  # 主布局
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard.jsx   # 仪表盘
│   │   │   ├── Trading.jsx     # 交易页面
│   │   │   ├── Positions.jsx   # 持仓管理
│   │   │   ├── Orders.jsx      # 订单管理
│   │   │   ├── History.jsx     # 历史记录
│   │   │   └── Settings.jsx    # 设置页面
│   │   ├── services/       # API服务
│   │   │   └── api.js      # API封装
│   │   ├── App.jsx         # 应用主组件
│   │   └── main.jsx        # 应用入口
│   └── index.html
├── logs/                      # 日志目录
├── .env                       # 环境变量（不提交到Git）
├── .env.example              # 环境变量示例
├── .gitignore                # Git忽略配置
├── package.json              # Node.js依赖
├── requirements.txt          # Python依赖
├── vite.config.js           # Vite配置
├── start.sh                 # 启动脚本
├── README.md                # 项目说明
├── DEPLOYMENT.md            # 部署指南
├── API_GUIDE.md             # API文档
└── PROJECT_OVERVIEW.md      # 项目概述（本文档）
```

## 🚀 快速开始

### 前置要求

- Python 3.8+
- Node.js 16+
- OKX账户及API密钥

### 安装步骤

```bash
# 1. 克隆项目（如果从Git）
git clone <repository-url>
cd okx-trading-system

# 2. 安装依赖
pip install -r requirements.txt
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的OKX API密钥

# 4. 启动服务
./start.sh
# 或手动启动：
# 终端1: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# 终端2: npm run dev
```

### 访问系统

- 🌐 **前端界面**: http://localhost:5173
- 🔌 **后端API**: http://localhost:8000
- 📚 **API文档**: http://localhost:8000/docs

**当前部署的公网地址**:
- 🌐 **前端**: https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai
- 🔌 **后端**: https://8000-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai

## 📖 文档

- **[README.md](README.md)** - 项目介绍和快速开始
- **[API_GUIDE.md](API_GUIDE.md)** - 完整的API使用文档
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 部署和生产环境配置
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - 本文档

## 🔐 安全性

### 已实现的安全措施

- ✅ 环境变量存储敏感信息
- ✅ .gitignore 排除 .env 文件
- ✅ OKX API 签名认证
- ✅ HTTPS 支持（通过反向代理）
- ✅ CORS 配置

### 安全建议

1. **API密钥管理**
   - 使用OKX子账户
   - 设置IP白名单
   - 定期更换密钥
   - 最小权限原则

2. **网络安全**
   - 使用HTTPS
   - 配置防火墙
   - 限制访问IP
   - 使用VPN

3. **系统安全**
   - 定期更新依赖
   - 启用日志记录
   - 定期备份数据
   - 监控异常活动

## 📊 系统监控

### 日志
- 后端日志: `logs/app.log`
- 访问日志: Nginx access.log
- 错误日志: Nginx error.log

### 性能指标
- API响应时间
- 订单处理速度
- 系统资源使用

## 🛠️ 开发工具

### 推荐IDE
- **VS Code** + Python/React插件
- **PyCharm** (后端)
- **WebStorm** (前端)

### 开发工具链
```bash
# 代码格式化
pip install black
npm install -g prettier

# 代码检查
pip install pylint
npm install -g eslint

# 测试工具
pip install pytest
npm install --save-dev @testing-library/react
```

## 📈 未来计划

### 即将推出的功能

- [ ] WebSocket实时行情推送
- [ ] 更丰富的图表和数据可视化
- [ ] 策略回测功能
- [ ] 自动交易机器人
- [ ] 移动端适配
- [ ] 多语言支持
- [ ] 用户权限系统
- [ ] 交易日志导出

### 优化计划

- [ ] Redis缓存层
- [ ] 数据库持久化
- [ ] 性能优化
- [ ] 错误重试机制
- [ ] 更完善的测试覆盖

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 更新日志

### v1.0.0 (2024-12-16)

**初始版本发布**

✨ 新功能:
- 完整的多账户管理系统
- 永续合约交易功能
- 条件单和杠杆设置
- 账户余额和持仓查询
- 订单管理（包括批量取消）
- 历史成交和盈亏统计
- 比例开仓和止盈止损
- Web UI界面
- REST API
- 完整文档

🔧 技术实现:
- FastAPI后端
- React前端
- OKX API集成
- Ant Design UI

📚 文档:
- README
- API指南
- 部署指南
- 项目概述

## 📞 联系方式

- **项目地址**: /home/user/webapp
- **API文档**: http://localhost:8000/docs
- **前端界面**: http://localhost:5173

## ⚠️ 免责声明

**重要提示**: 

本软件仅供学习和研究使用。使用本软件进行实盘交易的风险由使用者自行承担。作者不对任何交易损失负责。

加密货币交易具有高风险，请谨慎投资，充分了解市场风险后再进行交易。

- ❌ 不保证盈利
- ❌ 不承担任何交易损失
- ❌ 不提供投资建议
- ✅ 仅供教育和研究目的

使用前请：
1. 充分了解加密货币交易风险
2. 在模拟环境中充分测试
3. 使用小额资金进行试验
4. 设置合理的止损
5. 不要投资超过承受能力的资金

## 📄 许可证

MIT License

Copyright (c) 2024 OKX Trading System

---

**项目状态**: ✅ 生产就绪  
**最后更新**: 2024-12-16  
**版本**: 1.0.0
