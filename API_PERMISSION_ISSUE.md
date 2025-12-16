# OKX API 权限问题说明

## 🔴 问题描述

当前系统在查询持仓数据时返回 `401 Unauthorized` 错误。

### 症状
- ✅ 账户余额查询：**正常工作**
- ❌ 持仓查询：**401 Unauthorized**
- ❌ 未实现盈亏：**无法获取**

### API测试结果

```bash
# 余额API - 成功
GET /api/v5/account/balance
返回: code=0 (成功)

# 持仓API - 失败
GET /api/v5/account/positions
返回: 401 Client Error: Unauthorized
```

---

## 🔍 根本原因

**OKX API Key 权限不足**

当前API Key仅有**部分权限**，可能只开启了：
- ✅ 读取账户余额
- ❌ 读取持仓信息 (未开启)
- ❌ 查询订单 (未开启或权限不足)

---

## ✅ 解决方案

### 方案1: 更新API Key权限（推荐）

登录OKX平台，更新现有API Key权限：

1. **登录OKX账户**
   - https://www.okx.com

2. **进入API管理**
   - 账户 → API → API管理

3. **找到您的API Key**
   - POIT账户: `8650e46c-059b-431d-93cf-55f8c79babdb`
   - JAMESYI账户: `77465009-2c87-443c-83c8-08b35c7f14b2`

4. **检查/更新权限**
   - ✅ **读取** (Read) - 必需
   - ✅ **交易** (Trade) - 建议开启
   - ❌ **提币** (Withdrawal) - 不建议开启

5. **确保以下API有权限**:
   - `/api/v5/account/balance` ✅ (已有)
   - `/api/v5/account/positions` ❌ **(需要添加)**
   - `/api/v5/trade/orders-pending` ❌ (建议添加)
   - `/api/v5/trade/orders-algo-pending` ❌ (建议添加)

---

### 方案2: 重新创建API Key

如果无法修改权限，创建新的API Key：

1. **删除旧API Key**（可选）

2. **创建新API Key**
   - 备注名称: `trading-system-full`
   - **权限选择**:
     - ✅ **读取** (必需)
     - ✅ **交易** (必需)
     - ❌ **提币** (不要勾选，安全考虑)

3. **设置API密码** (Passphrase)
   - 自己设定一个密码，记住它

4. **IP限制** (可选)
   - 测试阶段: 选择"不限制"
   - 生产环境: 添加服务器IP白名单

5. **保存新的API凭据**
   ```
   API Key: [新的API Key]
   Secret Key: [新的Secret Key]
   Passphrase: [您设置的密码]
   ```

6. **更新系统配置**
   - 编辑 `.env` 文件
   - 替换对应账户的API凭据
   - 重启后端服务

---

## 🧪 验证步骤

### 1. 命令行测试

```bash
# 测试持仓API
curl -X GET "https://8000-<your-sandbox>.sandbox.novita.ai/api/v1/positions?account_names=POIT,JAMESYI"

# 应该返回:
{
  "code": "0",
  "data": {
    "POIT": {
      "code": "0",  // ← 注意这里应该是 "0" 而不是 "-1"
      "data": [...]
    }
  }
}
```

### 2. 前端测试

刷新Dashboard页面，检查：
- ✅ 账户余额显示
- ✅ 未实现盈亏显示（之前为 $0.00）
- ✅ 持仓数量显示（之前为 0）

---

## 📋 权限对照表

| 功能 | API Endpoint | 需要权限 | POIT | JAMESYI |
|------|-------------|---------|------|---------|
| 账户余额 | `/api/v5/account/balance` | Read | ✅ | ✅ |
| 持仓信息 | `/api/v5/account/positions` | Read | ❌ | ❌ |
| 挂单查询 | `/api/v5/trade/orders-pending` | Read | ? | ? |
| 算法单查询 | `/api/v5/trade/orders-algo-pending` | Read | ? | ? |
| 下单 | `/api/v5/trade/order` | Trade | ? | ? |
| 下算法单 | `/api/v5/trade/order-algo` | Trade | ? | ? |
| 撤单 | `/api/v5/trade/cancel-order` | Trade | ? | ? |

---

## ⚠️ 重要提示

1. **API权限是分级的**
   - 不同的API endpoint需要不同的权限
   - 即使有"读取"权限，也可能某些读取API无权访问

2. **OKX的权限系统**
   - 创建API时必须明确选择权限范围
   - 某些高级功能需要特定权限组合

3. **安全建议**
   - ❌ 永远不要开启"提币"权限（用于交易系统）
   - ✅ 只开启必要的权限
   - ✅ 使用IP白名单限制访问

4. **测试建议**
   - 先用小金额测试
   - 确认所有功能正常后再加大资金

---

## 🔧 临时解决方案

在修复API权限之前，系统将显示：
- ✅ 账户余额（可用）
- ⚠️ 未实现盈亏：$0.00（API权限不足）
- ⚠️ 持仓数量：0（API权限不足）

**Dashboard会显示警告提示用户检查API权限。**

---

## 📞 需要帮助？

如果您在配置API权限时遇到问题：

1. 查阅OKX官方文档: https://www.okx.com/docs-v5/en/
2. 联系OKX客服
3. 参考系统文档: `JAMESYI_ACCOUNT_SETUP.md`

---

**最后更新**: 2024-12-16  
**影响范围**: POIT、JAMESYI 账户  
**优先级**: 🔴 高 - 影响核心功能
