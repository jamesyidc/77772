import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, message, Tag, Space, Modal, Tabs } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { accountAPI, tradingAPI } from '../services/api';

const { Option } = Select;
const { confirm } = Modal;

const Orders = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [regularOrders, setRegularOrders] = useState([]);
  const [algoOrders, setAlgoOrders] = useState([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccounts.length > 0) {
      loadOrders();
    }
  }, [selectedAccounts]);

  const loadAccounts = async () => {
    try {
      const res = await accountAPI.getAccounts();
      const accountList = res.data.accounts;
      setAccounts(accountList);
      setSelectedAccounts(accountList);
    } catch (error) {
      message.error('加载账户失败');
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await accountAPI.getPendingOrders(selectedAccounts, 'SWAP');
      
      const allRegularOrders = [];
      const allAlgoOrders = [];
      
      Object.entries(res.data || {}).forEach(([accountName, accountData]) => {
        // Regular orders
        if (accountData.regular_orders?.code === '0' && accountData.regular_orders.data) {
          accountData.regular_orders.data.forEach(order => {
            allRegularOrders.push({
              ...order,
              accountName,
              key: `${accountName}-${order.ordId}`
            });
          });
        }
        
        // Algo orders
        if (accountData.algo_orders?.code === '0' && accountData.algo_orders.data) {
          accountData.algo_orders.data.forEach(order => {
            allAlgoOrders.push({
              ...order,
              accountName,
              key: `${accountName}-${order.algoId}`
            });
          });
        }
      });
      
      setRegularOrders(allRegularOrders);
      setAlgoOrders(allAlgoOrders);
    } catch (error) {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAll = () => {
    confirm({
      title: '确认取消所有订单？',
      icon: <ExclamationCircleOutlined />,
      content: '这将取消所选账户的所有挂单和条件单',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const res = await tradingAPI.cancelAllOrders({
            account_names: selectedAccounts
          });
          
          if (res.code === '0') {
            message.success('所有订单已取消');
            loadOrders();
          } else {
            message.error('取消订单失败');
          }
        } catch (error) {
          message.error(`取消订单失败: ${error.message}`);
        }
      },
    });
  };

  const regularOrderColumns = [
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
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '订单类型',
      dataIndex: 'ordType',
      key: 'ordType',
      render: (type) => {
        const typeMap = {
          'limit': '限价',
          'market': '市价',
          'post_only': '只做Maker',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '数量',
      dataIndex: 'sz',
      key: 'sz',
    },
    {
      title: '已成交',
      dataIndex: 'accFillSz',
      key: 'accFillSz',
    },
    {
      title: '价格',
      dataIndex: 'px',
      key: 'px',
      render: (val) => val ? `$${parseFloat(val).toFixed(2)}` : '-',
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const stateMap = {
          'live': { text: '未成交', color: 'blue' },
          'partially_filled': { text: '部分成交', color: 'orange' },
          'canceled': { text: '已取消', color: 'default' },
        };
        const s = stateMap[state] || { text: state, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'cTime',
      key: 'cTime',
      render: (val) => new Date(parseInt(val)).toLocaleString(),
    },
  ];

  const algoOrderColumns = [
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
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '订单类型',
      dataIndex: 'ordType',
      key: 'ordType',
      render: (type) => {
        const typeMap = {
          'conditional': '条件单',
          'oco': 'OCO',
          'trigger': '触发单',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '数量',
      dataIndex: 'sz',
      key: 'sz',
    },
    {
      title: '触发价',
      dataIndex: 'triggerPx',
      key: 'triggerPx',
      render: (val) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: '委托价',
      dataIndex: 'orderPx',
      key: 'orderPx',
      render: (val) => val === '-1' ? '市价' : `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const stateMap = {
          'live': { text: '等待中', color: 'blue' },
          'effective': { text: '已生效', color: 'green' },
          'canceled': { text: '已取消', color: 'default' },
        };
        const s = stateMap[state] || { text: state, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'cTime',
      key: 'cTime',
      render: (val) => new Date(parseInt(val)).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1>订单管理</h1>
      
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
          
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadOrders}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleCancelAll}
            >
              取消所有订单
            </Button>
          </Space>
        </Space>

        <Tabs
          items={[
            {
              key: 'regular',
              label: `挂单 (${regularOrders.length})`,
              children: (
                <Table
                  columns={regularOrderColumns}
                  dataSource={regularOrders}
                  loading={loading}
                  scroll={{ x: 1300 }}
                  pagination={{
                    pageSize: 20,
                    showTotal: (total) => `共 ${total} 条订单`,
                  }}
                />
              ),
            },
            {
              key: 'algo',
              label: `条件单 (${algoOrders.length})`,
              children: (
                <Table
                  columns={algoOrderColumns}
                  dataSource={algoOrders}
                  loading={loading}
                  scroll={{ x: 1300 }}
                  pagination={{
                    pageSize: 20,
                    showTotal: (total) => `共 ${total} 条订单`,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Orders;
