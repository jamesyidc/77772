# JAMESYI 账户配置说明

## ✅ 账户已添加到系统

账户 **JAMESYI** 已成功添加到交易系统中。

### 配置信息
- **账户名称**: JAMESYI (jamesyi)
- **API Key**: 86cd5cc2-d87a-49f4-97fb-d02a78835be1
- **Secret Key**: B7FE5AB683B648E266689F3E9B2DC79E
- **Passphrase**: Tencent@123
- **配置文件**: `/home/user/webapp/.env`

---

## ⚠️ 当前状态

### 系统识别
✅ **账户已在系统中识别**
- 在账户列表中可见（与POIT账户一起）
- 可以在前端选择该账户进行操作

### API连接
❌ **API认证失败**
- **错误代码**: 50119
- **错误消息**: "API key doesn't exist"
- **HTTP状态**: 401 Unauthorized

---

## 🔍 问题诊断

OKX API返回的错误表明：**API密钥不存在或无效**

### 可能的原因

#### 1. API密钥输入错误
- 复制粘贴时可能包含多余的空格
- 字符被截断或修改
- 大小写错误

#### 2. API密钥状态问题
- API密钥在OKX平台已被删除
- API密钥未激活
- API密钥已过期

#### 3. 环境不匹配
- **实盘 vs 模拟盘**
  - 实盘API: `https://www.okx.com`
  - 模拟盘API: `https://www.okx.com` (需要特殊标记)
- 当前系统配置为实盘环境

#### 4. API权限设置
虽然401通常是认证问题，但也可能是：
- API密钥权限不足
- 未开启必要的权限（读取、交易）

---

## 🛠️ 解决步骤

### 步骤 1: 登录OKX平台验证

1. 登录您的OKX账户
2. 进入 **API管理** 页面
3. 查找API Key: `86cd5cc2-d87a-49f4-97fb-d02a78835be1`
4. 确认：
   - ✅ API密钥存在且处于**激活**状态
   - ✅ API密钥未被删除或禁用
   - ✅ 权限设置包含：**读取** 和 **交易** 权限

### 步骤 2: 验证API凭据

请仔细核对以下信息：

| 字段 | 您提供的值 | 验证 |
|-----|----------|------|
| API Key | 86cd5cc2-d87a-49f4-97fb-d02a78835be1 | ⚠️ 需要确认 |
| Secret Key | B7FE5AB683B648E266689F3E9B2DC79E | ⚠️ 需要确认 |
| Passphrase | Tencent@123 | ⚠️ 需要确认 |

**注意事项**：
- API Key 通常是 UUID 格式（36字符）✅ 正确
- Secret Key 通常是32字符的十六进制 ✅ 正确
- Passphrase 是您创建API时设置的密码

### 步骤 3: 检查IP白名单

OKX API支持IP白名单限制：

1. 在OKX API管理页面查看是否启用了IP白名单
2. 如果启用了，需要添加服务器IP到白名单
3. 当前服务器可能的出口IP需要被添加

**临时解决方案**：
- 在OKX API设置中选择"不限制IP"（仅用于测试）
- 正式使用前建议配置IP白名单以提高安全性

### 步骤 4: 确认环境类型

确认您的API密钥类型：
- **实盘账户** ✅ 当前系统配置
- **模拟盘账户** ❌ 如果是模拟盘，需要修改配置

### 步骤 5: 重新生成API密钥（如果需要）

如果以上步骤都确认无误，建议：

1. 在OKX平台删除当前API密钥
2. 重新创建新的API密钥
3. 确保设置正确的权限：
   - ✅ 读取（Read）
   - ✅ 交易（Trade）
   - ❌ 提币（Withdrawal）- 不推荐开启
4. 记录新的凭据
5. 更新系统配置

---

## 📝 如何更新配置

如果需要更新API凭据：

### 方法1: 直接编辑.env文件

```bash
cd /home/user/webapp
nano .env
```

找到JAMESYI配置部分，修改为新的凭据：

```env
# OKX API Configuration - JAMESYI Account
JAMESYI_API_KEY=新的API_KEY
JAMESYI_SECRET_KEY=新的SECRET_KEY
JAMESYI_PASSPHRASE=新的密码
```

保存后重启后端：

```bash
cd /home/user/webapp
lsof -ti:8000 | xargs kill -9 2>/dev/null
nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
```

### 方法2: 通知开发者更新

提供新的凭据，开发者会帮您更新。

---

## 🧪 测试步骤

凭据更新后，执行以下测试：

```bash
# 1. 检查账户列表
curl -s http://localhost:8000/api/v1/accounts | python3 -m json.tool

# 2. 测试JAMESYI账户余额
curl -s "http://localhost:8000/api/v1/balance?account_names=JAMESYI" | python3 -m json.tool

# 3. 如果成功，应该看到类似POIT账户的余额数据
```

---

## 📱 前端使用

即使API连接有问题，JAMESYI账户仍然会在前端显示：

1. 打开前端：https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai
2. 在任何页面的账户选择器中，都可以看到：
   - POIT
   - JAMESYI
3. 选择JAMESYI后，如果API有问题，会显示错误信息

---

## 🔐 安全建议

### API密钥安全
- ❌ 不要在公开渠道分享API凭据
- ✅ 使用IP白名单限制访问
- ✅ 定期更换API密钥
- ✅ 只授予必要的权限
- ❌ 不要开启提币权限（除非必要）

### 账户安全
- ✅ 启用OKX账户的2FA（双因素认证）
- ✅ 定期检查API活动日志
- ✅ 及时删除不使用的API密钥

---

## 📞 需要帮助？

如果问题仍未解决，请提供：

1. **OKX API管理页面截图**（隐藏Secret Key）
2. **API密钥状态**（激活/禁用）
3. **API权限设置**
4. **是否启用IP白名单**
5. **账户类型**（实盘/模拟盘）

我们会进一步协助您解决问题。

---

## 📊 当前系统状态

```
✅ 后端服务: 正常运行 (Port 8000)
✅ 前端服务: 正常运行 (Port 5173)
✅ POIT账户: 连接正常，余额 $883.92 USDT
⚠️ JAMESYI账户: 系统已识别，API认证失败 (401)
```

---

**最后更新**: 2025-06-12
**配置版本**: v1.0
**系统环境**: 生产环境（实盘）
