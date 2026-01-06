import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Spin } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { accountAPI, historyAPI } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [balanceData, setBalanceData] = useState({});
  const [positionData, setPositionData] = useState({});
  const [dailyPnlData, setDailyPnlData] = useState({});

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
      
      // Get today's P&L summary
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date();
      
      try {
        const pnlRes = await historyAPI.getPnLSummary({
          account_names: accountList,
          inst_type: 'SWAP',
          begin: todayStart.getTime().toString(),
          end: todayEnd.getTime().toString()
        });
        setDailyPnlData(pnlRes.data || {});
      } catch (err) {
        console.error('Failed to load daily P&L:', err);
      }
      
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
    let accountRealizedPnl = 0;
    let accountTotalPnl = 0;
    let todayRealizedPnl = 0;
    
    if (positions?.code === '0' && positions.data && positions.data.length > 0) {
      positionCount = positions.data.length;
      accountPnL = 0; // Reset and use positions API data
      positions.data.forEach(pos => {
        const upl = parseFloat(pos.upl || 0);
        const realizedPnl = parseFloat(pos.realizedPnl || 0);
        accountPnL += upl;
        accountRealizedPnl += realizedPnl;
        accountTotalPnl += upl + realizedPnl;
      });
    }
    
    // Get today's realized P&L from daily analytics
    const dailyPnl = dailyPnlData[accountName];
    if (dailyPnl?.code === '0' && dailyPnl.data) {
      todayRealizedPnl = parseFloat(dailyPnl.data.total_pnl || 0);
      // If we have today's P&L, use it for total calculation
      if (todayRealizedPnl !== 0) {
        accountTotalPnl = todayRealizedPnl + accountPnL;
      }
    }
    
    // Calculate PnL ratio
    // Note: accountBalance (eq) = availBal + frozenBal + unrealizedPnL
    // So for P&L%, we should calculate based on initial capital, not current equity
    // For now, we'll use a more meaningful metric: todayPnl / accountBalance
    const pnlRatio = accountBalance > 0 ? (todayRealizedPnl / accountBalance) * 100 : 0;

    return {
      key: accountName,
      account: accountName,
      balance: accountBalance,
      availBal: accountAvailBal,
      frozenBal: accountFrozenBal,
      pnl: accountPnL,
      realizedPnl: accountRealizedPnl,
      todayPnl: todayRealizedPnl,
      totalPnl: accountTotalPnl,
      pnlRatio: pnlRatio,
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
      title: (
        <span>
          总权益 (USDT)
          <br />
          <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#999' }}>
            可用+占用+浮亏
          </span>
        </span>
      ),
      dataIndex: 'balance',
      key: 'balance',
      render: (val, record) => {
        const balance = balanceData[record.account];
        if (balance?.code !== '0') {
          return <span style={{ color: 'red' }}>API未连接</span>;
        }
        // Show breakdown tooltip
        const tooltip = `详细计算:\n可用余额: $${record.availBal.toFixed(2)}\n+ 占用保证金: $${record.frozenBal.toFixed(2)}\n+ 未实现盈亏: $${record.pnl >= 0 ? '+' : ''}${record.pnl.toFixed(2)}\n= 总权益: $${val.toFixed(2)}`;
        return (
          <span title={tooltip} style={{ fontWeight: 'bold', cursor: 'help', borderBottom: '1px dashed #d9d9d9' }}>
            ${val.toFixed(2)}
          </span>
        );
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
      title: '当日已实现盈亏',
      dataIndex: 'todayPnl',
      key: 'todayPnl',
      render: (val, record) => {
        // Show debug info if needed
        const debugMode = false; // Set to true to see calculation details
        return (
          <span 
            style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold', fontSize: '14px' }}
            title={debugMode ? `Total Balance: ${record.balance}, Avail: ${record.availBal}, Frozen: ${record.frozenBal}, Unrealized: ${record.pnl}` : ''}
          >
            {val >= 0 ? '+' : ''}${val.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '持仓已实现盈亏',
      dataIndex: 'realizedPnl',
      key: 'realizedPnl',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red' }}>
          {val >= 0 ? '+' : ''}${val.toFixed(2)}
        </span>
      ),
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
      title: '盈亏比例',
      dataIndex: 'pnlRatio',
      key: 'pnlRatio',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
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
      
      <Alert
        message="📊 资产计算说明"
        description={
          <div>
            <p style={{ margin: '8px 0' }}>
              <strong>总权益 (Total Equity)</strong> = 可用余额 + 占用保证金 + 未实现盈亏
            </p>
            <p style={{ margin: '8px 0', fontSize: '13px', color: '#666' }}>
              💡 <strong>说明：</strong>如果有持仓浮亏 -$100，总权益会自动减少 $100。
              这是 OKX 官方 API 的计算方式，反映了账户的真实净值。
            </p>
            <p style={{ margin: '8px 0', fontSize: '13px', color: '#666' }}>
              📌 <strong>例如：</strong>可用余额 $642.76 + 占用保证金 $100 + 浮亏 -$100 = 总权益 $642.76
            </p>
            <p style={{ margin: '8px 0', fontSize: '13px', color: '#999' }}>
              ⚠️ 持仓的保证金已计入"占用保证金"，持仓的盈亏已计入"未实现盈亏"。
            </p>
          </div>
        }
        type="info"
        showIcon
        closable
        style={{ marginTop: 16 }}
      />
      
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
      
      {/* 当日盈亏汇总 */}
      {(() => {
        let todayTotalPnl = 0;
        let todayTotalFee = 0;
        let todayNetPnl = 0;
        
        Object.keys(dailyPnlData).forEach(accountName => {
          const pnl = dailyPnlData[accountName];
          if (pnl?.code === '0' && pnl.data) {
            todayTotalPnl += parseFloat(pnl.data.total_pnl || 0);
            todayTotalFee += parseFloat(pnl.data.total_fee || 0);
            todayNetPnl += parseFloat(pnl.data.net_pnl || 0);
          }
        });
        
        const pnlPercentage = totalBalance > 0 ? (todayNetPnl / totalBalance) * 100 : 0;
        
        return (
          <Card 
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                📊 当日盈亏汇总 (Today's P&L)
              </span>
            } 
            style={{ marginTop: 24, background: '#fafafa' }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Card style={{ background: todayNetPnl >= 0 ? '#f6ffed' : '#fff2f0' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 'bold' }}>净盈亏 (Net P&L)</span>}
                    value={todayNetPnl}
                    precision={2}
                    prefix="$"
                    valueStyle={{ 
                      color: todayNetPnl >= 0 ? '#3f8600' : '#cf1322', 
                      fontWeight: 'bold',
                      fontSize: '24px'
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="盈亏百分比 (P&L %)"
                    value={pnlPercentage}
                    precision={2}
                    suffix="%"
                    valueStyle={{ 
                      color: pnlPercentage >= 0 ? '#3f8600' : '#cf1322',
                      fontWeight: 'bold'
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已实现盈亏 (Realized P&L)"
                    value={todayTotalPnl}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: todayTotalPnl >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总手续费 (Total Fee)"
                    value={todayTotalFee}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#ff7a45' }}
                  />
                </Card>
              </Col>
            </Row>
            <Alert
              message="说明"
              description={
                <div>
                  <p>• <strong>净盈亏 (Net P&L)</strong> = 已实现盈亏 - 总手续费</p>
                  <p>• <strong>盈亏百分比 (P&L %)</strong> = 净盈亏 / 总账户余额 × 100%</p>
                  <p>• 数据包含所有账户今日的交易盈亏，包括已平仓和部分平仓的实际盈亏</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        );
      })()}

      <Card title="账户概览" style={{ marginTop: 24 }}>
        <Table
          dataSource={accountTableData}
          columns={columns}
          pagination={false}
        />
      </Card>

      {/* 持仓盈亏汇总 */}
      {(() => {
        let totalRealizedPnl = 0;
        let totalUnrealizedPnl = 0;
        let totalFee = 0;
        let hasPositions = false;
        
        Object.values(positionData).forEach(positions => {
          if (positions?.code === '0' && positions.data && positions.data.length > 0) {
            hasPositions = true;
            positions.data.forEach(pos => {
              totalRealizedPnl += parseFloat(pos.realizedPnl || 0);
              totalUnrealizedPnl += parseFloat(pos.upl || 0);
              totalFee += Math.abs(parseFloat(pos.fee || 0));
            });
          }
        });
        
        const netPnl = totalRealizedPnl + totalUnrealizedPnl - totalFee;
        
        // Only show if there are positions
        if (!hasPositions) {
          return null;
        }
        
        return (
          <Card title="💰 持仓盈亏汇总" style={{ marginTop: 24 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已实现盈亏"
                    value={totalRealizedPnl}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: totalRealizedPnl >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}
                    suffix={
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                        (含部分平仓)
                      </span>
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="未实现盈亏"
                    value={totalUnrealizedPnl}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: totalUnrealizedPnl >= 0 ? '#3f8600' : '#cf1322' }}
                    suffix={
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                        (浮动盈亏)
                      </span>
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总手续费"
                    value={totalFee}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="净盈亏"
                    value={netPnl}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: netPnl >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold', fontSize: '24px' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        );
      })()}

      {/* 持仓详情 */}
      <Card title="持仓详情" style={{ marginTop: 24 }}>
        {/* 如果持仓API无权限但有持仓数据，显示警告 */}
        {Object.values(positionData).some(p => p.code === '-1') && totalPnL !== 0 && (
          <Alert
            message="⚠️ 无法显示持仓详情"
            description={
              <div>
                <p><strong>原因</strong>：OKX API Key 缺少"持仓查询"权限（/api/v5/account/positions 返回401）</p>
                <p><strong>当前状态</strong>：系统检测到您有持仓（未实现盈亏：${totalPnL.toFixed(2)} USDT），但无法获取详细信息</p>
                <p><strong>解决方案</strong>：</p>
                <ol>
                  <li>登录 OKX平台 (https://www.okx.com)</li>
                  <li>进入 账户 → API → API管理</li>
                  <li>编辑您的API Key，确保勾选 <strong>"读取" + "交易"</strong> 权限</li>
                  <li>特别确认 /api/v5/account/positions 接口有访问权限</li>
                  <li>保存后等待5-10分钟，刷新本页面</li>
                </ol>
                <p>详细文档：API_PERMISSION_ISSUE.md</p>
              </div>
            }
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}
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
                    realizedPnl: parseFloat(pos.realizedPnl || 0),
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
              title: '已实现盈亏',
              dataIndex: 'realizedPnl',
              key: 'realizedPnl',
              render: (val) => (
                <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                  {val >= 0 ? '+' : ''}${val.toFixed(2)}
                </span>
              ),
              sorter: (a, b) => a.realizedPnl - b.realizedPnl,
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
            emptyText: (() => {
              const hasPermissionIssue = Object.values(positionData).some(p => p.code === '-1');
              const hasPnL = totalPnL !== 0;
              
              if (hasPermissionIssue && hasPnL) {
                return (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#ff4d4f', marginBottom: '8px' }}>
                      🔒 <strong>API权限不足</strong>
                    </p>
                    <p style={{ color: '#999' }}>
                      检测到账户有持仓（未实现盈亏：${totalPnL.toFixed(2)}），但无法获取详情
                    </p>
                    <p style={{ color: '#999', marginTop: '8px' }}>
                      请在OKX平台更新API权限后刷新页面
                    </p>
                  </div>
                );
              }
              
              return '暂无持仓';
            })()
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
