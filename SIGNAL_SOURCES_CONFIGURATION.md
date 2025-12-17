# 信号源配置功能 (Signal Sources Configuration)

## 功能概述 (Feature Overview)

信号监控系统现已支持**自定义配置三个数据源URL**，并且修复了持仓量监控的显示逻辑。

The signal monitoring system now supports **custom configuration of three data source URLs** and fixed the panic monitor display logic.

---

## 🆕 新功能 (New Features)

### 1️⃣ 可配置的数据源 (Configurable Data Sources)

#### 配置入口 (Configuration Entry)
- **位置**: 信号监控页面顶部
- **按钮**: "配置信号源" (带设置图标)
- **快捷键**: 点击即可打开配置弹窗

#### 可配置的三个数据源 (Three Configurable Sources)

| 数据源 | 默认URL | 说明 |
|--------|---------|------|
| 持仓量监控 | `/panic` | 全网持仓量数据 |
| 交易信号 | `/query` | 交易信号数据 |
| 支撑阻力 | `/support-resistance` | 抄底/逃顶信号 |

---

## 🎯 使用方法 (How to Use)

### 步骤 1: 打开配置 (Open Settings)
1. 访问信号监控页面
2. 点击页面顶部的 **"配置信号源"** 按钮
3. 配置弹窗将自动打开

### 步骤 2: 修改URL (Modify URLs)
在配置弹窗中，你可以修改三个数据源的URL：

```
持仓量监控数据源 (Panic Monitor URL)
┌─────────────────────────────────────────────┐
│ https://your-domain.com/panic               │
└─────────────────────────────────────────────┘

交易信号数据源 (Trading Signals URL)
┌─────────────────────────────────────────────┐
│ https://your-domain.com/query               │
└─────────────────────────────────────────────┘

支撑阻力信号数据源 (Support-Resistance URL)
┌─────────────────────────────────────────────┐
│ https://your-domain.com/support-resistance  │
└─────────────────────────────────────────────┘
```

### 步骤 3: 保存配置 (Save Configuration)
1. 填写完毕后，点击 **"保存"** 按钮
2. 系统会自动：
   - 保存配置到本地存储 (localStorage)
   - 立即刷新所有三个数据源
   - 显示成功提示信息

### 步骤 4: 恢复默认 (Reset to Default)
如果需要恢复默认URL：
1. 点击 **"恢复默认"** 按钮
2. 所有URL将恢复为初始默认值
3. 点击 **"保存"** 完成恢复

---

## 💾 数据持久化 (Data Persistence)

### localStorage 存储
配置会自动保存到浏览器的 localStorage 中：

```javascript
// 存储键名
const STORAGE_KEY = 'signal_urls';

// 存储格式
{
  "panic": "https://...",
  "query": "https://...",
  "supportResistance": "https://..."
}
```

### 跨会话保持 (Cross-Session Persistence)
- ✅ 刷新页面后配置保持
- ✅ 关闭浏览器后配置保持
- ✅ 仅在清除浏览器数据时重置
- ✅ 不同浏览器独立存储

---

## 🔄 自动刷新机制 (Auto-Refresh Mechanism)

### 保存后立即刷新
修改URL并保存后，系统会：
1. 立即停止旧的定时器
2. 使用新URL请求数据
3. 重新启动定时器
4. 显示加载状态

### 各数据源刷新频率

| 数据源 | 刷新间隔 | 说明 |
|--------|----------|------|
| 持仓量监控 | **3分钟** | 之前30秒，已优化 |
| 交易信号 | 10分钟 | 保持不变 |
| 支撑阻力 | 30秒 | 保持不变 |

---

## 📊 持仓量监控优化 (Panic Monitor Improvements)

### 问题修复 (Issues Fixed)

#### 问题 1: 数据不显示
**之前**: 只有当持仓量 < 92亿时才显示数据  
**现在**: 无论持仓量多少都显示数据

#### 问题 2: 刷新频率太高
**之前**: 每30秒刷新一次  
**现在**: 每3分钟刷新一次（优化性能）

### 新的显示逻辑 (New Display Logic)

#### 持仓量 < 92亿 (Alert Mode)
```
┌─────────────────────────────────────────────┐
│ ⚠️ 预警：当前持仓量 85.6亿 < 92亿，         │
│          市场可能出现恐慌                   │
└─────────────────────────────────────────────┘
颜色：橙色背景 (#fff7e6)
边框：橙色 (#ffd591)
```

#### 持仓量 >= 92亿 (Normal Mode)
```
┌─────────────────────────────────────────────┐
│ ℹ️ 说明：当前持仓量 96.3亿，市场持仓正常   │
└─────────────────────────────────────────────┘
颜色：蓝色背景 (#e6f7ff)
边框：蓝色 (#91d5ff)
```

### 动态预警 (Dynamic Warning)
- **实时计算**: 每次数据更新时重新计算
- **颜色变化**: 根据阈值自动切换颜色
- **数值显示**: 显示实际持仓量数值
- **状态提示**: 清晰的文字说明

---

## 🛠️ 技术实现 (Technical Implementation)

### 组件状态 (Component State)

```javascript
// URL配置状态
const [urls, setUrls] = useState(() => {
  const savedUrls = localStorage.getItem('signal_urls');
  return savedUrls ? JSON.parse(savedUrls) : DEFAULT_URLS;
});

// 配置弹窗状态
const [settingsVisible, setSettingsVisible] = useState(false);

// 表单实例
const [form] = Form.useForm();
```

### 默认URL常量 (Default URLs)

```javascript
const DEFAULT_URLS = {
  panic: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/panic',
  query: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/query',
  supportResistance: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance'
};
```

### 配置保存函数 (Save Configuration)

```javascript
const handleSettingsSave = async () => {
  try {
    // 验证表单
    const values = await form.validateFields();
    
    // 更新状态
    setUrls(values);
    
    // 保存到localStorage
    localStorage.setItem('signal_urls', JSON.stringify(values));
    
    // 关闭弹窗
    setSettingsVisible(false);
    
    // 显示成功提示
    message.success('配置已保存，正在刷新数据...');
    
    // 立即刷新所有数据
    loadPanicData(true);
    loadQueryData(true);
    loadSRData(true);
  } catch (error) {
    message.error('保存失败');
  }
};
```

### 数据加载函数 (Data Loading)

```javascript
const loadPanicData = async (showLoading = true) => {
  try {
    const response = await axios.get(urls.panic);  // 使用配置的URL
    if (response.data) {
      setPanicData(response.data);  // 总是设置数据
      setPanicLastUpdate(new Date());
    }
  } catch (error) {
    console.error('Failed to load panic data:', error);
  }
};
```

### 条件预警组件 (Conditional Warning)

```javascript
{(() => {
  const openInterest = parseFloat(panicData.持仓量 || panicData.openInterest || 0);
  const isAlert = openInterest < 9200000000 && openInterest > 0;
  
  return (
    <div style={{ 
      background: isAlert ? '#fff7e6' : '#e6f7ff',
      border: isAlert ? '1px solid #ffd591' : '1px solid #91d5ff'
    }}>
      <Space>
        {isAlert ? <WarningOutlined /> : <ClockCircleOutlined />}
        <span>
          <strong>{isAlert ? '⚠️ 预警：' : 'ℹ️ 说明：'}</strong>
          {isAlert 
            ? `当前持仓量 ${formatNumber(openInterest)} < 92亿，市场可能出现恐慌` 
            : `当前持仓量 ${formatNumber(openInterest)}，市场持仓正常`
          }
        </span>
      </Space>
    </div>
  );
})()}
```

---

## 🎨 UI 组件 (UI Components)

### 配置按钮 (Settings Button)

```javascript
<Button 
  type="primary" 
  icon={<SettingOutlined />}
  onClick={handleSettingsOpen}
  size="large"
>
  配置信号源
</Button>
```

**样式**:
- 主题色按钮 (Primary)
- 设置图标
- 大尺寸
- 右对齐显示

### 配置弹窗 (Settings Modal)

```javascript
<Modal
  title="信号源配置"
  open={settingsVisible}
  onOk={handleSettingsSave}
  onCancel={() => setSettingsVisible(false)}
  width={700}
  okText="保存"
  cancelText="取消"
>
  {/* Form content */}
</Modal>
```

**特性**:
- 700px 宽度
- 垂直表单布局
- URL验证规则
- 恢复默认按钮
- 提示信息

### 表单验证 (Form Validation)

```javascript
<Form.Item
  label="持仓量监控数据源"
  name="panic"
  rules={[
    { required: true, message: '请输入URL' },
    { type: 'url', message: '请输入有效的URL' }
  ]}
>
  <Input placeholder="https://..." />
</Form.Item>
```

**验证规则**:
- ✅ 必填验证
- ✅ URL格式验证
- ✅ 实时验证反馈

---

## 📝 使用场景 (Use Cases)

### 场景 1: 更换数据源服务器
当你的数据源服务器地址变更时：
1. 打开配置
2. 更新对应的URL
3. 保存并自动刷新

### 场景 2: 开发环境切换
开发、测试、生产环境切换：
```
开发环境: http://localhost:5000/...
测试环境: https://test.example.com/...
生产环境: https://api.example.com/...
```

### 场景 3: 多数据源切换
在不同的数据提供商之间切换：
```
提供商A: https://provider-a.com/...
提供商B: https://provider-b.com/...
提供商C: https://provider-c.com/...
```

### 场景 4: API版本升级
当API升级到新版本时：
```
v1: https://api.example.com/v1/signals
v2: https://api.example.com/v2/signals
```

---

## ⚠️ 注意事项 (Important Notes)

### 1. URL格式要求
- ✅ 必须是完整的URL（包含协议）
- ✅ 支持 HTTP 和 HTTPS
- ✅ 示例：`https://example.com/api/data`
- ❌ 错误：`example.com/api/data` (缺少协议)

### 2. CORS跨域问题
确保新的数据源URL支持跨域访问（CORS）：
```javascript
// 服务端需要设置
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

### 3. 数据格式兼容性
新的数据源必须返回相同格式的数据：
- 持仓量监控：JSON对象，包含持仓量等字段
- 交易信号：JSON数组，包含14个字段
- 支撑阻力：JSON对象，包含抄底/逃顶数组

### 4. 本地存储限制
- localStorage 容量限制约 5-10MB
- 仅存储URL配置，不存储实际数据
- 清除浏览器数据会丢失配置

### 5. 安全建议
- 🔒 仅使用 HTTPS URL（生产环境）
- 🔒 不要在URL中包含敏感信息
- 🔒 验证数据源的可信度

---

## 🐛 故障排查 (Troubleshooting)

### 问题 1: 配置保存后数据不更新
**解决方案**:
1. 检查新URL是否可访问
2. 打开浏览器开发者工具查看网络请求
3. 确认CORS配置正确
4. 查看控制台错误信息

### 问题 2: 配置丢失
**解决方案**:
1. 检查是否清除了浏览器数据
2. 确认localStorage未被禁用
3. 尝试重新配置
4. 记录配置值以便恢复

### 问题 3: 持仓量数据不显示
**解决方案**:
1. 检查数据源返回的数据格式
2. 确认字段名称匹配（支持中英文）
3. 查看控制台是否有错误
4. 手动刷新数据

### 问题 4: URL验证失败
**解决方案**:
1. 确保URL包含协议（http:// 或 https://）
2. 检查URL格式是否正确
3. 避免使用特殊字符
4. 使用完整的域名或IP地址

---

## 📊 配置示例 (Configuration Examples)

### 示例 1: 本地开发环境
```json
{
  "panic": "http://localhost:5000/panic",
  "query": "http://localhost:5000/query",
  "supportResistance": "http://localhost:5000/support-resistance"
}
```

### 示例 2: 测试环境
```json
{
  "panic": "https://test-api.example.com/v1/panic",
  "query": "https://test-api.example.com/v1/query",
  "supportResistance": "https://test-api.example.com/v1/support-resistance"
}
```

### 示例 3: 生产环境
```json
{
  "panic": "https://api.trading-system.com/signals/panic",
  "query": "https://api.trading-system.com/signals/query",
  "supportResistance": "https://api.trading-system.com/signals/sr"
}
```

### 示例 4: 多子域名
```json
{
  "panic": "https://panic.signals.example.com/data",
  "query": "https://query.signals.example.com/data",
  "supportResistance": "https://sr.signals.example.com/data"
}
```

---

## 🚀 最佳实践 (Best Practices)

### 1. 配置管理
- 📝 记录所有配置变更
- 🔄 定期备份配置URL
- 🧪 在测试环境验证后再切换生产环境
- 📋 维护不同环境的URL清单

### 2. 性能优化
- ⚡ 使用CDN加速数据源
- 💾 启用数据源端的缓存
- 🔄 根据需求调整刷新频率
- 📊 监控数据源响应时间

### 3. 安全措施
- 🔐 使用HTTPS加密传输
- 🔑 实施API密钥认证（如需要）
- 🛡️ 验证数据源SSL证书
- 📋 定期审计数据源访问日志

### 4. 容错处理
- 🔄 配置备用数据源
- ⏱️ 设置合理的超时时间
- 📊 实现降级策略
- 🔔 添加数据源健康监控

---

## ✅ 功能清单 (Feature Checklist)

### 配置功能
- [x] 三个数据源URL可配置
- [x] 设置按钮在页面顶部
- [x] 配置弹窗界面
- [x] 表单验证（必填+URL格式）
- [x] 保存到localStorage
- [x] 恢复默认URL功能
- [x] 保存后立即刷新

### 持仓量监控优化
- [x] 改为3分钟刷新（180秒）
- [x] 移除显示阈值限制
- [x] 总是显示数据
- [x] 条件预警信息
- [x] 动态颜色切换
- [x] 显示实际持仓量数值

### 用户体验
- [x] 加载状态指示
- [x] 成功/失败提示
- [x] 友好的错误处理
- [x] 跨会话配置保持

---

## 📚 相关文档 (Related Documentation)

- **SIGNALS_COMPLETE_SUMMARY.md** - 完整信号系统总结
- **TRADING_SIGNALS_TABLE_UPDATE.md** - 交易信号表格更新
- **SUPPORT_RESISTANCE_SIGNALS.md** - 支撑阻力信号文档

---

**更新时间**: 2025-12-17  
**版本**: 3.0.0  
**状态**: ✅ 已完成并测试
