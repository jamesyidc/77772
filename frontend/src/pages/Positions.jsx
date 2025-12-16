import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, message, Tag, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { accountAPI } from '../services/api';

const { Option } = Select;

const Positions = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [positionsData, setPositionsData] = useState([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccounts.length > 0) {
      loadPositions();
    }
  }, [selectedAccounts]);

  const loadAccounts = async () => {
    try {
      const res = await accountAPI.getAccounts();
      const accountList = res.data.accounts;
      setAccounts(accountList);
      setSelectedAccounts(accountList); // Select all by default
    } catch (error) {
      message.error('加载账户失败');
    }
  };

  const loadPositions = async () => {
    try {
      setLoading(true);
      const res = await accountAPI.getPositions(selectedAccounts, 'SWAP');
      
      const allPositions = [];
      Object.entries(res.data || {}).forEach(([accountName, accountData]) => {
        if (accountData.code === '0' && accountData.data) {
          accountData.data.forEach(pos => {
            allPositions.push({
              ...pos,
              accountName,
              key: `${accountName}-${pos.instId}-${pos.posId}`
            });
          });
        }
      });
      
      setPositionsData(allPositions);
    } catch (error) {
      message.error('加载持仓失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '账户',
      dataIndex: 'accountName',
      key: 'accountName',
      fixed: 'left',
    },
    {
      title: '合约',
      dataIndex: 'instId',
      key: 'instId',
      fixed: 'left',
    },
    {
      title: '方向',
      dataIndex: 'posSide',
      key: 'posSide',
      render: (side) => (
        <Tag color={side === 'long' ? 'green' : side === 'short' ? 'red' : 'blue'}>
          {side === 'long' ? '多' : side === 'short' ? '空' : side}
        </Tag>
      ),
    },
    {
      title: '持仓量',
      dataIndex: 'pos',
      key: 'pos',
    },
    {
      title: '可平仓量',
      dataIndex: 'availPos',
      key: 'availPos',
    },
    {
      title: '平均开仓价',
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
      title: '杠杆',
      dataIndex: 'lever',
      key: 'lever',
      render: (val) => `${val}x`,
    },
    {
      title: '保证金',
      dataIndex: 'margin',
      key: 'margin',
      render: (val) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: '未实现盈亏',
      dataIndex: 'upl',
      key: 'upl',
      render: (val) => (
        <span style={{ color: parseFloat(val) >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {parseFloat(val) >= 0 ? '+' : ''}${parseFloat(val).toFixed(2)}
        </span>
      ),
    },
    {
      title: '未实现盈亏率',
      dataIndex: 'uplRatio',
      key: 'uplRatio',
      render: (val) => (
        <span style={{ color: parseFloat(val) >= 0 ? 'green' : 'red' }}>
          {parseFloat(val) >= 0 ? '+' : ''}{(parseFloat(val) * 100).toFixed(2)}%
        </span>
      ),
    },
    {
      title: '保证金模式',
      dataIndex: 'mgnMode',
      key: 'mgnMode',
      render: (mode) => mode === 'cross' ? '全仓' : '逐仓',
    },
  ];

  return (
    <div>
      <h1>持仓管理</h1>
      
      <Card style={{ marginTop: 24 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Select
            mode="multiple"
            style={{ width: 400 }}
            placeholder="选择账户"
            value={selectedAccounts}
            onChange={setSelectedAccounts}
          >
            {accounts.map(acc => (
              <Option key={acc} value={acc}>{acc}</Option>
            ))}
          </Select>
          
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadPositions}
            loading={loading}
          >
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={positionsData}
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 条持仓`,
          }}
        />
      </Card>
    </div>
  );
};

export default Positions;
