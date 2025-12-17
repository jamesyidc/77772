import React, { useState, useEffect, useRef } from 'react';
import { Card, Statistic, Row, Col, Space, Spin, Tag } from 'antd';
import { ReloadOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Signals.css';

const Signals = () => {
  // Panic Buy data (持仓量监控)
  const [panicData, setPanicData] = useState(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicLastUpdate, setPanicLastUpdate] = useState(null);
  
  // Query data (信号数据)
  const [queryData, setQueryData] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryLastUpdate, setQueryLastUpdate] = useState(null);
  
  const panicIntervalRef = useRef(null);
  const queryIntervalRef = useRef(null);

  useEffect(() => {
    // Initial load
    loadPanicData();
    loadQueryData();
    
    // Set up auto-refresh for panic data every 30 seconds
    panicIntervalRef.current = setInterval(() => {
      loadPanicData(false);
    }, 30000);

    // Set up auto-refresh for query data every 10 minutes
    queryIntervalRef.current = setInterval(() => {
      loadQueryData(false);
    }, 600000);

    return () => {
      if (panicIntervalRef.current) {
        clearInterval(panicIntervalRef.current);
      }
      if (queryIntervalRef.current) {
        clearInterval(queryIntervalRef.current);
      }
    };
  }, []);

  const loadPanicData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setPanicLoading(true);
      }
      
      const response = await axios.get('https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/panic');
      
      // Check if data is valid and 持仓量 < 92亿
      if (response.data) {
        const openInterest = parseFloat(response.data.openInterest || response.data.持仓量 || 0);
        
        // Only show if < 9.2 billion (92亿 = 9200000000)
        if (openInterest < 9200000000) {
          setPanicData(response.data);
          setPanicLastUpdate(new Date());
        } else {
          setPanicData(null);
        }
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
      
      const response = await axios.get('https://5000-iz6uddj6rs3xe48ilsyqq-cbeee0f9.sandbox.novita.ai/query');
      
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

  return (
    <div className="signals-page">
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
                <Tag color="orange">30秒刷新</Tag>
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
                <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
                  <Space>
                    <WarningOutlined style={{ color: '#fa8c16' }} />
                    <span style={{ color: '#d46b08' }}>
                      <strong>预警条件：</strong>全网持仓量 &lt; 92亿时触发显示
                    </span>
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <p style={{ fontSize: '16px' }}>当前持仓量正常（≥ 92亿）</p>
                <p style={{ fontSize: '14px', marginTop: 8 }}>持仓量低于 92亿 时将显示详细数据</p>
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
            {queryLoading && queryData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" tip="加载中..." />
              </div>
            ) : queryData.length > 0 ? (
              <div className="query-content">
                <div className="query-header" style={{ marginBottom: 16, fontWeight: 'bold', display: 'grid', gridTemplateColumns: '80px 120px 120px 120px 120px 120px 1fr', gap: '8px', padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
                  <div>时间</div>
                  <div>实例</div>
                  <div>实际</div>
                  <div>主标签</div>
                  <div>次标签</div>
                  <div>比分</div>
                  <div>链接</div>
                </div>
                {queryData.map((item, index) => (
                  <div 
                    key={index} 
                    className="query-item"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 120px 120px 120px 120px 120px 1fr',
                      gap: '8px',
                      padding: '12px',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: '14px'
                    }}
                  >
                    <div style={{ color: '#666' }}>{formatTime(item.时间 || item.timestamp || item.time)}</div>
                    <div>{item.实例 || item.instance || '-'}</div>
                    <div>{item.实际 || item.actual || '-'}</div>
                    <div>
                      <Tag color="blue">{item.主标签 || item.mainTag || '-'}</Tag>
                    </div>
                    <div>
                      <Tag color="cyan">{item.次标签 || item.subTag || '-'}</Tag>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{item.比分 || item.score || '-'}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.链接 || item.link || item.url ? (
                        <a 
                          href={item.链接 || item.link || item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#1890ff' }}
                        >
                          查看详情
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: '12px' }}>
                  仅显示最近 10 条数据
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <p style={{ fontSize: '16px' }}>暂无信号数据</p>
                <p style={{ fontSize: '14px', marginTop: 8 }}>等待信号源返回数据...</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Signals;
