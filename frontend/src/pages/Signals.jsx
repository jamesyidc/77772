import React, { useState, useEffect, useRef } from 'react';
import { Card, Statistic, Row, Col, Space, Spin, Tag, Badge, Modal, Form, Input, Button, message } from 'antd';
import { ReloadOutlined, ClockCircleOutlined, WarningOutlined, RiseOutlined, FallOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Signals.css';

// Default URLs - Using backend proxy to avoid CORS
const DEFAULT_URLS = {
  panic: '/api/v1/proxy/panic',
  query: '/api/v1/proxy/timeline',  // Changed to timeline for summary data
  supportResistance: '/api/v1/proxy/support-resistance'
};

const Signals = () => {
  // Panic Buy data (持仓量监控)
  const [panicData, setPanicData] = useState(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicLastUpdate, setPanicLastUpdate] = useState(null);
  const [panicCountdown, setPanicCountdown] = useState(180); // 3 minutes in seconds
  const panicLastUpdateRef = useRef(null);
  
  // Query data (信号数据)
  const [queryData, setQueryData] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryLastUpdate, setQueryLastUpdate] = useState(null);
  const [queryCountdown, setQueryCountdown] = useState(600); // 10 minutes in seconds
  const queryLastUpdateRef = useRef(null);
  
  // Support-Resistance data (支撑阻力信号)
  const [srData, setSrData] = useState({ buy: [], sell: [] });
  const [srLoading, setSrLoading] = useState(false);
  const [srLastUpdate, setSrLastUpdate] = useState(null);
  const [srCountdown, setSrCountdown] = useState(30); // 30 seconds
  const srLastUpdateRef = useRef(null);
  
  // Signal notifications
  const [notifiedSignals, setNotifiedSignals] = useState(new Set());
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  
  // Settings
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [urls, setUrls] = useState(() => {
    const savedUrls = localStorage.getItem('signal_urls');
    return savedUrls ? JSON.parse(savedUrls) : DEFAULT_URLS;
  });
  const [form] = Form.useForm();
  
  const panicIntervalRef = useRef(null);
  const queryIntervalRef = useRef(null);
  const srIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    // Initial load
    loadPanicData();
    loadQueryData();
    loadSRData();
    
    // Set up auto-refresh for panic data every 3 minutes (180 seconds)
    panicIntervalRef.current = setInterval(() => {
      loadPanicData(false);
      setPanicCountdown(180); // Reset countdown
    }, 180000);

    // Set up auto-refresh for query data every 10 minutes
    queryIntervalRef.current = setInterval(() => {
      loadQueryData(false);
      setQueryCountdown(600); // Reset countdown
    }, 600000);

    // Set up auto-refresh for support-resistance data every 30 seconds
    srIntervalRef.current = setInterval(() => {
      loadSRData(false);
      setSrCountdown(30); // Reset countdown
    }, 30000);

    // Set up countdown timer (updates every second)
    // Calculate countdown based on actual last update time
    countdownIntervalRef.current = setInterval(() => {
      const now = new Date();
      
      // Panic countdown
      if (panicLastUpdateRef.current) {
        const elapsed = Math.floor((now - panicLastUpdateRef.current) / 1000);
        setPanicCountdown(Math.max(0, 180 - elapsed));
      }
      
      // Query countdown
      if (queryLastUpdateRef.current) {
        const elapsed = Math.floor((now - queryLastUpdateRef.current) / 1000);
        setQueryCountdown(Math.max(0, 600 - elapsed));
      }
      
      // SR countdown
      if (srLastUpdateRef.current) {
        const elapsed = Math.floor((now - srLastUpdateRef.current) / 1000);
        setSrCountdown(Math.max(0, 30 - elapsed));
      }
    }, 1000);

    return () => {
      if (panicIntervalRef.current) {
        clearInterval(panicIntervalRef.current);
      }
      if (queryIntervalRef.current) {
        clearInterval(queryIntervalRef.current);
      }
      if (srIntervalRef.current) {
        clearInterval(srIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const loadPanicData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setPanicLoading(true);
      }
      
      const response = await axios.get(urls.panic);
      
      // Handle API response format: {success: true, data: {...}}
      const now = new Date();
      if (response.data && response.data.success && response.data.data) {
        setPanicData(response.data.data);
        setPanicLastUpdate(now);
        panicLastUpdateRef.current = now;
        setPanicCountdown(180); // Reset countdown on manual refresh
      } else if (response.data) {
        // Fallback for direct data
        setPanicData(response.data);
        setPanicLastUpdate(now);
        panicLastUpdateRef.current = now;
        setPanicCountdown(180); // Reset countdown on manual refresh
      }
    } catch (error) {
      console.error('Failed to load panic data:', error);
      setPanicData(null);
    } finally {
      if (showLoading) {
        setPanicLoading(false);
      }
    }
  };

  const loadQueryData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setQueryLoading(true);
      }
      
      const response = await axios.get(urls.query);
      
      // Handle timeline API response: {snapshots: [...]}
      const now = new Date();
      if (response.data && response.data.snapshots && Array.isArray(response.data.snapshots)) {
        // Only keep the latest 10 records
        const latestRecords = response.data.snapshots.slice(0, 10);
        setQueryData(latestRecords);
        setQueryLastUpdate(now);
        queryLastUpdateRef.current = now;
        setQueryCountdown(600); // Reset countdown on manual refresh
      } else if (response.data && response.data.coins && Array.isArray(response.data.coins)) {
        // Fallback for coins format
        const latestRecords = response.data.coins.slice(0, 10);
        setQueryData(latestRecords);
        setQueryLastUpdate(now);
        queryLastUpdateRef.current = now;
        setQueryCountdown(600); // Reset countdown on manual refresh
      } else if (response.data && Array.isArray(response.data)) {
        const latestRecords = response.data.slice(0, 10);
        setQueryData(latestRecords);
        setQueryLastUpdate(now);
        queryLastUpdateRef.current = now;
        setQueryCountdown(600); // Reset countdown on manual refresh
      }
    } catch (error) {
      console.error('Failed to load query data:', error);
      setQueryData([]);
    } finally {
      if (showLoading) {
        setQueryLoading(false);
      }
    }
  };

  const loadSRData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setSrLoading(true);
      }
      
      // Get snapshot history (last 24 hours with signals)
      const response = await axios.get(urls.supportResistance.replace('/latest-signal', '/snapshots'));
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const snapshots = response.data.data;
        
        // Find snapshots with actual buy (scenario_1 or scenario_2 > 0) or sell signals
        // scenario_1/scenario_2 = buy signals (near support)
        // scenario_3/scenario_4 = sell signals (near resistance)
        const buySnapshots = snapshots.filter(s => 
          (s.scenario_1_count > 0 || s.scenario_2_count > 0) &&
          s.scenario_1_coins && s.scenario_1_coins.length > 0
        ).map(s => ({
          time: s.snapshot_time,
          count: s.scenario_1_count + s.scenario_2_count,
          coins: [...(s.scenario_1_coins || []), ...(s.scenario_2_coins || [])],
          snapshot_date: s.snapshot_date
        }));
        
        const sellSnapshots = snapshots.filter(s =>
          (s.scenario_3_count > 0 || s.scenario_4_count > 0) &&
          s.scenario_3_coins && s.scenario_3_coins.length > 0
        ).map(s => ({
          time: s.snapshot_time,
          count: s.scenario_3_count + s.scenario_4_count,
          coins: [...(s.scenario_3_coins || []), ...(s.scenario_4_coins || [])],
          snapshot_date: s.snapshot_date
        }));
        
        const now = new Date();
        setSrData({
          buy: buySnapshots,
          sell: sellSnapshots
        });
        setSrLastUpdate(now);
        srLastUpdateRef.current = now;
        setSrCountdown(30); // Reset countdown on manual refresh
      }
    } catch (error) {
      console.error('Failed to load support-resistance data:', error);
      setSrData({ buy: [], sell: [] });
    } finally {
      if (showLoading) {
        setSrLoading(false);
      }
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const value = parseFloat(num);
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(2)}亿`;
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}万`;
    }
    return value.toLocaleString();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      // 明确使用北京时区 (Asia/Shanghai, UTC+8)
      return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return timestamp;
    }
  };

  // Format countdown time (seconds) to "MM:SS" format
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play notification sound for 10 seconds
  const playNotificationSound = () => {
    // Clear any existing timeout
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Create audio context and generate beep sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure beep sound (800Hz frequency)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      // Set volume
      gainNode.gain.value = 0.3;
      
      // Play repeating beep for 10 seconds
      const beepDuration = 0.2; // 200ms beep
      const pauseDuration = 0.3; // 300ms pause
      const totalDuration = 10; // 10 seconds total
      
      let currentTime = audioContext.currentTime;
      const endTime = currentTime + totalDuration;
      
      while (currentTime < endTime) {
        oscillator.start(currentTime);
        oscillator.stop(currentTime + beepDuration);
        currentTime += beepDuration + pauseDuration;
        
        // Create new oscillator for next beep
        if (currentTime < endTime) {
          const newOscillator = audioContext.createOscillator();
          newOscillator.connect(gainNode);
          newOscillator.frequency.value = 800;
          newOscillator.type = 'sine';
          oscillator = newOscillator;
        }
      }
      
      // Clean up after 10 seconds
      audioTimeoutRef.current = setTimeout(() => {
        audioContext.close();
      }, totalDuration * 1000);
      
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      // Fallback: try using HTML5 audio with data URI
      try {
        // Create a simple beep using data URI
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LVkHAU7k9nxynksBSp+zPDckT4IFV+16+uoVRQLR6Hf8r1tIAUsgs/y2Ik3CBtpvfDknE4MDlCl4PG2ZBwFO5PY8cl5LAUFKH7M8NyRPQkVXrTo7KlXFAtGoN/zv20gBS+C0PHYijUIHGi88OSbTQwPUabh8bdlHAU7k9nxynksBSh+zPHbkT0JFV607OuoVhQLR6Hg8r1tIAUsgs/y2Yo2CBxovPDjm00MEFGl4PG2ZBwFPJLY8cp5KwUofszw3JI+CRVetOzrp1UUC0eg3/K8bB8FLYLPadminUSUBWSm3fK8aiAFMILPad2H');
        audio.loop = true;
        audio.play();
        
        audioRef.current = audio;
        
        // Stop after 10 seconds
        audioTimeoutRef.current = setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 10000);
      } catch (e) {
        console.error('Fallback audio also failed:', e);
      }
    }
  };

  // Show signal notification modal (for time-based snapshots)
  const showSignalNotification = (signalType, snapshots) => {
    const isBuy = signalType === 'buy';
    const title = isBuy ? '🟢 抄底信号提醒' : '🔴 逃顶信号提醒';
    const color = isBuy ? '#52c41a' : '#ff4d4f';
    
    // Get the latest snapshot
    const snapshot = snapshots[0];
    if (!snapshot) return;
    
    // Play sound
    playNotificationSound();
    
    // Show modal
    Modal.info({
      title: <span style={{ color, fontSize: '20px', fontWeight: 'bold' }}>{title}</span>,
      width: 700,
      okText: '我知道了',
      maskClosable: false,
      content: (
        <div style={{ marginTop: 20 }}>
          <div style={{ 
            padding: '16px', 
            background: isBuy ? '#f6ffed' : '#fff1f0',
            border: `3px solid ${color}`,
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color, marginBottom: '12px' }}>
              {isBuy ? '⚠️ 检测到抄底时机！' : '⚠️ 检测到逃顶时机！'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              📅 时间: <span style={{ color }}>{formatTime(snapshot.time)}</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              📊 触发币种数量: <span style={{ color, fontSize: '20px' }}>{snapshot.count}</span> 个
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontWeight: 'bold' }}>
            {isBuy 
              ? '以下币种接近支撑位，可能是买入时机：' 
              : '以下币种接近阻力位，建议考虑止盈：'}
          </div>
          
          {snapshot.coins && snapshot.coins.slice(0, 8).map((coin, index) => (
            <div 
              key={index}
              style={{
                padding: '10px 12px',
                marginBottom: '6px',
                background: '#fff',
                border: `1px solid ${isBuy ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  color, 
                  minWidth: '100px'
                }}>
                  {coin.symbol || '-'}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  marginLeft: '16px',
                  color: '#666'
                }}>
                  价格: <strong>{coin.current_price || '-'}</strong>
                </span>
                {coin.position && (
                  <span style={{ 
                    fontSize: '14px', 
                    marginLeft: '16px',
                    color: '#999'
                  }}>
                    位置: {coin.position.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {snapshot.coins && snapshot.coins.length > 8 && (
            <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', marginTop: '12px' }}>
              还有 {snapshot.coins.length - 8} 个币种未显示
            </div>
          )}
          
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f0f2f5',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#666'
          }}>
            💡 提示: 这是系统在 <strong>{formatTime(snapshot.time)}</strong> 时检测到的{isBuy ? '抄底' : '逃顶'}信号时间点
          </div>
        </div>
      ),
      onOk: () => {
        // Stop sound when modal is closed
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        if (audioTimeoutRef.current) {
          clearTimeout(audioTimeoutRef.current);
        }
      }
    });
  };

  // Check for new signals and show notifications (based on time snapshots, not individual coins)
  useEffect(() => {
    if (!srData.buy && !srData.sell) return;
    
    const allSignals = [...(srData.buy || []), ...(srData.sell || [])];
    if (allSignals.length === 0) return;
    
    // Check for new buy signal snapshots (时间快照)
    const newBuySnapshots = (srData.buy || []).filter(snapshot => {
      const signalId = `buy_${snapshot.time}_${snapshot.count}`;
      return !notifiedSignals.has(signalId);
    });
    
    // Check for new sell signal snapshots (时间快照)
    const newSellSnapshots = (srData.sell || []).filter(snapshot => {
      const signalId = `sell_${snapshot.time}_${snapshot.count}`;
      return !notifiedSignals.has(signalId);
    });
    
    // Show notifications for new snapshots
    if (newBuySnapshots.length > 0) {
      // Get the latest snapshot (most recent)
      const latestSnapshot = newBuySnapshots[0];
      showSignalNotification('buy', [latestSnapshot]);
      
      // Mark as notified
      const newNotified = new Set(notifiedSignals);
      newBuySnapshots.forEach(snapshot => {
        const signalId = `buy_${snapshot.time}_${snapshot.count}`;
        newNotified.add(signalId);
      });
      setNotifiedSignals(newNotified);
    }
    
    if (newSellSnapshots.length > 0) {
      // Get the latest snapshot (most recent)
      const latestSnapshot = newSellSnapshots[0];
      showSignalNotification('sell', [latestSnapshot]);
      
      // Mark as notified
      const newNotified = new Set(notifiedSignals);
      newSellSnapshots.forEach(snapshot => {
        const signalId = `sell_${snapshot.time}_${snapshot.count}`;
        newNotified.add(signalId);
      });
      setNotifiedSignals(newNotified);
    }
    
    // Clean up old notified signals (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cleanedNotified = new Set(
      Array.from(notifiedSignals).filter(id => {
        // Parse time from ID (format: "buy_2025-12-17 11:30:00_5")
        const match = id.match(/_([\d-]+ [\d:]+)_/);
        if (match) {
          try {
            const signalTime = new Date(match[1]);
            return signalTime > oneDayAgo;
          } catch {
            return true;
          }
        }
        return true;
      })
    );
    
    // Limit the set size to prevent memory issues
    if (cleanedNotified.size > 1000) {
      const sortedIds = Array.from(cleanedNotified);
      const recentIds = sortedIds.slice(-500);
      setNotifiedSignals(new Set(recentIds));
    }
  }, [srData]);

  const handleSettingsOpen = () => {
    form.setFieldsValue(urls);
    setSettingsVisible(true);
  };

  const handleSettingsSave = async () => {
    try {
      const values = await form.validateFields();
      setUrls(values);
      localStorage.setItem('signal_urls', JSON.stringify(values));
      setSettingsVisible(false);
      message.success('配置已保存，正在刷新数据...');
      
      // Reload all data with new URLs
      loadPanicData(true);
      loadQueryData(true);
      loadSRData(true);
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error('保存失败');
    }
  };

  const handleSettingsReset = () => {
    form.setFieldsValue(DEFAULT_URLS);
  };

  return (
    <div className="signals-page">
      {/* Settings Modal */}
      <Modal
        title="信号源配置"
        open={settingsVisible}
        onOk={handleSettingsSave}
        onCancel={() => setSettingsVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={urls}
        >
          <Form.Item
            label="持仓量监控数据源 (Panic Monitor URL)"
            name="panic"
            rules={[{ required: true, message: '请输入URL' }, { type: 'url', message: '请输入有效的URL' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          
          <Form.Item
            label="交易信号数据源 (Trading Signals URL)"
            name="query"
            rules={[{ required: true, message: '请输入URL' }, { type: 'url', message: '请输入有效的URL' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          
          <Form.Item
            label="支撑阻力信号数据源 (Support-Resistance URL)"
            name="supportResistance"
            rules={[{ required: true, message: '请输入URL' }, { type: 'url', message: '请输入有效的URL' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          
          <Space>
            <Button onClick={handleSettingsReset}>恢复默认</Button>
            <span style={{ color: '#999', fontSize: '12px' }}>
              提示：修改后将立即刷新所有数据
            </span>
          </Space>
        </Form>
      </Modal>
      
      {/* Global Settings Button */}
      <div style={{ marginBottom: 24, textAlign: 'right' }}>
        <Button 
          type="primary" 
          icon={<SettingOutlined />}
          onClick={handleSettingsOpen}
          size="large"
        >
          配置信号源
        </Button>
      </div>
      
      <Row gutter={[24, 24]}>
        {/* Support-Resistance Card - 支撑阻力信号 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <RiseOutlined style={{ color: '#52c41a' }} />
                <FallOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>支撑阻力信号</span>
                {srLastUpdate && (
                  <Tag icon={<ClockCircleOutlined />} color="blue">
                    {srLastUpdate.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="orange">30秒刷新</Tag>
                <Tag color="magenta" icon={<ClockCircleOutlined />}>
                  还剩 {formatCountdown(srCountdown)}
                </Tag>
                <ReloadOutlined 
                  spin={srLoading}
                  onClick={() => loadSRData(true)}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                />
              </Space>
            }
            className="sr-card"
          >
            {srLoading && srData.buy.length === 0 && srData.sell.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" tip="加载中..." />
              </div>
            ) : (
              <div className="sr-content">
                <Row gutter={[16, 16]}>
                  {/* Buy Signals - 抄底信号 */}
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          <Badge count={srData.buy.length} showZero>
                            <RiseOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                          </Badge>
                          <span style={{ color: '#52c41a', fontWeight: 'bold' }}>抄底信号</span>
                        </Space>
                      }
                      className="buy-signals-card"
                      style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)' }}
                    >
                      {srData.buy.length > 0 ? (
                        <div className="signal-list">
                          {srData.buy.slice(0, 10).map((snapshot, index) => (
                            <div 
                              key={index}
                              className="signal-item"
                              style={{
                                padding: '14px',
                                marginBottom: '10px',
                                background: index === 0 ? '#f6ffed' : '#fff',
                                border: index === 0 ? '2px solid #52c41a' : '1px solid #b7eb8f',
                                borderRadius: '6px',
                                transition: 'all 0.3s',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                Modal.info({
                                  title: '📊 抄底信号详情',
                                  width: 600,
                                  content: (
                                    <div>
                                      <div style={{ fontSize: '16px', marginBottom: '12px' }}>
                                        <strong>时间:</strong> {formatTime(snapshot.time)}
                                      </div>
                                      <div style={{ fontSize: '16px', marginBottom: '16px' }}>
                                        <strong>触发币种数量:</strong> {snapshot.count} 个
                                      </div>
                                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>币种列表:</div>
                                      {snapshot.coins.map((coin, i) => (
                                        <div key={i} style={{ padding: '8px', marginBottom: '6px', background: '#f5f5f5', borderRadius: '4px' }}>
                                          <strong>{coin.symbol}</strong> - 价格: {coin.current_price}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                });
                              }}
                            >
                              <Row gutter={[12, 8]} align="middle">
                                <Col span={24}>
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Tag color="green" icon={<ClockCircleOutlined />} style={{ fontSize: '13px' }}>
                                      {formatTime(snapshot.time)}
                                    </Tag>
                                    {index === 0 && <Tag color="red">最新</Tag>}
                                  </Space>
                                </Col>
                                <Col span={24}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                      <span style={{ fontSize: '14px', color: '#666' }}>触发币种: </span>
                                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                                        {snapshot.count} 个
                                      </span>
                                    </div>
                                    <RiseOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                          <p>暂无抄底信号</p>
                        </div>
                      )}
                    </Card>
                  </Col>

                  {/* Sell Signals - 逃顶信号 */}
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          <Badge count={srData.sell.length} showZero>
                            <FallOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
                          </Badge>
                          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>逃顶信号</span>
                        </Space>
                      }
                      className="sell-signals-card"
                      style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffffff 100%)' }}
                    >
                      {srData.sell.length > 0 ? (
                        <div className="signal-list">
                          {srData.sell.slice(0, 10).map((snapshot, index) => (
                            <div 
                              key={index}
                              className="signal-item"
                              style={{
                                padding: '14px',
                                marginBottom: '10px',
                                background: index === 0 ? '#fff1f0' : '#fff',
                                border: index === 0 ? '2px solid #ff4d4f' : '1px solid #ffccc7',
                                borderRadius: '6px',
                                transition: 'all 0.3s',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                Modal.info({
                                  title: '📊 逃顶信号详情',
                                  width: 600,
                                  content: (
                                    <div>
                                      <div style={{ fontSize: '16px', marginBottom: '12px' }}>
                                        <strong>时间:</strong> {formatTime(snapshot.time)}
                                      </div>
                                      <div style={{ fontSize: '16px', marginBottom: '16px' }}>
                                        <strong>触发币种数量:</strong> {snapshot.count} 个
                                      </div>
                                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>币种列表:</div>
                                      {snapshot.coins.map((coin, i) => (
                                        <div key={i} style={{ padding: '8px', marginBottom: '6px', background: '#f5f5f5', borderRadius: '4px' }}>
                                          <strong>{coin.symbol}</strong> - 价格: {coin.current_price}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                });
                              }}
                            >
                              <Row gutter={[12, 8]} align="middle">
                                <Col span={24}>
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Tag color="red" icon={<ClockCircleOutlined />} style={{ fontSize: '13px' }}>
                                      {formatTime(snapshot.time)}
                                    </Tag>
                                    {index === 0 && <Tag color="green">最新</Tag>}
                                  </Space>
                                </Col>
                                <Col span={24}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                      <span style={{ fontSize: '14px', color: '#666' }}>触发币种: </span>
                                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
                                        {snapshot.count} 个
                                      </span>
                                    </div>
                                    <FallOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                          <p>暂无逃顶信号</p>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
                <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                  <Space>
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    <span style={{ color: '#0050b3' }}>
                      <strong>说明：</strong>显示最近的信号时间点，每 30 秒自动刷新。点击信号可查看详细币种信息。检测到新信号时会自动弹窗提醒。
                    </span>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Panic Buy Card - 持仓量监控 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>全网持仓量监控</span>
                {panicLastUpdate && (
                  <Tag icon={<ClockCircleOutlined />} color="blue">
                    {panicLastUpdate.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="orange">3分钟刷新</Tag>
                <Tag color="green" icon={<ClockCircleOutlined />}>
                  还剩 {formatCountdown(panicCountdown)}
                </Tag>
                <ReloadOutlined 
                  spin={panicLoading}
                  onClick={() => loadPanicData(true)}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                />
              </Space>
            }
            className="panic-card"
          >
            {panicLoading && !panicData ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" tip="加载中..." />
              </div>
            ) : panicData ? (
              <div className="panic-content">
                {/* 表头 */}
                <div style={{ 
                  marginBottom: 16, 
                  padding: '12px 16px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>恐慌清洗指数</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>1小时爆仓金额</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>24小时爆仓金额</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>24小时爆仓人数</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>全网持仓量</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>最后更新</div>
                </div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="恐慌清洗指数"
                        value={(panicData.panic_index || panicData.恐慌指数 || 0).toFixed(2)}
                        suffix="%"
                        valueStyle={{ 
                          fontSize: '28px', 
                          fontWeight: 'bold',
                          color: panicData.panic_index > 15 ? '#cf1322' : panicData.panic_index > 10 ? '#fa8c16' : '#52c41a' 
                        }}
                      />
                      <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                        {panicData.panic_level || '正常'}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="1小时爆仓金额"
                        value={(panicData.hour_1_amount || 0).toFixed(2)}
                        suffix="万美元"
                        valueStyle={{ fontSize: '28px', color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="24小时爆仓金额"
                        value={(panicData.hour_24_amount || 0).toFixed(2)}
                        suffix="万美元"
                        valueStyle={{ fontSize: '28px', color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="24小时爆仓人数"
                        value={(panicData.hour_24_people || 0).toFixed(2)}
                        suffix="万人"
                        valueStyle={{ fontSize: '28px', color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="全网持仓量"
                        value={(panicData.total_position || panicData.持仓量 || 0).toFixed(2)}
                        suffix="亿美元"
                        valueStyle={{ fontSize: '28px', color: '#1890ff', fontWeight: 'bold' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="最后更新"
                        value={panicData.record_time || '-'}
                        valueStyle={{ fontSize: '16px', color: '#666' }}
                      />
                      <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                        {panicData.market_zone || '-'}
                      </div>
                    </Card>
                  </Col>
                </Row>
                {(() => {
                  const openInterest = parseFloat((panicData.total_position || panicData.持仓量 || panicData.openInterest || 0) * 100000000);
                  const isAlert = openInterest < 9200000000 && openInterest > 0;
                  return (
                    <div style={{ 
                      marginTop: 16, 
                      padding: 12, 
                      background: isAlert ? '#fff7e6' : '#e6f7ff', 
                      borderRadius: 4, 
                      border: isAlert ? '1px solid #ffd591' : '1px solid #91d5ff' 
                    }}>
                      <Space>
                        {isAlert ? (
                          <WarningOutlined style={{ color: '#fa8c16' }} />
                        ) : (
                          <ClockCircleOutlined style={{ color: '#1890ff' }} />
                        )}
                        <span style={{ color: isAlert ? '#d46b08' : '#0050b3' }}>
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
              </div>
            ) : (
              <div>
                {/* 表头 - 始终显示 */}
                <div style={{ 
                  marginBottom: 16, 
                  padding: '12px 16px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>恐慌清洗指数</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>1小时爆仓金额</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>24小时爆仓金额</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>24小时爆仓人数</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>全网持仓量</div>
                  <div style={{ flex: '1 1 150px', textAlign: 'center' }}>最后更新</div>
                </div>
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <p style={{ fontSize: '16px' }}>暂无数据</p>
                  <p style={{ fontSize: '14px', marginTop: 8 }}>
                    正在等待数据加载... 
                    <br />
                    <span style={{ fontSize: '12px', color: '#bbb' }}>
                      数据源: {urls.panic}
                    </span>
                  </p>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={() => loadPanicData(true)}
                    style={{ marginTop: 16 }}
                  >
                    手动刷新
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Query Card - 信号数据 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>交易信号数据</span>
                {queryLastUpdate && (
                  <Tag icon={<ClockCircleOutlined />} color="blue">
                    {queryLastUpdate.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="green">10分钟刷新</Tag>
                <Tag color="cyan" icon={<ClockCircleOutlined />}>
                  还剩 {formatCountdown(queryCountdown)}
                </Tag>
                <ReloadOutlined 
                  spin={queryLoading}
                  onClick={() => loadQueryData(true)}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                />
              </Space>
            }
            className="query-card"
          >
            <div className="query-content" style={{ overflowX: 'auto' }}>
              {/* Always show table headers */}
              <div className="query-header" style={{ 
                marginBottom: 16, 
                fontWeight: 'bold', 
                display: 'grid', 
                gridTemplateColumns: '140px 60px 60px 80px 80px 60px 80px 80px 80px 80px 100px 100px 80px 80px', 
                gap: '8px', 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                minWidth: '1300px'
              }}>
                <div>运算时间</div>
                <div>急涨</div>
                <div>急跌</div>
                <div>本轮急涨</div>
                <div>本轮急跌</div>
                <div>计次</div>
                <div>计次得分</div>
                <div>状态</div>
                <div>比值</div>
                <div>差值</div>
                <div>比价最低</div>
                <div>比价创新高</div>
                <div>24h涨≥10%</div>
                <div>24h跌≤-10%</div>
              </div>
              
              {queryLoading && queryData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" tip="加载中..." />
                </div>
              ) : queryData.length > 0 ? (
                <div>
                {queryData.map((item, index) => (
                  <div 
                    key={index} 
                    className="query-item"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 60px 60px 80px 80px 60px 80px 80px 80px 80px 100px 100px 80px 80px',
                      gap: '8px',
                      padding: '12px',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: '13px',
                      minWidth: '1300px'
                    }}
                  >
                    <div style={{ color: '#666', fontSize: '12px' }}>{item.snapshot_time || '-'}</div>
                    <div style={{ color: (item.rush_up || 0) > 0 ? '#52c41a' : '#666', fontWeight: 'bold' }}>{item.rush_up ?? '-'}</div>
                    <div style={{ color: (item.rush_down || 0) > 0 ? '#ff4d4f' : '#666', fontWeight: 'bold' }}>{item.rush_down ?? '-'}</div>
                    <div style={{ color: (item.round_rush_up || 0) > 0 ? '#52c41a' : '#666', fontWeight: 'bold' }}>{item.round_rush_up ?? '-'}</div>
                    <div style={{ color: (item.round_rush_down || 0) > 0 ? '#ff4d4f' : '#666', fontWeight: 'bold' }}>{item.round_rush_down ?? '-'}</div>
                    <div>{item.count ?? '-'}</div>
                    <div>{item.count_score_display || '-'}</div>
                    <div>
                      <Tag color={
                        item.status === '急涨' ? 'green' :
                        item.status === '急跌' ? 'red' : 'orange'
                      }>
                        {item.status || '震荡'}
                      </Tag>
                    </div>
                    <div>{item.ratio ?? '-'}</div>
                    <div style={{ 
                      color: (item.diff || 0) > 0 ? '#52c41a' : (item.diff || 0) < 0 ? '#ff4d4f' : '#666',
                      fontWeight: (item.diff || 0) !== 0 ? 'bold' : 'normal'
                    }}>{item.diff ?? '-'}</div>
                    <div>{item.price_lowest ?? '-'}</div>
                    <div>{item.price_newhigh ?? '-'}</div>
                    <div style={{ color: (item.rise_24h_count || 0) > 0 ? '#52c41a' : '#666' }}>{item.rise_24h_count ?? '-'}</div>
                    <div style={{ color: (item.fall_24h_count || 0) > 0 ? '#ff4d4f' : '#666' }}>{item.fall_24h_count ?? '-'}</div>
                  </div>
                ))}
                <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: '12px' }}>
                  仅显示最近 10 条数据
                </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <p style={{ fontSize: '16px' }}>暂无信号数据</p>
                  <p style={{ fontSize: '14px', marginTop: 8 }}>
                    数据源需要返回JSON格式的数组数据
                  </p>
                  <p style={{ fontSize: '12px', marginTop: 4, color: '#bbb' }}>
                    当前URL: {urls.query}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Signals;
