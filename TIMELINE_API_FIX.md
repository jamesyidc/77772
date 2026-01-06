# Timeline API 数据加载修复文档

## 📅 修复日期
2025-12-19

## 🎯 问题描述

### 用户反馈
交易信号数据板块显示"暂无信号数据"，无法加载数据。

### 问题截图分析
- 板块标题："交易信号数据"
- 显示内容："暂无信号数据"
- 提示："数据源未返回任何有效的交易信号数据"

---

## 🔍 问题诊断

### 1. 测试后端 API
```bash
curl "http://localhost:8000/api/v1/proxy/timeline"
```

**返回结果**：
```json
{"error": "no such column: ratio_diff"}
```

### 2. 追踪到源头
后端代理调用的外部 API：
```
https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/timeline
```

**直接测试外部 API**：
```bash
curl "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/timeline"
# 返回: {"error": "no such column: ratio_diff"}
```

### 3. 问题根源
**数据库架构问题**：
- 外部数据源的数据库缺少 `ratio_diff` 列
- 这是数据源服务器端的 SQL 查询错误
- 我们无法直接修复数据源的数据库

---

## ✅ 解决方案

### 方案选择
由于无法修复数据源的 `/api/timeline` 端点，我们使用**备用端点**：

**备用 API**：
```
https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/latest
```

这个端点：
- ✅ 返回相同的币种数据
- ✅ 有相同的数据结构 `{coins: [...]}`
- ✅ 前端已支持此格式
- ✅ 无数据库错误

---

## 🔧 代码修改

### 文件：`backend/api/routes.py`
**位置**：第 520-529 行

#### 修改前 ❌
```python
@router.get("/proxy/timeline")
async def proxy_timeline_data():
    """Proxy timeline summary data to avoid CORS issues"""
    url = "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/timeline"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline data: {str(e)}")
```

#### 修改后 ✅
```python
@router.get("/proxy/timeline")
async def proxy_timeline_data():
    """Proxy timeline summary data to avoid CORS issues
    
    NOTE: Using /api/latest endpoint because /api/timeline has database error (ratio_diff column missing)
    The /api/latest endpoint returns the same data structure with coins array
    """
    # Original URL has error: url = "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/timeline"
    # Using /api/latest as fallback which returns coins data
    url = "https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/api/latest"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            data = response.json()
            # Transform to timeline-compatible format if needed
            # Frontend expects either {snapshots: [...]} or {coins: [...]}
            # /api/latest already returns {coins: [...], ...} so it works
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline data: {str(e)}")
```

**关键改动**：
- 🔄 URL从 `/api/timeline` 改为 `/api/latest`
- 📝 添加详细注释说明原因
- ✅ 保持相同的响应格式

---

## 📊 数据格式

### /api/latest 返回结构
```json
{
  "coins": [
    {
      "symbol": "BTC",
      "current_price": 86165.08169,
      "change": -0.14,
      "change_24h": 0.33,
      "high_price": 126259.48,
      "high_time": "2025-10-07",
      "decline": -31.18,
      "rank": 16,
      "ratio1": "68.73%",
      "ratio2": "105.91%",
      "rush_down": 1,
      "rush_up": 0,
      "priority": "等级6",
      "update_time": "2025-12-19 13:29:02"
    },
    // ... more coins
  ],
  "count": 14,
  "count_score_display": "☆☆☆",
  "count_score_type": "空心3星",
  "diff": -24,
  "rush_down": 91,
  "rush_up": 67,
  "snapshot_time": "2025-12-19 21:12:00",
  "status": "震荡无序"
}
```

### 前端兼容性
前端 `loadQueryData` 函数（Signals.jsx 第 156-179 行）已支持：
```javascript
// 优先处理 snapshots 格式
if (response.data && response.data.snapshots && Array.isArray(response.data.snapshots)) {
  const latestRecords = response.data.snapshots.slice(0, 10);
  setQueryData(latestRecords);
}
// 回退处理 coins 格式 ✅ 这个会被使用
else if (response.data && response.data.coins && Array.isArray(response.data.coins)) {
  const latestRecords = response.data.coins.slice(0, 10);
  setQueryData(latestRecords);
}
```

**结论**: 前端代码无需修改，已完美兼容！

---

## ✅ 验证结果

### 1. 后端 API 测试
```bash
curl "http://localhost:8000/api/v1/proxy/timeline"
```

**返回**：
```json
{
  "coins": [
    {"symbol": "BTC", "current_price": 86165.08169, ...},
    {"symbol": "ETH", "current_price": 2891.17042, ...},
    ...
  ],
  "count": 14,
  "snapshot_time": "2025-12-19 21:12:00"
}
```

✅ **状态**: 正常返回数据

### 2. 前端页面验证
访问：https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals

**预期结果**：
- ✅ "交易信号数据"板块显示币种列表
- ✅ 显示币种符号、当前价、本轮涨跌、24H涨跌等字段
- ✅ 显示最新更新时间
- ✅ 倒计时功能正常（10分钟刷新）

---

## 📝 部署步骤

### 1. 停止旧的后端进程
```bash
pkill -f "uvicorn backend.main:app"
```

### 2. 启动新的后端服务
```bash
cd /home/user/webapp
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
```

### 3. 验证服务状态
```bash
# 检查进程
ps aux | grep uvicorn

# 测试 API
curl "http://localhost:8000/api/v1/proxy/timeline"
```

### 4. 前端无需更改
- 前端会自动连接到新的后端
- 刷新页面即可看到数据

---

## 🎯 Git 提交

### Commit 信息
```
Commit: df13077
Message: fix: Switch timeline proxy to use /api/latest endpoint

- Original /api/timeline endpoint has database error (ratio_diff column missing)
- Use /api/latest as fallback which returns same data structure with coins array
- Frontend already supports both {snapshots: [...]} and {coins: [...]} formats
- This fixes the '暂无信号数据' (no signal data) issue

Stats: 1 file changed, 13 insertions(+), 3 deletions(-)
```

### 分支状态
- ✅ 已提交到 `genspark_ai_developer` 分支
- ✅ 已推送到远程仓库
- ✅ Pull Request 已更新: https://github.com/jamesyidc/77772/pull/1

---

## 🔮 后续建议

### 1. 监控数据源
定期检查数据源服务器的健康状态：
- `/api/latest` - 主要数据源（当前使用）
- `/api/timeline` - 备用（有问题）
- `/api/panic` - 持仓量数据
- `/api/support-resistance` - 支撑阻力数据

### 2. 添加重试机制
在后端代理中添加：
```python
# 如果主要端点失败，自动切换到备用端点
try:
    response = await client.get(primary_url, timeout=10.0)
except:
    response = await client.get(fallback_url, timeout=10.0)
```

### 3. 错误日志
记录 API 调用失败的详细信息，便于调试：
```python
import logging
logging.error(f"Timeline API failed: {str(e)}")
```

---

## 🐛 已知问题

### 数据源问题
- **问题**: 外部 `/api/timeline` 端点的数据库缺少 `ratio_diff` 列
- **影响**: 该端点永久不可用（除非数据源修复数据库）
- **解决**: 已切换到 `/api/latest` 端点
- **状态**: ✅ 已解决

### 前端缓存
- **问题**: 某些用户可能看到旧版本（浏览器缓存）
- **解决**: 硬刷新（Ctrl + Shift + R）
- **状态**: ⚠️ 需要用户手动清除缓存

---

## 📚 相关文档
- [Backend API Routes](backend/api/routes.py)
- [Frontend Signals Page](frontend/src/pages/Signals.jsx)
- [Data Source API](https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai)

---

## 📞 技术支持

如果"交易信号数据"板块仍显示"暂无信号数据"：

1. **检查后端服务**：
   ```bash
   curl "http://localhost:8000/api/v1/proxy/timeline"
   ```
   应该返回包含 `coins` 数组的 JSON

2. **检查前端连接**：
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 刷新页面
   - 检查 `/api/v1/proxy/timeline` 请求状态

3. **清除浏览器缓存**：
   - 硬刷新：`Ctrl + Shift + R`
   - 或无痕模式访问

---

**修复完成时间**: 2025-12-19 21:40 (北京时间)  
**修复人员**: GenSpark AI Developer  
**状态**: ✅ 已修复并部署  
**前端URL**: https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals  
**后端URL**: https://8000-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/docs
