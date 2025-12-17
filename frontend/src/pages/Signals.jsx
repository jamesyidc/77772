import React, { useState, useEffect, useRef } from 'react';
import { Card, Statistic, Row, Col, Space, Spin, Tag, Badge, Modal, Form, Input, Button, message } from 'antd';
import { ReloadOutlined, ClockCircleOutlined, WarningOutlined, RiseOutlined, FallOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Signals.css';

// Default URLs
const DEFAULT_URLS = {
  panic: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/panic',
  query: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/query',
  supportResistance: 'https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/support-resistance'
};

const Signals = () => {
  // Panic Buy data (持仓量监控)
  const [panicData, setPanicData] = useState(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicLastUpdate, setPanicLastUpdate] = useState(null);
  
  // Query data (信号数据)
  const [queryData, setQueryData] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryLastUpdate, setQueryLastUpdate] = useState(null);
  
  // Support-Resistance data (支撑阻力信号)
  const [srData, setSrData] = useState({ buy: [], sell: [] });
  const [srLoading, setSrLoading] = useState(false);
  const [srLastUpdate, setSrLastUpdate] = useState(null);
  
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

  useEffect(() => {
    // Initial load
    loadPanicData();
    loadQueryData();
    loadSRData();
    
    // Set up auto-refresh for panic data every 3 minutes (180 seconds)
    panicIntervalRef.current = setInterval(() => {
      loadPanicData(false);
    }, 180000);

    // Set up auto-refresh for query data every 10 minutes
    queryIntervalRef.current = setInterval(() => {
      loadQueryData(false);
    }, 600000);

    // Set up auto-refresh for support-resistance data every 30 seconds
    srIntervalRef.current = setInterval(() => {
      loadSRData(false);
    }, 30000);

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
    };
  }, []);

  const loadPanicData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setPanicLoading(true);
      }
      
      const response = await axios.get(urls.panic);
      
      // Always show data regardless of threshold
      if (response.data) {
        setPanicData(response.data);
        setPanicLastUpdate(new Date());
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
      
      if (response.data && Array.isArray(response.data)) {
        // Only keep the latest 10 records
        const latestRecords = response.data.slice(0, 10);
        setQueryData(latestRecords);
        setQueryLastUpdate(new Date());
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const latestRecords = response.data.data.slice(0, 10);
        setQueryData(latestRecords);
        setQueryLastUpdate(new Date());
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
      
      const response = await axios.get(urls.supportResistance);
      
      if (response.data) {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in milliseconds
        
        let buySignals = [];
        let sellSignals = [];
        
        // Parse the response data
        if (response.data.抄底 && Array.isArray(response.data.抄底)) {
          buySignals = response.data.抄底;
        } else if (response.data.buy && Array.isArray(response.data.buy)) {
          buySignals = response.data.buy;
        }
        
        if (response.data.逃顶 && Array.isArray(response.data.逃顶)) {
          sellSignals = response.data.逃顶;
        } else if (response.data.sell && Array.isArray(response.data.sell)) {
          sellSignals = response.data.sell;
        }
        
        // Filter signals from last 1 hour and remove duplicates
        const filterAndDeduplicate = (signals) => {
          const filtered = signals.filter(signal => {
            const signalTime = new Date(signal.时间 || signal.timestamp || signal.time).getTime();
            return signalTime >= oneHourAgo;
          });
          
          // Deduplicate by time + price
          const seen = new Set();
          return filtered.filter(signal => {
            const key = `${signal.时间 || signal.timestamp || signal.time}_${signal.价格 || signal.price}`;
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        };
        
        setSrData({
          buy: filterAndDeduplicate(buySignals),
          sell: filterAndDeduplicate(sellSignals)
        });
        setSrLastUpdate(new Date());
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
      return date.toLocaleString('zh-CN', {
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
        {/* Panic Buy Card - 持仓量监控 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>全网持仓量监控</span>
                {panicLastUpdate && (
                  <Tag icon={<ClockCircleOutlined />} color="blue">
                    {panicLastUpdate.toLocaleTimeString('zh-CN')}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="orange">3分钟刷新</Tag>
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
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="24小时涨跌幅"
                        value={panicData['24h涨跌幅'] || panicData.change24h || '-'}
                        suffix="%"
                        valueStyle={{ 
                          color: parseFloat(panicData['24h涨跌幅'] || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                          fontSize: '32px'
                        }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="24小时成交额"
                        value={formatNumber(panicData['24h成交额'] || panicData.volume24h || 0)}
                        valueStyle={{ fontSize: '28px' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="24小时成交量"
                        value={parseFloat(panicData['24h成交量'] || panicData.volume || 0).toFixed(2)}
                        valueStyle={{ fontSize: '28px' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="持仓量"
                        value={formatNumber(panicData.持仓量 || panicData.openInterest || 0)}
                        valueStyle={{ fontSize: '28px', color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="持仓人数"
                        value={formatNumber(panicData.持仓人数 || panicData.holders || 0)}
                        valueStyle={{ fontSize: '28px' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="持仓量占比"
                        value={panicData.持仓量占比 || panicData.openInterestRatio || '-'}
                        suffix="%"
                        valueStyle={{ fontSize: '28px' }}
                      />
                    </Card>
                  </Col>
                </Row>
                {(() => {
                  const openInterest = parseFloat(panicData.持仓量 || panicData.openInterest || 0);
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
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <p style={{ fontSize: '16px' }}>暂无数据</p>
                <p style={{ fontSize: '14px', marginTop: 8 }}>等待数据加载...</p>
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
                    {queryLastUpdate.toLocaleTimeString('zh-CN')}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="green">10分钟刷新</Tag>
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
                gridTemplateColumns: '140px 60px 60px 80px 80px 60px 60px 80px 60px 60px 60px 100px 100px 80px 80px', 
                gap: '8px', 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                minWidth: '1400px'
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
                      gridTemplateColumns: '140px 60px 60px 80px 80px 60px 60px 80px 60px 60px 60px 100px 100px 80px 80px',
                      gap: '8px',
                      padding: '12px',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: '13px',
                      minWidth: '1400px'
                    }}
                  >
                    <div style={{ color: '#666' }}>{item.运算时间 || item.timestamp || formatTime(item.time) || '-'}</div>
                    <div style={{ color: item.急涨 > 0 ? '#52c41a' : '#666' }}>{item.急涨 ?? '-'}</div>
                    <div style={{ color: item.急跌 > 0 ? '#ff4d4f' : '#666' }}>{item.急跌 ?? '-'}</div>
                    <div style={{ color: item.本轮急涨 > 0 ? '#52c41a' : '#666', fontWeight: 'bold' }}>{item.本轮急涨 ?? '-'}</div>
                    <div style={{ color: item.本轮急跌 > 0 ? '#ff4d4f' : '#666', fontWeight: 'bold' }}>{item.本轮急跌 ?? '-'}</div>
                    <div>{item.计次 ?? '-'}</div>
                    <div>{item.计次得分 || '-'}</div>
                    <div>
                      <Tag color={
                        item.状态 === '震荡无序' ? 'orange' :
                        item.状态 === '急涨' ? 'green' :
                        item.状态 === '急跌' ? 'red' : 'default'
                      }>
                        {item.状态 || '-'}
                      </Tag>
                    </div>
                    <div>{item.比值 ?? '-'}</div>
                    <div style={{ 
                      color: item.差值 > 0 ? '#52c41a' : item.差值 < 0 ? '#ff4d4f' : '#666',
                      fontWeight: item.差值 !== 0 ? 'bold' : 'normal'
                    }}>{item.差值 ?? '-'}</div>
                    <div>{item.比价最低 ?? '-'}</div>
                    <div>{item.比价创新高 ?? '-'}</div>
                    <div style={{ color: item['24h涨≥10%'] > 0 ? '#52c41a' : '#666' }}>{item['24h涨≥10%'] ?? '-'}</div>
                    <div style={{ color: item['24h跌≤-10%'] > 0 ? '#ff4d4f' : '#666' }}>{item['24h跌≤-10%'] ?? '-'}</div>
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
                    {srLastUpdate.toLocaleTimeString('zh-CN')}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="orange">30秒刷新</Tag>
                <Tag color="purple">1小时窗口</Tag>
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
                          {srData.buy.map((signal, index) => (
                            <div 
                              key={index}
                              className="signal-item"
                              style={{
                                padding: '12px',
                                marginBottom: '8px',
                                background: '#fff',
                                border: '1px solid #b7eb8f',
                                borderRadius: '4px',
                                transition: 'all 0.3s'
                              }}
                            >
                              <Row gutter={[8, 8]}>
                                <Col span={24}>
                                  <Space>
                                    <Tag color="green" icon={<ClockCircleOutlined />}>
                                      {formatTime(signal.时间 || signal.timestamp || signal.time)}
                                    </Tag>
                                  </Space>
                                </Col>
                                <Col span={12}>
                                  <div style={{ fontSize: '12px', color: '#666' }}>价格</div>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                                    {signal.价格 || signal.price || '-'}
                                  </div>
                                </Col>
                                <Col span={12}>
                                  <div style={{ fontSize: '12px', color: '#666' }}>强度</div>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                    {signal.强度 || signal.strength || '-'}
                                  </div>
                                </Col>
                                {(signal.备注 || signal.note || signal.description) && (
                                  <Col span={24}>
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                      {signal.备注 || signal.note || signal.description}
                                    </div>
                                  </Col>
                                )}
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
                          {srData.sell.map((signal, index) => (
                            <div 
                              key={index}
                              className="signal-item"
                              style={{
                                padding: '12px',
                                marginBottom: '8px',
                                background: '#fff',
                                border: '1px solid #ffccc7',
                                borderRadius: '4px',
                                transition: 'all 0.3s'
                              }}
                            >
                              <Row gutter={[8, 8]}>
                                <Col span={24}>
                                  <Space>
                                    <Tag color="red" icon={<ClockCircleOutlined />}>
                                      {formatTime(signal.时间 || signal.timestamp || signal.time)}
                                    </Tag>
                                  </Space>
                                </Col>
                                <Col span={12}>
                                  <div style={{ fontSize: '12px', color: '#666' }}>价格</div>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f' }}>
                                    {signal.价格 || signal.price || '-'}
                                  </div>
                                </Col>
                                <Col span={12}>
                                  <div style={{ fontSize: '12px', color: '#666' }}>强度</div>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                    {signal.强度 || signal.strength || '-'}
                                  </div>
                                </Col>
                                {(signal.备注 || signal.note || signal.description) && (
                                  <Col span={24}>
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                      {signal.备注 || signal.note || signal.description}
                                    </div>
                                  </Col>
                                )}
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
                      <strong>说明：</strong>显示最近 1 小时内的信号，每 30 秒自动刷新，已自动去重
                    </span>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Signals;
