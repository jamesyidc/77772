import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Spin } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { accountAPI } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [balanceData, setBalanceData] = useState({});
  const [positionData, setPositionData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get accounts
      const accountsRes = await accountAPI.getAccounts();
      const accountList = accountsRes.data.accounts;
      setAccounts(accountList);
      
      // Get balances
      const balances = await accountAPI.getBalance(accountList);
      setBalanceData(balances.data || {});
      
      // Get positions
      const positions = await accountAPI.getPositions(accountList);
      setPositionData(positions.data || {});
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total balance
  const calculateTotalBalance = () => {
    let total = 0;
    Object.values(balanceData).forEach(balance => {
      if (balance.code === '0' && balance.data) {
        balance.data.forEach(account => {
          account.details?.forEach(detail => {
            if (detail.ccy === 'USDT') {
              total += parseFloat(detail.eq || 0);
            }
          });
        });
      }
    });
    return total;
  };

  // Calculate total unrealized PnL (from balance data if positions API unavailable)
  const calculateTotalPnL = () => {
    let total = 0;
    
    // Try to get from positions API first
    Object.values(positionData).forEach(positions => {
      if (positions.code === '0' && positions.data) {
        positions.data.forEach(pos => {
          total += parseFloat(pos.upl || 0);
        });
      }
    });
    
    // If positions API failed, extract from balance data
    if (total === 0) {
      Object.values(balanceData).forEach(balance => {
        if (balance.code === '0' && balance.data) {
          balance.data.forEach(account => {
            // Get unrealized PnL from account level
            if (account.upl) {
              total += parseFloat(account.upl || 0);
            }
            // Also check details for isolated positions
            account.details?.forEach(detail => {
              if (detail.isoUpl) {
                total += parseFloat(detail.isoUpl || 0);
              }
              if (detail.upl && !account.upl) {
                total += parseFloat(detail.upl || 0);
              }
            });
          });
        }
      });
    }
    
    return total;
  };

  const totalBalance = calculateTotalBalance();
  const totalPnL = calculateTotalPnL();

  // Prepare account table data
  const accountTableData = accounts.map(accountName => {
    const balance = balanceData[accountName];
    const positions = positionData[accountName];
    
    let accountBalance = 0;
    let accountAvailBal = 0;
    let accountFrozenBal = 0;
    let accountPnL = 0;
    let positionCount = 0;
    let hasIsolatedPosition = false;

    if (balance?.code === '0' && balance.data) {
      balance.data.forEach(acc => {
        // Get isolated position info from account level
        if (acc.isoEq && parseFloat(acc.isoEq) > 0) {
          hasIsolatedPosition = true;
          positionCount++; // At least one isolated position
        }
        
        acc.details?.forEach(detail => {
          if (detail.ccy === 'USDT') {
            accountBalance = parseFloat(detail.eq || 0);
            accountAvailBal = parseFloat(detail.availBal || 0);
            accountFrozenBal = parseFloat(detail.frozenBal || 0);
            
            // Get unrealized PnL from detail
            if (detail.isoUpl) {
              accountPnL += parseFloat(detail.isoUpl || 0);
            }
            if (detail.upl) {
              accountPnL += parseFloat(detail.upl || 0);
            }
          }
        });
      });
    }

    // If positions API is available and working, use it
    if (positions?.code === '0' && positions.data && positions.data.length > 0) {
      positionCount = positions.data.length;
      accountPnL = 0; // Reset and use positions API data
      positions.data.forEach(pos => {
        accountPnL += parseFloat(pos.upl || 0);
      });
    }

    return {
      key: accountName,
      account: accountName,
      balance: accountBalance,
      availBal: accountAvailBal,
      frozenBal: accountFrozenBal,
      pnl: accountPnL,
      positions: positionCount,
      hasIsolatedPosition,
    };
  });

  const columns = [
    {
      title: '账户名称',
      dataIndex: 'account',
      key: 'account',
    },
    {
      title: 'API状态',
      dataIndex: 'apiStatus',
      key: 'apiStatus',
      render: (_, record) => {
        const balance = balanceData[record.account];
        if (!balance) {
          return <span style={{ color: 'orange' }}>⚠️ 加载中</span>;
        }
        if (balance.code === '0') {
          return <span style={{ color: 'green' }}>✅ 已连接</span>;
        }
        return <span style={{ color: 'red' }}>❌ API错误</span>;
      },
    },
    {
      title: '总权益 (USDT)',
      dataIndex: 'balance',
      key: 'balance',
      render: (val, record) => {
        const balance = balanceData[record.account];
        if (balance?.code !== '0') {
          return <span style={{ color: 'red' }}>API未连接</span>;
        }
        return `$${val.toFixed(2)}`;
      },
    },
    {
      title: '可用余额',
      dataIndex: 'availBal',
      key: 'availBal',
      render: (val, record) => {
        const balance = balanceData[record.account];
        if (balance?.code !== '0') {
          return '-';
        }
        return `$${val.toFixed(2)}`;
      },
    },
    {
      title: '占用保证金',
      dataIndex: 'frozenBal',
      key: 'frozenBal',
      render: (val, record) => {
        const balance = balanceData[record.account];
        if (balance?.code !== '0') {
          return '-';
        }
        return val > 0 ? (
          <span style={{ color: 'orange' }}>
            ${val.toFixed(2)}
          </span>
        ) : (
          <span style={{ color: '#999' }}>$0.00</span>
        );
      },
    },
    {
      title: '未实现盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {val >= 0 ? '+' : ''}${val.toFixed(2)}
        </span>
      ),
    },
    {
      title: '持仓状态',
      dataIndex: 'positions',
      key: 'positions',
      render: (val, record) => {
        if (record.hasIsolatedPosition || record.frozenBal > 0) {
          return (
            <span style={{ color: 'green' }}>
              ✅ 有持仓
            </span>
          );
        }
        return (
          <span style={{ color: '#999' }}>
            无持仓
          </span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1>仪表盘</h1>
      
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总账户余额"
              value={totalBalance}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="USDT"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总未实现盈亏"
              value={totalPnL}
              precision={2}
              prefix={totalPnL >= 0 ? <RiseOutlined /> : <FallOutlined />}
              suffix="USDT"
              valueStyle={{ color: totalPnL >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="账户数量"
              value={accounts.length}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      <Card title="账户概览" style={{ marginTop: 24 }}>
        <Table
          dataSource={accountTableData}
          columns={columns}
          pagination={false}
        />
      </Card>

      {/* 持仓详情 */}
      <Card title="持仓详情" style={{ marginTop: 24 }}>
        <Table
          dataSource={(() => {
            const positionsList = [];
            Object.entries(positionData).forEach(([accountName, positions]) => {
              if (positions?.code === '0' && positions.data) {
                positions.data.forEach(pos => {
                  positionsList.push({
                    key: `${accountName}-${pos.instId}-${pos.posSide}`,
                    account: accountName,
                    instId: pos.instId,
                    posSide: pos.posSide,
                    pos: pos.pos,
                    avgPx: pos.avgPx,
                    markPx: pos.markPx,
                    upl: parseFloat(pos.upl || 0),
                    uplRatio: pos.uplRatio,
                    lever: pos.lever,
                    notionalUsd: pos.notionalUsd,
                    margin: pos.margin,
                    mgnMode: pos.mgnMode,
                  });
                });
              }
            });
            return positionsList;
          })()}
          columns={[
            {
              title: '账户',
              dataIndex: 'account',
              key: 'account',
            },
            {
              title: '合约',
              dataIndex: 'instId',
              key: 'instId',
            },
            {
              title: '方向',
              dataIndex: 'posSide',
              key: 'posSide',
              render: (val) => {
                if (val === 'long') return <span style={{ color: 'green' }}>做多</span>;
                if (val === 'short') return <span style={{ color: 'red' }}>做空</span>;
                return val;
              },
            },
            {
              title: '持仓数量',
              dataIndex: 'pos',
              key: 'pos',
              render: (val) => `${val} 张`,
            },
            {
              title: '开仓均价',
              dataIndex: 'avgPx',
              key: 'avgPx',
              render: (val) => `$${parseFloat(val).toFixed(2)}`,
            },
            {
              title: '标记价格',
              dataIndex: 'markPx',
              key: 'markPx',
              render: (val) => `$${parseFloat(val).toFixed(2)}`,
            },
            {
              title: '未实现盈亏',
              dataIndex: 'upl',
              key: 'upl',
              render: (val) => (
                <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                  {val >= 0 ? '+' : ''}${val.toFixed(2)}
                </span>
              ),
              sorter: (a, b) => a.upl - b.upl,
            },
            {
              title: '盈亏比例',
              dataIndex: 'uplRatio',
              key: 'uplRatio',
              render: (val) => {
                const ratio = parseFloat(val || 0) * 100;
                return (
                  <span style={{ color: ratio >= 0 ? 'green' : 'red' }}>
                    {ratio >= 0 ? '+' : ''}{ratio.toFixed(2)}%
                  </span>
                );
              },
            },
            {
              title: '杠杆',
              dataIndex: 'lever',
              key: 'lever',
              render: (val) => `${val}x`,
            },
            {
              title: '保证金模式',
              dataIndex: 'mgnMode',
              key: 'mgnMode',
              render: (val) => val === 'cross' ? '全仓' : '逐仓',
            },
          ]}
          pagination={false}
          locale={{
            emptyText: '暂无持仓'
          }}
        />
      </Card>

      {/* API连接状态警告 */}
      {Object.entries(balanceData).some(([_, data]) => data.code !== '0') && (
        <Alert
          message="⚠️ API连接异常"
          description={
            <div>
              <p>以下账户API连接失败，余额显示可能不准确：</p>
              <ul>
                {Object.entries(balanceData)
                  .filter(([_, data]) => data.code !== '0')
                  .map(([accountName, data]) => (
                    <li key={accountName}>
                      <strong>{accountName}</strong>: {data.msg || 'API认证失败'}
                    </li>
                  ))}
              </ul>
              <p>请检查账户API配置，参考 JAMESYI_ACCOUNT_SETUP.md 文档排查问题。</p>
            </div>
          }
          type="error"
          showIcon
          closable
          style={{ marginTop: 24 }}
        />
      )}

      {/* 持仓API权限警告 */}
      {Object.values(positionData).some(p => p.code === '-1') && totalPnL !== 0 && (
        <Alert
          message="⚠️ 持仓数据提示"
          description={
            <div>
              <p><strong>持仓API权限受限</strong>，当前持仓数据来源于余额API的衍生信息：</p>
              <ul>
                <li>✅ <strong>未实现盈亏</strong>：从账户余额中的 <code>isoUpl</code> 字段提取（当前显示 ${totalPnL.toFixed(2)}）</li>
                <li>✅ <strong>占用保证金</strong>：从 <code>frozenBal</code> 字段提取，显示逐仓持仓占用资金</li>
                <li>⚠️ <strong>持仓详情</strong>：无法显示具体合约名称、张数、开仓价等详细信息</li>
              </ul>
              <p><strong>如需完整持仓详情</strong>，请登录OKX平台更新API权限，开启持仓查询功能。</p>
              <p>参考文档：<code>API_PERMISSION_ISSUE.md</code></p>
            </div>
          }
          type="warning"
          showIcon
          closable
          style={{ marginTop: 24 }}
        />
      )}

      <Alert
        message="系统提示"
        description="实时数据更新中，建议定期刷新页面获取最新信息"
        type="info"
        showIcon
        style={{ marginTop: 24 }}
      />
    </div>
  );
};

export default Dashboard;
