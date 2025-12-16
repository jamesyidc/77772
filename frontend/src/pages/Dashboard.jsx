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

  // Calculate total unrealized PnL
  const calculateTotalPnL = () => {
    let total = 0;
    Object.values(positionData).forEach(positions => {
      if (positions.code === '0' && positions.data) {
        positions.data.forEach(pos => {
          total += parseFloat(pos.upl || 0);
        });
      }
    });
    return total;
  };

  const totalBalance = calculateTotalBalance();
  const totalPnL = calculateTotalPnL();

  // Prepare account table data
  const accountTableData = accounts.map(accountName => {
    const balance = balanceData[accountName];
    const positions = positionData[accountName];
    
    let accountBalance = 0;
    let accountPnL = 0;
    let positionCount = 0;

    if (balance?.code === '0' && balance.data) {
      balance.data.forEach(acc => {
        acc.details?.forEach(detail => {
          if (detail.ccy === 'USDT') {
            accountBalance = parseFloat(detail.eq || 0);
          }
        });
      });
    }

    if (positions?.code === '0' && positions.data) {
      positionCount = positions.data.length;
      positions.data.forEach(pos => {
        accountPnL += parseFloat(pos.upl || 0);
      });
    }

    return {
      key: accountName,
      account: accountName,
      balance: accountBalance,
      pnl: accountPnL,
      positions: positionCount,
    };
  });

  const columns = [
    {
      title: '账户名称',
      dataIndex: 'account',
      key: 'account',
    },
    {
      title: '账户余额 (USDT)',
      dataIndex: 'balance',
      key: 'balance',
      render: (val) => `$${val.toFixed(2)}`,
    },
    {
      title: '未实现盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red' }}>
          {val >= 0 ? '+' : ''}${val.toFixed(2)}
        </span>
      ),
    },
    {
      title: '持仓数量',
      dataIndex: 'positions',
      key: 'positions',
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
