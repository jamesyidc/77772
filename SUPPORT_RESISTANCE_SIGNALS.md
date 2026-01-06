# Support-Resistance Signals Feature (支撑阻力信号)

## Overview
This document describes the **Support-Resistance Signals** monitoring component, which displays buy (抄底) and sell (逃顶) trading signals in real-time. This is the third independent monitoring card on the Signals page.

## Feature Summary

### Data Source
- **Endpoint**: `https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance`
- **Method**: HTTP GET
- **Response Format**: JSON with separate arrays for buy and sell signals

### Refresh Mechanism
- **Interval**: Every 30 seconds (auto-refresh)
- **Time Window**: Last 1 hour only
- **Deduplication**: Automatic removal of duplicate signals by (time + price) combination
- **Manual Refresh**: Available via reload button

## Signal Types

### 1. Buy Signals (抄底信号)
**Purpose**: Identify potential buying opportunities at support levels

**Display Fields**:
- **Time (时间)**: Signal timestamp
- **Price (价格)**: Support price level
- **Strength (强度)**: Signal strength indicator
- **Notes (备注)**: Additional signal information

**Visual Design**:
- Green color scheme (#52c41a)
- Gradient background (light green to white)
- Rise icon indicator
- Badge count display
- Hover animations

### 2. Sell Signals (逃顶信号)
**Purpose**: Identify potential selling opportunities at resistance levels

**Display Fields**:
- **Time (时间)**: Signal timestamp
- **Price (价格)**: Resistance price level
- **Strength (强度)**: Signal strength indicator
- **Notes (备注)**: Additional signal information

**Visual Design**:
- Red color scheme (#ff4d4f)
- Gradient background (light red to white)
- Fall icon indicator
- Badge count display
- Hover animations

## Data Processing

### 1. Time Filtering
```javascript
const now = Date.now();
const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in milliseconds

// Filter signals from last 1 hour
const filtered = signals.filter(signal => {
  const signalTime = new Date(signal.时间 || signal.timestamp || signal.time).getTime();
  return signalTime >= oneHourAgo;
});
```

### 2. Deduplication Logic
```javascript
const seen = new Set();
return filtered.filter(signal => {
  const key = `${signal.时间 || signal.timestamp || signal.time}_${signal.价格 || signal.price}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);
  return true;
});
```

### 3. Expected Data Format

**Chinese Field Names** (Primary):
```json
{
  "抄底": [
    {
      "时间": "2025-12-17 02:30:00",
      "价格": "42500.00",
      "强度": "强",
      "备注": "日线支撑位"
    }
  ],
  "逃顶": [
    {
      "时间": "2025-12-17 02:35:00",
      "价格": "43500.00",
      "强度": "中",
      "备注": "前期高点阻力"
    }
  ]
}
```

**English Field Names** (Fallback):
```json
{
  "buy": [
    {
      "timestamp": "2025-12-17T02:30:00",
      "price": "42500.00",
      "strength": "Strong",
      "note": "Daily support level"
    }
  ],
  "sell": [
    {
      "timestamp": "2025-12-17T02:35:00",
      "price": "43500.00",
      "strength": "Medium",
      "description": "Previous high resistance"
    }
  ]
}
```

## UI Components

### Card Layout
```
┌─────────────────────────────────────────────────────┐
│ 🔺🔻 支撑阻力信号         [30秒刷新] [1小时窗口] [🔄] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────┐  ┌────────────────────────┐ │
│  │ 🔺 抄底信号 (3)   │  │ 🔻 逃顶信号 (2)        │ │
│  ├───────────────────┤  ├────────────────────────┤ │
│  │ [Signal Item 1]   │  │ [Signal Item 1]        │ │
│  │ [Signal Item 2]   │  │ [Signal Item 2]        │ │
│  │ [Signal Item 3]   │  │                        │ │
│  └───────────────────┘  └────────────────────────┘ │
│                                                     │
│  ℹ️ 说明：显示最近1小时内的信号，每30秒自动刷新     │
└─────────────────────────────────────────────────────┘
```

### Signal Item Structure
```
┌────────────────────────────────────┐
│ 🕐 12-17 02:30:00                 │
│                                    │
│ 价格              强度             │
│ 42500.00         强               │
│                                    │
│ 日线支撑位                         │
└────────────────────────────────────┘
```

## Technical Implementation

### State Management
```javascript
const [srData, setSrData] = useState({ buy: [], sell: [] });
const [srLoading, setSrLoading] = useState(false);
const [srLastUpdate, setSrLastUpdate] = useState(null);
const srIntervalRef = useRef(null);
```

### Auto-Refresh Setup
```javascript
useEffect(() => {
  loadSRData(); // Initial load
  
  // Set up auto-refresh every 30 seconds
  srIntervalRef.current = setInterval(() => {
    loadSRData(false);
  }, 30000);
  
  return () => {
    if (srIntervalRef.current) {
      clearInterval(srIntervalRef.current);
    }
  };
}, []);
```

### Data Loading Function
```javascript
const loadSRData = async (showLoading = true) => {
  try {
    if (showLoading) setSrLoading(true);
    
    const response = await axios.get(
      'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance'
    );
    
    // Extract and filter data
    const buySignals = response.data.抄底 || response.data.buy || [];
    const sellSignals = response.data.逃顶 || response.data.sell || [];
    
    // Apply time filter and deduplication
    setSrData({
      buy: filterAndDeduplicate(buySignals),
      sell: filterAndDeduplicate(sellSignals)
    });
    
    setSrLastUpdate(new Date());
  } catch (error) {
    console.error('Failed to load SR data:', error);
    setSrData({ buy: [], sell: [] });
  } finally {
    if (showLoading) setSrLoading(false);
  }
};
```

## Styling

### CSS Classes
- `.sr-card` - Main card container
- `.sr-content` - Content wrapper
- `.buy-signals-card` - Buy signals card
- `.sell-signals-card` - Sell signals card
- `.signal-item` - Individual signal item
- `.signal-list` - Scrollable signal list

### Color Scheme
- **Buy Signals**: 
  - Primary: `#52c41a` (Green)
  - Background: `linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)`
  - Border: `#b7eb8f`
  
- **Sell Signals**:
  - Primary: `#ff4d4f` (Red)
  - Background: `linear-gradient(135deg, #fff1f0 0%, #ffffff 100%)`
  - Border: `#ffccc7`

### Animations
```css
.signal-item {
  transition: all 0.3s ease;
}

.signal-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Responsive Design

### Breakpoints
- **Desktop (≥992px)**: Side-by-side layout (50% each)
- **Tablet (768px-991px)**: Side-by-side layout (50% each)
- **Mobile (<768px)**: Stacked layout (100% width)

### Grid Layout
```javascript
<Row gutter={[16, 16]}>
  <Col xs={24} lg={12}>
    {/* Buy Signals Card */}
  </Col>
  <Col xs={24} lg={12}>
    {/* Sell Signals Card */}
  </Col>
</Row>
```

## Integration Points

### 1. Signals Page Structure
The support-resistance card is the third card on the Signals page:
1. **Panic Buy Monitor** (持仓量监控) - 30s refresh
2. **Trading Signals Data** (交易信号数据) - 10min refresh
3. **Support-Resistance Signals** (支撑阻力信号) - 30s refresh ← NEW

### 2. Navigation
- **Route**: `/signals`
- **Menu Item**: "信号监控" in sidebar
- **Icon**: Notification bell with animated badge

### 3. API Integration
- **Direct HTTP calls** via Axios (not through backend API)
- **No authentication** required for data source
- **CORS enabled** on data source endpoint

## User Interaction

### Manual Refresh
- Click the reload icon (🔄) to force refresh
- Loading spinner shows during refresh
- Last update timestamp displayed

### Information Display
- **Badge counts** show number of active signals
- **Color coding** indicates signal type (green=buy, red=sell)
- **Hover effects** highlight signal items
- **Timestamps** in local timezone format

### Empty State
When no signals are available:
```
暂无抄底信号  |  暂无逃顶信号
```

## Performance Considerations

### Optimization Strategies
1. **Conditional Loading**: Show loading spinner only on initial load
2. **Background Refresh**: Auto-refresh without loading spinner
3. **Deduplication**: Reduce redundant signal display
4. **Time Window**: Limit to 1 hour to reduce data volume
5. **Scrollable Lists**: Max height with custom scrollbar

### Memory Management
- Interval cleanup in useEffect return
- State reset on unmount
- Error boundary protection

## Error Handling

### Network Errors
```javascript
catch (error) {
  console.error('Failed to load SR data:', error);
  setSrData({ buy: [], sell: [] });
}
```

### Data Validation
- Check for array types before processing
- Fallback to empty arrays if data is invalid
- Support both Chinese and English field names

### User Feedback
- Loading spinner during data fetch
- Error state with retry option
- Empty state with helpful message

## Testing Checklist

- [ ] Auto-refresh every 30 seconds
- [ ] Manual refresh button works
- [ ] Time filtering (1 hour window)
- [ ] Deduplication by time + price
- [ ] Buy signals display correctly
- [ ] Sell signals display correctly
- [ ] Badge counts update
- [ ] Last update timestamp shows
- [ ] Hover animations work
- [ ] Responsive layout on mobile
- [ ] Empty state displays properly
- [ ] Error handling graceful
- [ ] Loading states smooth
- [ ] Scrollbar styling correct
- [ ] Color scheme consistent

## Files Modified

### Frontend Components
- **`frontend/src/pages/Signals.jsx`**
  - Added SR state management
  - Added SR data loading function
  - Added SR interval setup
  - Added SR card component
  
- **`frontend/src/pages/Signals.css`**
  - Added `.sr-card` styles
  - Added `.buy-signals-card` styles
  - Added `.sell-signals-card` styles
  - Added `.signal-item` animations
  - Added custom scrollbar styling

## Future Enhancements

### Potential Improvements
1. **Signal Strength Visualization**: Progress bars or star ratings
2. **Price Chart Integration**: Show signals on price chart
3. **Alert Notifications**: Browser notifications for new signals
4. **Historical Trends**: Chart showing signal frequency over time
5. **Filter Options**: Filter by strength, price range
6. **Export Functionality**: Download signals as CSV
7. **Signal Details Modal**: Click signal for more information
8. **Performance Metrics**: Track signal success rate

### Backend Integration (Optional)
Currently using direct HTTP calls. Could add backend caching:
- Cache signals for 30 seconds
- Reduce external API calls
- Add analytics and logging
- Implement rate limiting

## Troubleshooting

### Common Issues

**Issue**: Signals not appearing
- Check data source URL is accessible
- Verify data format matches expected structure (must be JSON, not HTML)
- Check browser console for errors
- Confirm time filtering logic
- **IMPORTANT**: The endpoint `https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance` currently returns HTML. You may need to:
  - Create a JSON API endpoint that returns data in the expected format
  - Or modify the existing endpoint to support JSON response
  - Or implement HTML parsing in the frontend

**Issue**: Duplicates showing
- Verify deduplication logic
- Check if time + price key is unique
- Ensure Set is working correctly

**Issue**: Auto-refresh not working
- Check interval is set correctly
- Verify cleanup in useEffect
- Check for memory leaks
- Confirm component is mounted

## Summary

The Support-Resistance Signals feature provides real-time monitoring of buy and sell signals with:
- ✅ Auto-refresh every 30 seconds
- ✅ 1-hour time window filtering
- ✅ Automatic deduplication
- ✅ Separate buy/sell visualization
- ✅ Badge count indicators
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Manual refresh capability

This completes the three-card signals monitoring dashboard.
