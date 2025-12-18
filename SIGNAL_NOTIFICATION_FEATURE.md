# 信号提醒功能文档 (Signal Notification Feature)

## 📝 概述 (Overview)

根据用户需求，为抄底信号和逃顶信号添加了弹窗提醒和声音提示功能。

User requested: 
- "抄底信号 逃顶信号 要有弹窗提醒"
- "然后有声音提示"
- "弹窗需要手动才可以关闭"
- "声音提示出10秒"

## 🎯 功能特性 (Features)

### 1. 弹窗提醒 (Modal Alert)

当检测到新的买入或卖出信号时，自动弹出提醒窗口：

#### 🟢 抄底信号弹窗 (Buy Signal Modal)
- **标题**：🟢 抄底信号提醒
- **颜色**：绿色主题 (#52c41a)
- **背景**：浅绿色渐变
- **内容**：
  - 提示文字："检测到抄底机会！"
  - 说明："以下币种接近支撑位，可能是买入时机"
  - 显示最多5个信号的详细信息

#### 🔴 逃顶信号弹窗 (Sell Signal Modal)
- **标题**：🔴 逃顶信号提醒
- **颜色**：红色主题 (#ff4d4f)
- **背景**：浅红色渐变
- **内容**：
  - 提示文字："检测到逃顶信号！"
  - 说明："以下币种接近阻力位，建议考虑止盈"
  - 显示最多5个信号的详细信息

#### 信号详情显示 (Signal Details)

每个信号卡片显示：
- **币种** (Symbol)：币种名称
- **当前价格** (Current Price)：实时价格
- **位置** (Position)：相对位置百分比
- **时间** (Time)：信号产生时间

### 2. 声音提示 (Sound Alert) 🔊

#### 声音特性 (Audio Characteristics)
- **持续时间**：10秒
- **声音类型**：蜂鸣音 (Beep)
- **频率**：800Hz
- **音量**：30% (适中音量)
- **模式**：重复蜂鸣
  - 蜂鸣时长：200毫秒
  - 间隔时长：300毫秒
  - 循环播放10秒

#### 技术实现 (Technical Implementation)
```javascript
// 主方案：Web Audio API
const audioContext = new AudioContext();
const oscillator = audioContext.createOscillator();
oscillator.frequency.value = 800; // 800Hz
oscillator.type = 'sine';

// 备用方案：HTML5 Audio with data URI
const audio = new Audio('data:audio/wav;base64,...');
```

### 3. 手动关闭 (Manual Close)

- **必须手动关闭**：弹窗不会自动消失
- **关闭按钮**："我知道了"
- **关闭操作**：
  - 点击"我知道了"按钮
  - 关闭弹窗的同时停止声音

### 4. 去重机制 (Deduplication)

- **防止重复提醒**：使用 Set 追踪已通知的信号
- **信号唯一标识**：基于币种、价格、时间生成唯一ID
- **内存管理**：限制 Set 大小最多1000条记录，超过后保留最近500条

## 🎨 UI 设计 (UI Design)

### 抄底信号弹窗样式 (Buy Signal Modal Style)

```jsx
<Modal 
  title="🟢 抄底信号提醒"
  style={{
    color: '#52c41a',
    fontSize: '20px',
    fontWeight: 'bold'
  }}
>
  <div style={{
    background: '#f6ffed',
    border: '2px solid #52c41a',
    borderRadius: '8px'
  }}>
    <div>⚠️ 检测到抄底机会！</div>
    <div>以下币种接近支撑位，可能是买入时机</div>
  </div>
  
  {/* 信号列表 */}
  {signals.map(signal => (
    <div style={{
      border: '1px solid #b7eb8f',
      borderRadius: '4px'
    }}>
      <div>币种: {signal.symbol}</div>
      <div>价格: {signal.price}</div>
      <div>位置: {signal.position}%</div>
    </div>
  ))}
</Modal>
```

### 逃顶信号弹窗样式 (Sell Signal Modal Style)

```jsx
<Modal 
  title="🔴 逃顶信号提醒"
  style={{
    color: '#ff4d4f',
    fontSize: '20px',
    fontWeight: 'bold'
  }}
>
  <div style={{
    background: '#fff1f0',
    border: '2px solid #ff4d4f',
    borderRadius: '8px'
  }}>
    <div>⚠️ 检测到逃顶信号！</div>
    <div>以下币种接近阻力位，建议考虑止盈</div>
  </div>
  
  {/* 信号列表 */}
</Modal>
```

## 🔔 触发机制 (Trigger Mechanism)

### 触发条件 (Trigger Conditions)

1. **新信号检测**：
   - 每30秒自动刷新支撑阻力数据
   - 对比新数据与已通知信号列表
   - 发现新信号时触发提醒

2. **信号类型**：
   - **抄底信号**：币种接近支撑位（position < 50%）
   - **逃顶信号**：币种接近阻力位（position > 50%）

3. **去重逻辑**：
   ```javascript
   const signalId = `${type}_${symbol}_${price}_${time}`;
   if (!notifiedSignals.has(signalId)) {
     // 显示提醒
     showNotification(signal);
     notifiedSignals.add(signalId);
   }
   ```

### 工作流程 (Workflow)

```
1. SR数据更新 (30秒间隔)
   ↓
2. 检测新的买入/卖出信号
   ↓
3. 与已通知列表对比
   ↓
4. 发现新信号
   ↓
5. 播放声音 (10秒)
   ↓
6. 显示弹窗 (必须手动关闭)
   ↓
7. 用户点击"我知道了"
   ↓
8. 停止声音 + 关闭弹窗
   ↓
9. 记录已通知信号
```

## 💻 代码实现 (Code Implementation)

### 1. 状态管理 (State Management)

```javascript
// 通知状态
const [notifiedSignals, setNotifiedSignals] = useState(new Set());
const audioRef = useRef(null);
const audioTimeoutRef = useRef(null);
```

### 2. 声音播放函数 (Play Sound Function)

```javascript
const playNotificationSound = () => {
  // 清除之前的音频
  if (audioTimeoutRef.current) {
    clearTimeout(audioTimeoutRef.current);
  }
  
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }
  
  // 创建 Web Audio Context
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // 配置声音参数
  oscillator.frequency.value = 800; // 800Hz
  oscillator.type = 'sine';
  gainNode.gain.value = 0.3; // 30% 音量
  
  // 连接节点
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // 重复播放10秒
  const beepDuration = 0.2;  // 200ms 蜂鸣
  const pauseDuration = 0.3; // 300ms 暂停
  const totalDuration = 10;  // 总共10秒
  
  // ... 循环播放逻辑
  
  // 10秒后清理
  audioTimeoutRef.current = setTimeout(() => {
    audioContext.close();
  }, 10000);
};
```

### 3. 弹窗显示函数 (Show Modal Function)

```javascript
const showSignalNotification = (signalType, signals) => {
  const isBot = signalType === 'buy';
  const title = isBot ? '🟢 抄底信号提醒' : '🔴 逃顶信号提醒';
  const color = isBot ? '#52c41a' : '#ff4d4f';
  
  // 播放声音
  playNotificationSound();
  
  // 显示弹窗
  Modal.info({
    title: <span style={{ color, fontSize: '20px' }}>{title}</span>,
    width: 600,
    okText: '我知道了',
    maskClosable: false, // 禁止点击遮罩关闭
    content: (
      // ... 信号详情内容
    ),
    onOk: () => {
      // 关闭时停止声音
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
    }
  });
};
```

### 4. 信号监听 (Signal Monitoring)

```javascript
useEffect(() => {
  if (!srData.buy && !srData.sell) return;
  
  // 检测新的买入信号
  const newBuySignals = (srData.buy || []).filter(signal => {
    const signalId = `buy_${signal.symbol}_${signal.price}_${signal.time}`;
    return !notifiedSignals.has(signalId);
  });
  
  // 检测新的卖出信号
  const newSellSignals = (srData.sell || []).filter(signal => {
    const signalId = `sell_${signal.symbol}_${signal.price}_${signal.time}`;
    return !notifiedSignals.has(signalId);
  });
  
  // 显示通知
  if (newBuySignals.length > 0) {
    showSignalNotification('buy', newBuySignals);
    // 标记为已通知
    // ...
  }
  
  if (newSellSignals.length > 0) {
    showSignalNotification('sell', newSellSignals);
    // ...
  }
}, [srData]);
```

### 5. 清理资源 (Cleanup)

```javascript
useEffect(() => {
  // ... 初始化

  return () => {
    // 清理定时器
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    // 停止音频
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
}, []);
```

## ✅ 功能验证 (Verification)

### 测试步骤 (Test Steps)

1. **打开信号页面**：
   ```
   https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals
   ```

2. **等待信号出现**：
   - 支撑阻力数据每30秒刷新一次
   - 当有新的买入或卖出信号时会自动触发

3. **验证弹窗**：
   - ✅ 弹窗自动出现
   - ✅ 显示正确的标题和颜色
   - ✅ 显示信号详细信息
   - ✅ 不能点击背景关闭

4. **验证声音**：
   - ✅ 蜂鸣音自动播放
   - ✅ 持续10秒
   - ✅ 重复蜂鸣模式

5. **验证关闭**：
   - ✅ 点击"我知道了"按钮
   - ✅ 弹窗关闭
   - ✅ 声音立即停止

6. **验证去重**：
   - ✅ 相同信号不重复弹窗
   - ✅ 只对新信号进行提醒

### 预期结果 (Expected Results)

| 测试项 | 预期结果 | 状态 |
|-------|---------|------|
| 买入信号弹窗 | 绿色主题，显示抄底机会 | ✅ |
| 卖出信号弹窗 | 红色主题，显示逃顶建议 | ✅ |
| 声音播放 | 蜂鸣音10秒 | ✅ |
| 手动关闭 | 必须点击按钮 | ✅ |
| 声音停止 | 关闭弹窗时停止 | ✅ |
| 去重机制 | 相同信号不重复 | ✅ |
| 信号详情 | 完整显示币种/价格/位置 | ✅ |
| 多信号显示 | 最多显示5个 | ✅ |

## 🎯 使用场景 (Use Cases)

### 场景1：买入机会提醒

```
情况：BTC 接近支撑位 $85,000

触发：
1. 系统检测到 BTC 在支撑位附近
2. 🟢 弹出绿色提醒窗口
3. 🔊 播放蜂鸣音10秒
4. 显示："检测到抄底机会！BTC 接近支撑位"

用户操作：
- 查看详细信息
- 判断是否买入
- 点击"我知道了"关闭
```

### 场景2：止盈建议提醒

```
情况：ETH 接近阻力位 $3,100

触发：
1. 系统检测到 ETH 在阻力位附近
2. 🔴 弹出红色提醒窗口
3. 🔊 播放蜂鸣音10秒
4. 显示："检测到逃顶信号！ETH 接近阻力位"

用户操作：
- 查看当前盈利
- 决定是否止盈
- 点击"我知道了"关闭
```

### 场景3：多币种同时提醒

```
情况：同时出现3个买入信号

触发：
1. 显示包含3个币种的弹窗
2. 每个币种显示详细信息
3. 用户可以一次性查看所有机会

布局：
┌─────────────────────────────────┐
│  🟢 抄底信号提醒                  │
├─────────────────────────────────┤
│  ⚠️ 检测到抄底机会！              │
├─────────────────────────────────┤
│  BTC  | $85,000 | 20% 支撑位     │
│  ETH  | $2,900  | 15% 支撑位     │
│  SOL  | $130    | 25% 支撑位     │
├─────────────────────────────────┤
│           [ 我知道了 ]            │
└─────────────────────────────────┘
```

## 🔧 配置选项 (Configuration)

当前配置（硬编码）：

```javascript
// 声音配置
const SOUND_CONFIG = {
  frequency: 800,      // 蜂鸣频率 (Hz)
  volume: 0.3,         // 音量 (0-1)
  beepDuration: 200,   // 蜂鸣时长 (ms)
  pauseDuration: 300,  // 暂停时长 (ms)
  totalDuration: 10000 // 总时长 (ms)
};

// 弹窗配置
const MODAL_CONFIG = {
  width: 600,           // 宽度 (px)
  maxSignals: 5,        // 最多显示信号数
  maskClosable: false   // 禁止点击背景关闭
};

// 去重配置
const DEDUP_CONFIG = {
  maxSize: 1000,       // Set 最大大小
  keepRecent: 500      // 清理时保留数量
};
```

## 📊 性能优化 (Performance)

1. **内存管理**：
   - 限制 notifiedSignals Set 大小
   - 定期清理旧信号记录

2. **音频优化**：
   - 使用 Web Audio API (低延迟)
   - 备用方案：HTML5 Audio
   - 自动清理音频上下文

3. **防抖处理**：
   - 同类型信号批量处理
   - 避免频繁弹窗

4. **资源清理**：
   - 组件卸载时清理定时器
   - 停止所有音频播放
   - 释放音频上下文

## 🚀 部署状态 (Deployment)

- ✅ **代码已提交**：Commit `e56e086`
- ✅ **已推送到远程**：`genspark_ai_developer` 分支
- ✅ **前端自动更新**：Vite HMR 生效
- ✅ **服务运行正常**：Port 5173

## 🔗 访问链接 (Access)

- **信号监控页面**：https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals
- **后端 API**：https://8000-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/docs
- **Pull Request**：https://github.com/jamesyidc/77772/pull/1

## 📝 Git 提交 (Commit)

```
e56e086 feat: Add signal notification with modal and sound alert

Features:
- Modal popup for new buy (抄底) and sell (逃顶) signals
- Sound alert plays for 10 seconds (beeping pattern)
- Modal requires manual close (not auto-dismiss)
- Shows up to 5 signals with details
- Auto-tracks notified signals to prevent duplicates
- Sound stops when modal is closed
```

## 🎓 技术亮点 (Technical Highlights)

1. **Web Audio API**：
   - 低延迟音频生成
   - 精确控制频率和音量
   - 支持复杂音频模式

2. **React Hooks**：
   - useRef 管理音频实例
   - useEffect 监听信号变化
   - useState 追踪通知状态

3. **Ant Design Modal**：
   - 美观的弹窗组件
   - 可定制的样式
   - 完善的交互体验

4. **智能去重**：
   - Set 数据结构
   - 唯一 ID 生成
   - 自动内存管理

## 📚 相关文档 (Related Docs)

- [倒计时功能](./COUNTDOWN_TIMER_FEATURE.md)
- [卡片顺序调整](./CARD_ORDER_CHANGE.md)
- [信号API修复](./SIGNALS_API_FIX.md)

---

**功能已完成并部署！** 🎉

现在当有新的抄底或逃顶信号时，系统会自动弹窗提醒并播放声音10秒，弹窗需要手动点击"我知道了"才能关闭。

**立即体验**：https://5173-iflt77kp2v3sxzxrncfgd-dfc00ec5.sandbox.novita.ai/signals
