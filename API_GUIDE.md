# OKX 交易系统 API 使用指南

## 概述

本文档详细说明了 OKX 交易系统的 RESTful API 接口使用方法。

**基础 URL**: `http://localhost:8000/api/v1`

**在线文档**: `http://localhost:8000/docs` (Swagger UI)

## 认证

目前系统使用环境变量配置账户，无需额外认证。所有 API 调用通过配置的账户进行操作。

## API 端点

### 1. 账户管理

#### 1.1 获取所有账户

```http
GET /api/v1/accounts
```

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "accounts": ["POIT", "ACCOUNT2"],
    "count": 2
  }
}
```

#### 1.2 获取账户余额

```http
GET /api/v1/balance?account_names=POIT&ccy=USDT
```

**参数**:
- `account_names` (可选): 逗号分隔的账户名称，留空则查询所有账户
- `ccy` (可选): 币种，如 USDT

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "code": "0",
      "data": [
        {
          "details": [
            {
              "ccy": "USDT",
              "eq": "10000.5",
              "availBal": "9000.3",
              "frozenBal": "1000.2"
            }
          ]
        }
      ]
    }
  }
}
```

#### 1.3 获取持仓信息

```http
GET /api/v1/positions?account_names=POIT&inst_type=SWAP&inst_id=BTC-USDT-SWAP
```

**参数**:
- `account_names` (可选): 账户名称
- `inst_type` (默认: SWAP): 产品类型
- `inst_id` (可选): 合约ID

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "code": "0",
      "data": [
        {
          "instId": "BTC-USDT-SWAP",
          "pos": "10",
          "posSide": "long",
          "avgPx": "45000.5",
          "upl": "500.25",
          "uplRatio": "0.0111",
          "lever": "10"
        }
      ]
    }
  }
}
```

#### 1.4 获取挂单信息

```http
GET /api/v1/pending-orders?account_names=POIT&inst_type=SWAP
```

**参数**:
- `account_names` (可选): 账户名称
- `inst_type` (默认: SWAP): 产品类型
- `inst_id` (可选): 合约ID

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "regular_orders": {
        "code": "0",
        "data": [...]
      },
      "algo_orders": {
        "code": "0",
        "data": [...]
      }
    }
  }
}
```

### 2. 交易操作

#### 2.1 下单（固定数量）

```http
POST /api/v1/order/place
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_id": "BTC-USDT-SWAP",
  "side": "buy",
  "ord_type": "market",
  "sz": "1",
  "td_mode": "cross",
  "pos_side": "long",
  "sl_trigger_px": "44000",
  "tp_trigger_px": "46000"
}
```

**参数说明**:
- `account_names` (必需): 账户名称列表
- `inst_id` (必需): 合约ID (如 BTC-USDT-SWAP)
- `side` (必需): 订单方向 (buy/sell)
- `ord_type` (必需): 订单类型 (market/limit)
- `sz` (可选): 订单数量
- `px` (可选): 限价单价格
- `td_mode` (默认: cross): 交易模式 (cross全仓/isolated逐仓)
- `pos_side` (可选): 持仓方向 (long/short，双向持仓时必填)
- `sl_trigger_px` (可选): 止损触发价
- `sl_ord_px` (可选): 止损委托价
- `tp_trigger_px` (可选): 止盈触发价
- `tp_ord_px` (可选): 止盈委托价

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "main_order": {
        "code": "0",
        "data": [
          {
            "ordId": "123456789",
            "clOrdId": ""
          }
        ]
      },
      "stop_loss": {
        "code": "0",
        "data": [...]
      },
      "take_profit": {
        "code": "0",
        "data": [...]
      }
    }
  }
}
```

#### 2.2 按比例下单

```http
POST /api/v1/order/place-by-percentage
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_id": "BTC-USDT-SWAP",
  "side": "buy",
  "percentage": 50,
  "current_price": 45000.5,
  "leverage": 10,
  "ord_type": "market",
  "td_mode": "cross",
  "sl_trigger_px": "44000",
  "tp_trigger_px": "46000"
}
```

**参数说明**:
- `percentage` (必需): 仓位比例 (10, 20, 25, 33, 50, 66, 100)
- `current_price` (必需): 当前市场价格
- `leverage` (默认: 1): 杠杆倍数
- 其他参数同 2.1

**响应格式**: 同 2.1

#### 2.3 条件单

```http
POST /api/v1/order/conditional
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_id": "BTC-USDT-SWAP",
  "side": "buy",
  "sz": "1",
  "trigger_px": "46000",
  "order_px": "-1",
  "td_mode": "cross",
  "pos_side": "long"
}
```

**参数说明**:
- `trigger_px` (必需): 触发价格
- `order_px` (默认: -1): 委托价格，-1 表示市价
- 其他参数同 2.1

#### 2.4 设置杠杆

```http
POST /api/v1/leverage/set
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_id": "BTC-USDT-SWAP",
  "lever": 10,
  "mgn_mode": "cross",
  "pos_side": "long"
}
```

**参数说明**:
- `lever` (必需): 杠杆倍数 (1-125)
- `mgn_mode` (默认: cross): 保证金模式 (cross/isolated)
- `pos_side` (可选): 持仓方向

#### 2.5 取消所有订单

```http
POST /api/v1/order/cancel-all
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_id": "BTC-USDT-SWAP"
}
```

**参数说明**:
- `account_names` (必需): 账户名称列表
- `inst_id` (可选): 合约ID，留空则取消所有合约的订单

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "regular_orders": [...],
      "algo_orders": [...]
    }
  }
}
```

### 3. 历史查询

#### 3.1 订单历史

```http
POST /api/v1/history/orders
Content-Type: application/json
```

**请求体**:
```json
{
  "account_names": ["POIT"],
  "inst_type": "SWAP",
  "inst_id": "BTC-USDT-SWAP",
  "begin": "1704067200000",
  "end": "1704153600000",
  "limit": 100
}
```

**参数说明**:
- `account_names` (可选): 账户列表，留空查询所有
- `inst_type` (默认: SWAP): 产品类型
- `inst_id` (可选): 合约ID
- `begin` (可选): 开始时间戳（毫秒）
- `end` (可选): 结束时间戳（毫秒）
- `limit` (默认: 100): 返回数量，最大100

#### 3.2 成交历史

```http
POST /api/v1/history/fills
Content-Type: application/json
```

**请求体**: 同 3.1

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "code": "0",
      "data": [
        {
          "instId": "BTC-USDT-SWAP",
          "side": "buy",
          "fillSz": "1",
          "fillPx": "45000.5",
          "fee": "-0.45",
          "pnl": "50.25",
          "ts": "1704067200000"
        }
      ]
    }
  }
}
```

#### 3.3 盈亏统计

```http
POST /api/v1/analytics/pnl
Content-Type: application/json
```

**请求体**: 同 3.1

**响应示例**:
```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "POIT": {
      "code": "0",
      "data": {
        "total_pnl": 500.25,
        "total_fee": 45.50,
        "net_pnl": 454.75,
        "trade_count": 10,
        "trades": [...]
      }
    }
  }
}
```

### 4. 行情数据

#### 4.1 获取行情

```http
GET /api/v1/market/ticker?inst_id=BTC-USDT-SWAP
```

**参数**:
- `inst_id` (必需): 合约ID

**响应示例**:
```json
{
  "code": "0",
  "data": [
    {
      "instId": "BTC-USDT-SWAP",
      "last": "45000.5",
      "high24h": "46000",
      "low24h": "44000",
      "vol24h": "100000",
      "open24h": "44500"
    }
  ]
}
```

#### 4.2 获取合约列表

```http
GET /api/v1/market/instruments?inst_type=SWAP
```

**参数**:
- `inst_type` (默认: SWAP): 产品类型

**响应示例**:
```json
{
  "code": "0",
  "data": [
    {
      "instId": "BTC-USDT-SWAP",
      "instType": "SWAP",
      "ctVal": "0.01",
      "lever": "125"
    },
    ...
  ]
}
```

## 错误处理

### 错误响应格式

```json
{
  "code": "-1",
  "msg": "Error message description",
  "data": []
}
```

### 常见错误码

- `0`: 成功
- `-1`: 通用错误
- `50000`: 参数错误
- `50001`: 账户不存在
- `50004`: API 密钥无效
- `50011`: 余额不足
- `50013`: 系统繁忙

## 使用示例

### Python 示例

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 获取账户列表
response = requests.get(f"{BASE_URL}/accounts")
print(response.json())

# 按比例下单
order_data = {
    "account_names": ["POIT"],
    "inst_id": "BTC-USDT-SWAP",
    "side": "buy",
    "percentage": 50,
    "current_price": 45000.5,
    "leverage": 10,
    "sl_trigger_px": "44000",
    "tp_trigger_px": "46000"
}
response = requests.post(
    f"{BASE_URL}/order/place-by-percentage",
    json=order_data
)
print(response.json())

# 获取持仓
response = requests.get(
    f"{BASE_URL}/positions",
    params={"account_names": "POIT"}
)
print(response.json())
```

### JavaScript 示例

```javascript
const BASE_URL = "http://localhost:8000/api/v1";

// 获取账户列表
fetch(`${BASE_URL}/accounts`)
  .then(res => res.json())
  .then(data => console.log(data));

// 下单
const orderData = {
  account_names: ["POIT"],
  inst_id: "BTC-USDT-SWAP",
  side: "buy",
  percentage: 50,
  current_price: 45000.5,
  leverage: 10,
  sl_trigger_px: "44000",
  tp_trigger_px: "46000"
};

fetch(`${BASE_URL}/order/place-by-percentage`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(orderData)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL 示例

```bash
# 获取账户列表
curl http://localhost:8000/api/v1/accounts

# 下单
curl -X POST http://localhost:8000/api/v1/order/place-by-percentage \
  -H "Content-Type: application/json" \
  -d '{
    "account_names": ["POIT"],
    "inst_id": "BTC-USDT-SWAP",
    "side": "buy",
    "percentage": 50,
    "current_price": 45000.5,
    "leverage": 10
  }'

# 获取持仓
curl "http://localhost:8000/api/v1/positions?account_names=POIT"
```

## 最佳实践

1. **错误处理**: 始终检查响应的 `code` 字段
2. **重试机制**: 对于网络错误，实现重试逻辑
3. **请求限流**: OKX API 有频率限制，注意控制请求频率
4. **日志记录**: 记录所有交易操作便于审计
5. **测试环境**: 先在测试环境验证功能
6. **异常处理**: 处理所有可能的异常情况
7. **安全性**: 不要在日志中记录敏感信息

## 技术支持

- API 文档: http://localhost:8000/docs
- 项目文档: README.md
- 部署指南: DEPLOYMENT.md
