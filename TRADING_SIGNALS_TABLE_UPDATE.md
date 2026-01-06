# Trading Signals Data Table Update (交易信号数据表格更新)

## 更新概述 (Update Overview)

交易信号数据表格已更新，现在显示完整的信号指标，包含14个字段，提供更详细的市场状态分析。

The Trading Signals Data table has been updated to display complete signal indicators with 14 fields, providing more detailed market status analysis.

---

## 📊 新表格结构 (New Table Structure)

### 表头字段 (Table Headers)

| 序号 | 字段名 | 说明 | 颜色标识 |
|------|--------|------|----------|
| 1 | 运算时间 | Signal computation timestamp | 灰色 (Gray) |
| 2 | 急涨 | Sharp rise count | 绿色 (Green if > 0) |
| 3 | 急跌 | Sharp fall count | 红色 (Red if > 0) |
| 4 | 本轮急涨 | Current round sharp rise | 绿色加粗 (Bold Green if > 0) |
| 5 | 本轮急跌 | Current round sharp fall | 红色加粗 (Bold Red if > 0) |
| 6 | 计次 | Count total | 默认色 (Default) |
| 7 | 计次得分 | Count score (★ rating) | 默认色 (Default) |
| 8 | 状态 | Market status | 标签颜色 (Tag Color) |
| 9 | 比值 | Ratio value | 默认色 (Default) |
| 10 | 差值 | Difference value | 颜色根据正负 (Green/Red by value) |
| 11 | 比价最低 | Lowest price ratio | 默认色 (Default) |
| 12 | 比价创新高 | New high price ratio | 默认色 (Default) |
| 13 | 24h涨≥10% | 24h rise ≥10% count | 绿色 (Green if > 0) |
| 14 | 24h跌≤-10% | 24h fall ≤-10% count | 红色 (Red if > 0) |

---

## 🎨 颜色编码规则 (Color Coding Rules)

### 涨跌指标 (Rise/Fall Indicators)
```javascript
// 急涨、本轮急涨、24h涨≥10%
color: value > 0 ? '#52c41a' : '#666'  // Green if positive

// 急跌、本轮急跌、24h跌≤-10%
color: value > 0 ? '#ff4d4f' : '#666'  // Red if positive
```

### 状态标签 (Status Tag)
```javascript
震荡无序 (Volatile) -> Orange Tag
急涨 (Sharp Rise) -> Green Tag
急跌 (Sharp Fall) -> Red Tag
其他 (Others) -> Default Tag
```

### 差值显示 (Difference Value)
```javascript
差值 > 0  -> Green (Bold)
差值 < 0  -> Red (Bold)
差值 = 0  -> Gray (Normal)
```

### 本轮急涨/急跌 (Current Round)
```javascript
// 加粗显示，更突出
fontWeight: 'bold'
```

---

## 📋 数据示例 (Data Example)

### 完整数据格式 (Complete Data Format)
```json
{
  "运算时间": "2025-12-17 10:24:00",
  "急涨": 2,
  "急跌": 2,
  "本轮急涨": 2,
  "本轮急跌": 2,
  "计次": 6,
  "计次得分": "★★★",
  "状态": "震荡无序",
  "比值": "",
  "差值": 0,
  "比价最低": 0,
  "比价创新高": 0,
  "24h涨≥10%": 0,
  "24h跌≤-10%": 0
}
```

### 英文字段映射 (English Field Mapping)
```javascript
const fieldMapping = {
  "运算时间": "timestamp" || "time" || "运算时间",
  "急涨": "sharpRise" || "急涨",
  "急跌": "sharpFall" || "急跌",
  "本轮急涨": "currentRoundRise" || "本轮急涨",
  "本轮急跌": "currentRoundFall" || "本轮急跌",
  "计次": "countTotal" || "计次",
  "计次得分": "countScore" || "计次得分",
  "状态": "status" || "状态",
  "比值": "ratio" || "比值",
  "差值": "difference" || "差值",
  "比价最低": "lowestRatio" || "比价最低",
  "比价创新高": "newHighRatio" || "比价创新高",
  "24h涨≥10%": "rise10Percent" || "24h涨≥10%",
  "24h跌≤-10%": "fall10Percent" || "24h跌≤-10%"
};
```

---

## 🔄 数据更新机制 (Data Update Mechanism)

### 刷新频率 (Refresh Frequency)
- **自动刷新**: 每10分钟 (Every 10 minutes)
- **手动刷新**: 点击刷新按钮 (Click refresh button)

### 数据排序 (Data Sorting)
- **最新在前**: 最新的数据显示在最上面
- **数量限制**: 仅保留最近10条记录

```javascript
// Latest 10 records, newest first
const latestRecords = response.data.slice(0, 10);
```

### 显示逻辑 (Display Logic)
```javascript
// If response.data is array
if (Array.isArray(response.data)) {
  const latestRecords = response.data.slice(0, 10);
  setQueryData(latestRecords);
}

// If response.data.data is array
else if (response.data.data && Array.isArray(response.data.data)) {
  const latestRecords = response.data.data.slice(0, 10);
  setQueryData(latestRecords);
}
```

---

## 💻 UI/UX 特性 (UI/UX Features)

### 表格宽度 (Table Width)
- **最小宽度**: 1400px
- **水平滚动**: 启用
- **自定义滚动条**: 优化视觉效果

### 响应式设计 (Responsive Design)
```css
.query-content {
  max-width: 100%;
  overflow-x: auto;
  position: relative;
}

/* 横向滚动时保持表头可见 */
minWidth: '1400px'
```

### 滚动条样式 (Scrollbar Styling)
```css
.query-content::-webkit-scrollbar {
  height: 8px;
}

.query-content::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.query-content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

.query-content::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
```

### 字体大小 (Font Size)
```javascript
fontSize: '13px'  // Reduced for better fit
```

---

## 📱 移动端适配 (Mobile Adaptation)

### 小屏幕优化 (Small Screen Optimization)
- 水平滚动查看所有列
- 固定表头便于对比
- 触摸友好的滚动体验

### 触摸滚动 (Touch Scrolling)
```css
-webkit-overflow-scrolling: touch;
```

---

## 🎯 状态说明 (Status Descriptions)

### 状态类型 (Status Types)

| 状态 | 含义 | 颜色 | 说明 |
|------|------|------|------|
| 震荡无序 | Volatile | 橙色 | 市场无明确方向 |
| 急涨 | Sharp Rise | 绿色 | 强烈上涨信号 |
| 急跌 | Sharp Fall | 红色 | 强烈下跌信号 |
| 盘整 | Consolidation | 蓝色 | 横盘整理 |
| 上涨 | Rising | 浅绿 | 温和上涨 |
| 下跌 | Falling | 浅红 | 温和下跌 |

---

## 📊 计次得分说明 (Count Score Description)

### 星级评分 (Star Rating)
- **★**: 弱信号 (Weak signal)
- **★★**: 中等信号 (Medium signal)
- **★★★**: 强信号 (Strong signal)
- **★★★★**: 很强信号 (Very strong signal)
- **★★★★★**: 极强信号 (Extremely strong signal)

---

## 🔍 字段详细说明 (Field Descriptions)

### 1. 运算时间 (Computation Time)
- **格式**: YYYY-MM-DD HH:mm:ss
- **用途**: 标识信号生成时间
- **排序**: 最新的在最前

### 2. 急涨/急跌 (Sharp Rise/Fall)
- **数值**: 整数计数
- **含义**: 检测到的急剧价格变动次数
- **颜色**: 绿色(涨) / 红色(跌)

### 3. 本轮急涨/急跌 (Current Round Rise/Fall)
- **数值**: 整数计数
- **含义**: 当前周期内的急剧变动次数
- **重要性**: 比总计更具时效性
- **显示**: 加粗字体

### 4. 计次/计次得分 (Count/Score)
- **计次**: 信号触发总次数
- **得分**: 星级评分系统
- **用途**: 评估信号可靠性

### 5. 状态 (Status)
- **类型**: 分类标签
- **显示**: 带颜色的Tag组件
- **含义**: 当前市场整体状态

### 6. 比值/差值 (Ratio/Difference)
- **比值**: 价格比率指标
- **差值**: 价格差异指标
- **颜色**: 差值根据正负着色

### 7. 比价最低/创新高 (Lowest/New High)
- **数值**: 布尔值 (0/1)
- **含义**: 价格位置标识
- **用途**: 识别极值点位

### 8. 24h涨跌统计 (24h Rise/Fall Stats)
- **涨≥10%**: 大幅上涨币种数量
- **跌≤-10%**: 大幅下跌币种数量
- **用途**: 市场整体情绪判断

---

## 🛠️ 技术实现 (Technical Implementation)

### 表格布局 (Table Layout)
```javascript
gridTemplateColumns: '140px 60px 60px 80px 80px 60px 60px 80px 60px 60px 60px 100px 100px 80px 80px'
```

### 动态颜色 (Dynamic Coloring)
```javascript
// 急涨指标
style={{ 
  color: item.急涨 > 0 ? '#52c41a' : '#666' 
}}

// 本轮急涨 (加粗)
style={{ 
  color: item.本轮急涨 > 0 ? '#52c41a' : '#666',
  fontWeight: 'bold' 
}}

// 差值 (根据正负)
style={{ 
  color: item.差值 > 0 ? '#52c41a' : item.差值 < 0 ? '#ff4d4f' : '#666',
  fontWeight: item.差值 !== 0 ? 'bold' : 'normal'
}}
```

### 状态标签 (Status Tag)
```javascript
<Tag color={
  item.状态 === '震荡无序' ? 'orange' :
  item.状态 === '急涨' ? 'green' :
  item.状态 === '急跌' ? 'red' : 'default'
}>
  {item.状态 || '-'}
</Tag>
```

### 空值处理 (Null Handling)
```javascript
{item.急涨 ?? '-'}  // Nullish coalescing operator
```

---

## 📈 使用场景 (Use Cases)

### 1. 快速市场判断
- 查看"状态"列快速了解市场情绪
- 观察"本轮急涨/急跌"判断当前趋势

### 2. 信号强度评估
- 查看"计次得分"评估信号可靠性
- 星级越高，信号越强

### 3. 市场极值监控
- "比价最低"标识潜在买入机会
- "比价创新高"标识潜在卖出机会

### 4. 整体市场情绪
- "24h涨≥10%"数量多 → 市场乐观
- "24h跌≤-10%"数量多 → 市场悲观

### 5. 短期波动跟踪
- "急涨/急跌"追踪短期剧烈波动
- "差值"监控价差变化

---

## 🔧 自定义配置 (Customization)

### 修改显示列数 (Change Column Count)
修改 `gridTemplateColumns` 的值以调整列宽：
```javascript
gridTemplateColumns: '140px 60px 60px ...'  // 调整每列宽度
```

### 修改颜色主题 (Change Color Theme)
```javascript
// 上涨颜色
const riseColor = '#52c41a';  // 改为其他颜色

// 下跌颜色  
const fallColor = '#ff4d4f';  // 改为其他颜色
```

### 修改字体大小 (Change Font Size)
```javascript
fontSize: '13px'  // 改为其他大小
```

### 修改滚动条样式 (Change Scrollbar Style)
在 `Signals.css` 中修改：
```css
.query-content::-webkit-scrollbar {
  height: 8px;  /* 改为其他高度 */
}
```

---

## ⚠️ 注意事项 (Important Notes)

### 1. 数据源要求
数据源必须返回包含所有14个字段的数组：
```json
[
  {
    "运算时间": "...",
    "急涨": 0,
    // ... 其他12个字段
  }
]
```

### 2. 字段支持中英文
代码支持中英文字段名，会自动fallback：
```javascript
item.急涨 || item.sharpRise || 0
```

### 3. 空值显示为 "-"
使用空值合并运算符 `??` 确保空值显示为 `-`

### 4. 横向滚动
表格宽度超过容器时会出现横向滚动条

### 5. 最新记录在上
数据总是按时间倒序显示（最新的在最上面）

---

## 🐛 故障排查 (Troubleshooting)

### 表格不显示数据
1. 检查数据源是否返回数组
2. 验证字段名是否匹配
3. 查看浏览器控制台错误
4. 确认网络请求成功

### 颜色不正确
1. 检查字段值类型（应为数字）
2. 验证条件判断逻辑
3. 查看CSS是否正确加载

### 滚动条不显示
1. 确认表格宽度超过容器
2. 检查CSS是否正确应用
3. 验证overflow-x设置

### 数据顺序错误
1. 确认数据源返回顺序
2. 检查slice(0, 10)是否正确
3. 验证时间字段格式

---

## 📚 相关文档 (Related Documentation)

- **SIGNALS_COMPLETE_SUMMARY.md** - 完整信号系统总结
- **SIGNALS_FEATURE.md** - 信号功能详细文档
- **SIGNALS_REDESIGN.md** - 信号页面重构文档

---

## ✅ 更新清单 (Update Checklist)

- [x] 添加14个字段显示
- [x] 实现颜色编码规则
- [x] 状态标签样式化
- [x] 横向滚动支持
- [x] 自定义滚动条样式
- [x] 最新记录在上
- [x] 10分钟自动刷新
- [x] 仅保留10条记录
- [x] 空值处理
- [x] 响应式布局
- [x] 中英文字段兼容

---

**更新时间**: 2025-12-17  
**版本**: 2.0.0  
**状态**: ✅ 已完成并测试
