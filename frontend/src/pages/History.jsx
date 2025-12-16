import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, DatePicker, message, Tag, Space, Statistic, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { accountAPI, historyAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const History = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [fillsData, setFillsData] = useState([]);
  const [pnlSummary, setPnlSummary] = useState({});

  useEffect(() => {
    loadAccounts();
  }, []);

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

  const handleSearch = async () => {
    if (selectedAccounts.length === 0) {
      message.warning('请选择至少一个账户');
      return;
    }

    try {
      setLoading(true);
      
      const begin = dateRange[0].valueOf().toString();
      const end = dateRange[1].valueOf().toString();
      
      // Load fills history
      const fillsRes = await historyAPI.getFillsHistory({
        account_names: selectedAccounts,
        inst_type: 'SWAP',
        begin,
        end,
        limit: 100
      });

      const allFills = [];
      Object.entries(fillsRes.data || {}).forEach(([accountName, accountData]) => {
        if (accountData.code === '0' && accountData.data) {
          accountData.data.forEach(fill => {
            allFills.push({
              ...fill,
              accountName,
              key: `${accountName}-${fill.tradeId}`
            });
          });
        }
      });
      
      setFillsData(allFills);

      // Load PnL summary
      const pnlRes = await historyAPI.getPnLSummary({
        account_names: selectedAccounts,
        inst_type: 'SWAP',
        begin,
        end
      });

      setPnlSummary(pnlRes.data || {});
    } catch (error) {
      message.error('加载历史数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total PnL across all accounts
  const calculateTotals = () => {
    let totalPnl = 0;
    let totalFee = 0;
    let totalTrades = 0;

    Object.values(pnlSummary).forEach(summary => {
      if (summary.code === '0' && summary.data) {
        totalPnl += summary.data.total_pnl || 0;
        totalFee += summary.data.total_fee || 0;
        totalTrades += summary.data.trade_count || 0;
      }
    });

    return {
      totalPnl,
      totalFee,
      netPnl: totalPnl - totalFee,
      totalTrades
    };
  };

  const totals = calculateTotals();

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
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '成交数量',
      dataIndex: 'fillSz',
      key: 'fillSz',
    },
    {
      title: '成交价格',
      dataIndex: 'fillPx',
      key: 'fillPx',
      render: (val) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: '手续费',
      dataIndex: 'fee',
      key: 'fee',
      render: (val) => {
        const fee = parseFloat(val);
        return (
          <span style={{ color: 'orange' }}>
            ${Math.abs(fee).toFixed(4)}
          </span>
        );
      },
    },
    {
      title: '盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      render: (val) => {
        const pnl = parseFloat(val);
        if (pnl === 0) return '-';
        return (
          <span style={{ color: pnl >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '成交时间',
      dataIndex: 'ts',
      key: 'ts',
      render: (val) => new Date(parseInt(val)).toLocaleString(),
    },
    {
      title: '订单ID',
      dataIndex: 'ordId',
      key: 'ordId',
      width: 150,
      ellipsis: true,
    },
  ];

  return (
    <div>
      <h1>历史记录</h1>
      
      {/* PnL calculation notice */}
      <Card style={{ marginTop: 16, background: '#fffbe6', border: '1px solid #ffe58f' }}>
        <div style={{ display: 'flex', alignItems: 'start' }}>
          <span style={{ fontSize: '18px', marginRight: '12px' }}>⚠️</span>
          <div>
            <strong>盈亏计算说明</strong>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>
              • 下方"总盈亏"仅显示<strong>完全平仓</strong>的交易盈亏，不包含部分平仓的盈利<br/>
              • 要查看<strong>部分平仓盈利</strong>和<strong>当前浮动盈亏</strong>，请前往 <strong>"仪表盘"</strong> 页面查看持仓详情<br/>
              • 持仓详情中的"已实现盈亏"包含所有平仓盈利（含部分平仓）
            </p>
          </div>
        </div>
      </Card>
      
      <Card style={{ marginTop: 24 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space>
            <Select
              mode="multiple"
              style={{ width: 300 }}
              placeholder="选择账户"
              value={selectedAccounts}
              onChange={setSelectedAccounts}
            >
              {accounts.map(acc => (
                <Option key={acc} value={acc}>{acc}</Option>
              ))}
            </Select>
            
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              showTime
            />
          </Space>
          
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            查询
          </Button>
        </Space>

        {Object.keys(pnlSummary).length > 0 && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总盈亏"
                  value={totals.totalPnl}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: totals.totalPnl >= 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总手续费"
                  value={totals.totalFee}
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
                  value={totals.netPnl}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: totals.netPnl >= 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="成交笔数"
                  value={totals.totalTrades}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Table
          columns={columns}
          dataSource={fillsData}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 条成交记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default History;
