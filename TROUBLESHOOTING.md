# 故障排除指南

## 常见问题及解决方案

### 问题 1: 前端显示账户余额为 $0.00

**症状**：
- 仪表盘显示总账户余额为 $0.00
- 账户列表中余额显示为 $0.00
- 但后端 API 可以正常返回数据

**原因**：
浏览器缓存了旧版本的前端代码，没有使用更新后的 API 配置。

**解决方案**：

#### 方法 1: 强制刷新浏览器（推荐）

1. **Windows/Linux**: 按 `Ctrl + Shift + R` 或 `Ctrl + F5`
2. **Mac**: 按 `Cmd + Shift + R`
3. 或者在浏览器中：
   - 打开开发者工具 (F12)
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

#### 方法 2: 清除浏览器缓存

1. 打开浏览器设置
2. 找到"隐私和安全"
3. 清除浏览数据
4. 选择"缓存的图片和文件"
5. 清除数据后刷新页面

#### 方法 3: 使用隐私/无痕模式

1. 打开新的隐私/无痕窗口
2. 访问系统 URL
3. 这会绕过所有缓存

### 问题 2: API 连接失败

**症状**：
- 控制台显示网络错误
- 数据无法加载

**检查步骤**：

1. **验证后端服务**：
   ```bash
   curl http://localhost:8000/health
   # 应该返回: {"status":"healthy","message":"Service is running"}
   ```

2. **验证账户 API**：
   ```bash
   curl http://localhost:8000/api/v1/accounts
   # 应该返回账户列表
   ```

3. **验证余额 API**：
   ```bash
   curl "http://localhost:8000/api/v1/balance?account_names=POIT"
   # 应该返回余额数据
   ```

**解决方案**：

如果后端无响应：
```bash
# 重启后端服务
cd /home/user/webapp
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

如果前端无法连接：
```bash
# 重启前端服务
cd /home/user/webapp
npm run dev
```

### 问题 3: OKX API 连接失败

**症状**：
- 后端 API 返回空数据
- 余额显示为 0
- 订单提交失败

**可能原因**：
1. API 密钥错误
2. API 密钥权限不足
3. IP 地址未在白名单中
4. OKX 服务器问题

**检查步骤**：

1. **验证 API 密钥配置**：
   ```bash
   cat /home/user/webapp/.env | grep -E "(API_KEY|SECRET_KEY|PASSPHRASE)"
   ```

2. **测试 OKX 连接**：
   ```bash
   curl "http://localhost:8000/api/v1/balance?account_names=POIT"
   ```

**解决方案**：

1. 检查 `.env` 文件中的配置：
   ```
   POIT_API_KEY=你的API密钥
   POIT_SECRET_KEY=你的密钥
   POIT_PASSPHRASE=你的密码
   ```

2. 确保 API 密钥有以下权限：
   - 读取权限（Read）
   - 交易权限（Trade）

3. 在 OKX 后台设置 IP 白名单（如果需要）

### 问题 4: 交易下单失败

**常见错误**：

#### 错误: "余额不足"
- 检查账户余额
- 减少仓位比例
- 降低杠杆倍数

#### 错误: "杠杆未设置"
- 在"设置"页面先设置合约杠杆
- 每个合约需要单独设置杠杆

#### 错误: "合约不存在"
- 检查合约代码是否正确
- 确保使用 USDT 永续合约（-USDT-SWAP）

#### 错误: "订单数量太小"
- 增加订单数量
- 检查最小下单量要求

### 问题 5: 页面无法访问

**症状**：
- 浏览器显示"连接被拒绝"
- 页面无法加载

**解决方案**：

1. **检查服务状态**：
   ```bash
   netstat -tuln | grep -E ":(5173|8000)"
   ```

2. **重启所有服务**：
   ```bash
   cd /home/user/webapp
   ./start.sh
   ```

3. **使用正确的 URL**：
   - 沙箱访问: https://5173-xxx.sandbox.novita.ai
   - 本地访问: http://localhost:5173

## 性能优化

### 提高加载速度

1. **清除浏览器缓存**
2. **使用最新版本的浏览器**
3. **关闭不必要的浏览器扩展**

### 减少 API 调用

- 设置合理的刷新间隔
- 避免频繁切换页面
- 使用批量查询而非单个查询

## 日志查看

### 后端日志

```bash
# 查看后端运行日志
tail -f /home/user/webapp/logs/app.log

# 查看错误日志
grep ERROR /home/user/webapp/logs/app.log
```

### 前端日志

打开浏览器开发者工具 (F12)，查看：
- Console 标签：JavaScript 错误和日志
- Network 标签：API 请求和响应

## 数据验证

### 验证账户配置

```bash
curl http://localhost:8000/api/v1/accounts
```

应该看到：
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "accounts": ["POIT"],
    "count": 1
  }
}
```

### 验证余额

```bash
curl "http://localhost:8000/api/v1/balance?account_names=POIT"
```

应该看到包含 `eq` (equity) 字段的完整余额信息。

### 验证合约列表

```bash
curl "http://localhost:8000/api/v1/market/instruments?inst_type=SWAP" | grep -o '"instId":"[^"]*"' | head -10
```

应该看到合约列表，且只包含配置的 27 个币种。

## 安全检查

### 定期检查项

1. **API 密钥安全**：
   - 定期更换 API 密钥
   - 确保 .env 文件权限正确（chmod 600）
   - 不要将 API 密钥提交到 Git

2. **系统更新**：
   ```bash
   # 更新 Python 依赖
   pip install -r requirements.txt --upgrade
   
   # 更新 Node.js 依赖
   npm update
   ```

3. **日志审计**：
   - 定期查看交易日志
   - 检查异常活动
   - 监控账户余额变化

## 重置系统

如果遇到严重问题，可以完全重置系统：

```bash
# 1. 停止所有服务
pkill -f "uvicorn"
pkill -f "vite"

# 2. 清除缓存
cd /home/user/webapp
rm -rf frontend/node_modules/.vite
rm -rf __pycache__
rm -rf backend/__pycache__

# 3. 重新安装依赖
pip install -r requirements.txt
npm install

# 4. 重启服务
./start.sh
```

## 获取帮助

### 查看文档

- **README.md** - 项目概述和快速开始
- **API_GUIDE.md** - 完整 API 文档
- **DEPLOYMENT.md** - 部署指南
- **PROJECT_OVERVIEW.md** - 项目架构
- **TROUBLESHOOTING.md** - 本文档

### 在线资源

- OKX API 文档: https://www.okx.com/docs-v5/zh/
- FastAPI 文档: https://fastapi.tiangolo.com/
- React 文档: https://react.dev/
- Ant Design 文档: https://ant.design/

## 常用命令速查

```bash
# 查看服务状态
netstat -tuln | grep -E ":(5173|8000)"

# 重启后端
cd /home/user/webapp && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 重启前端
cd /home/user/webapp && npm run dev

# 查看后端日志
tail -f logs/app.log

# 测试 API
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/accounts

# 查看 Git 状态
cd /home/user/webapp && git status

# 查看最近的提交
cd /home/user/webapp && git log --oneline -5
```

---

**提示**: 遇到问题时，首先尝试强制刷新浏览器 (Ctrl+Shift+R)，这能解决大部分缓存相关的问题。
