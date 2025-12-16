import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, Input, Button, InputNumber, Switch, message,
  Radio, Space, Divider, Alert, Row, Col
} from 'antd';
import { accountAPI, tradingAPI, marketAPI } from '../services/api';

const { Option } = Select;

const POSITION_SIZE_PRESETS = [10, 20, 25, 33, 50, 66, 100];

const Trading = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [orderMode, setOrderMode] = useState('percentage'); // 'percentage' or 'fixed'

  useEffect(() => {
    loadAccounts();
    loadInstruments();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await accountAPI.getAccounts();
      setAccounts(res.data.accounts);
    } catch (error) {
      message.error('加载账户失败');
    }
  };

  const loadInstruments = async () => {
    try {
      const res = await marketAPI.getInstruments('SWAP');
      if (res.code === '0') {
        setInstruments(res.data || []);
      }
    } catch (error) {
      message.error('加载合约列表失败');
    }
  };

  const handleInstrumentChange = async (instId) => {
    try {
      const res = await marketAPI.getTicker(instId);
      if (res.code === '0' && res.data && res.data.length > 0) {
        setTicker(res.data[0]);
        form.setFieldsValue({
          current_price: parseFloat(res.data[0].last)
        });
      }
    } catch (error) {
      console.error('Failed to load ticker:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      let result;
      if (orderMode === 'percentage') {
        // Place order by percentage
        result = await tradingAPI.placeOrderByPercentage({
          account_names: values.account_names,
          inst_id: values.inst_id,
          side: values.side,
          percentage: values.percentage,
          current_price: values.current_price,
          leverage: values.leverage || 1,
          ord_type: values.ord_type,
          td_mode: values.td_mode,
          pos_side: values.pos_side,
          sl_trigger_px: values.sl_trigger_px?.toString(),
          tp_trigger_px: values.tp_trigger_px?.toString(),
        });
      } else {
        // Place order with fixed size
        result = await tradingAPI.placeOrder({
          account_names: values.account_names,
          inst_id: values.inst_id,
          side: values.side,
          ord_type: values.ord_type,
          sz: values.sz?.toString(),
          px: values.px?.toString(),
          td_mode: values.td_mode,
          pos_side: values.pos_side,
          sl_trigger_px: values.sl_trigger_px?.toString(),
          sl_ord_px: values.sl_ord_px?.toString() || '-1',
          tp_trigger_px: values.tp_trigger_px?.toString(),
          tp_ord_px: values.tp_ord_px?.toString() || '-1',
        });
      }

      if (result.code === '0') {
        message.success('订单提交成功');
        form.resetFields();
      } else {
        message.error(`订单提交失败: ${result.msg}`);
      }
    } catch (error) {
      message.error(`订单提交失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>交易</h1>
      
      <Row gutter={16}>
        <Col span={16}>
          <Card title="下单" style={{ marginTop: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                ord_type: 'market',
                td_mode: 'cross',
                leverage: 10,
                percentage: 50,
              }}
            >
              <Form.Item
                label="账户选择"
                name="account_names"
                rules={[{ required: true, message: '请选择账户' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择一个或多个账户"
                  allowClear
                >
                  {accounts.map(acc => (
                    <Option key={acc} value={acc}>{acc}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="合约"
                name="inst_id"
                rules={[{ required: true, message: '请选择合约' }]}
              >
                <Select
                  showSearch
                  placeholder="选择合约 (例如: BTC-USDT-SWAP)"
                  onChange={handleInstrumentChange}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {instruments.map(inst => (
                    <Option key={inst.instId} value={inst.instId}>
                      {inst.instId}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="方向"
                    name="side"
                    rules={[{ required: true, message: '请选择方向' }]}
                  >
                    <Radio.Group>
                      <Radio.Button value="buy" style={{ color: 'green' }}>做多</Radio.Button>
                      <Radio.Button value="sell" style={{ color: 'red' }}>做空</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="订单类型"
                    name="ord_type"
                  >
                    <Radio.Group>
                      <Radio.Button value="market">市价</Radio.Button>
                      <Radio.Button value="limit">限价</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="下单模式">
                <Radio.Group value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                  <Radio.Button value="percentage">按比例</Radio.Button>
                  <Radio.Button value="fixed">固定数量</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {orderMode === 'percentage' ? (
                <>
                  <Form.Item
                    label="仓位比例"
                    name="percentage"
                    rules={[{ required: true, message: '请选择比例' }]}
                  >
                    <Select placeholder="选择仓位比例">
                      {POSITION_SIZE_PRESETS.map(p => (
                        <Option key={p} value={p}>{p}%</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="当前价格"
                    name="current_price"
                    rules={[{ required: true, message: '请输入当前价格' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="当前市场价格"
                      min={0}
                      step={0.01}
                    />
                  </Form.Item>

                  <Form.Item
                    label="杠杆"
                    name="leverage"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="杠杆倍数"
                      min={1}
                      max={125}
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    label="数量"
                    name="sz"
                    rules={[{ required: true, message: '请输入数量' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="合约数量"
                      min={1}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => 
                      prevValues.ord_type !== currentValues.ord_type
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('ord_type') === 'limit' ? (
                        <Form.Item
                          label="价格"
                          name="px"
                          rules={[{ required: true, message: '请输入价格' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="限价单价格"
                            min={0}
                            step={0.01}
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="保证金模式"
                    name="td_mode"
                  >
                    <Select>
                      <Option value="cross">全仓</Option>
                      <Option value="isolated">逐仓</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="持仓方向"
                    name="pos_side"
                  >
                    <Select placeholder="单向持仓可留空" allowClear>
                      <Option value="long">多</Option>
                      <Option value="short">空</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider>止盈止损设置</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="止损触发价格"
                    name="sl_trigger_px"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="止损触发价"
                      min={0}
                      step={0.01}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="止盈触发价格"
                    name="tp_trigger_px"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="止盈触发价"
                      min={0}
                      step={0.01}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  提交订单
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {ticker && (
            <Card title="实时行情" style={{ marginTop: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>合约:</strong> {ticker.instId}
                </div>
                <div>
                  <strong>最新价:</strong> <span style={{ fontSize: 24, color: '#1890ff' }}>${ticker.last}</span>
                </div>
                <div>
                  <strong>24h最高:</strong> ${ticker.high24h}
                </div>
                <div>
                  <strong>24h最低:</strong> ${ticker.low24h}
                </div>
                <div>
                  <strong>24h成交量:</strong> {ticker.vol24h}
                </div>
                <div>
                  <strong>24h涨跌:</strong>{' '}
                  <span style={{ color: parseFloat(ticker.last) >= parseFloat(ticker.open24h) ? 'green' : 'red' }}>
                    {((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h) * 100).toFixed(2)}%
                  </span>
                </div>
              </Space>
            </Card>
          )}

          <Alert
            message="交易提示"
            description="支持多账户协同交易，可设置止盈止损，建议先设置好杠杆再进行交易"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Trading;
