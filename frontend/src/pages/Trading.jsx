import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, Input, Button, InputNumber, Switch, message,
  Radio, Space, Divider, Alert, Row, Col, Tabs
} from 'antd';
import { accountAPI, tradingAPI, marketAPI } from '../services/api';
import { filterInstruments, getShortName } from '../config/instruments';

const { Option } = Select;

const POSITION_SIZE_PRESETS = [10, 20, 25, 33, 50, 66, 100];
const STOP_LOSS_PRESETS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const TAKE_PROFIT_PRESETS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const Trading = () => {
  const [form] = Form.useForm();
  const [conditionalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [orderType, setOrderType] = useState('normal'); // 'normal' or 'conditional'
  const [orderMode, setOrderMode] = useState('percentage'); // 'percentage' or 'fixed'
  const [slTpMode, setSlTpMode] = useState('percentage'); // 'percentage' or 'price' for stop-loss/take-profit
  const [activeTab, setActiveTab] = useState('normal'); // 'normal' or 'conditional'

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
        // Filter to only show allowed instruments
        const filtered = filterInstruments(res.data || []);
        setInstruments(filtered);
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
      
      // Calculate stop-loss and take-profit prices from percentages
      let slTriggerPx = values.sl_trigger_px;
      let tpTriggerPx = values.tp_trigger_px;
      
      if (slTpMode === 'percentage') {
        const currentPrice = values.current_price || (ticker ? parseFloat(ticker.last) : null);
        const leverage = values.leverage || 1;
        
        if (!currentPrice) {
          message.error('无法获取当前价格，请选择合约后再提交');
          setLoading(false);
          return;
        }
        
        // Calculate stop-loss price based on actual P&L percentage
        // Formula: actual P&L% = price change% × leverage
        // So: price change% = actual P&L% / leverage
        if (values.sl_percentage) {
          const priceChangePercent = values.sl_percentage / leverage;
          if (values.side === 'buy') {
            // Long position: stop-loss below entry price
            // Example: 10x leverage, 5% loss → price drops 0.5%
            slTriggerPx = (currentPrice * (1 - priceChangePercent / 100)).toFixed(2);
          } else {
            // Short position: stop-loss above entry price
            // Example: 10x leverage, 5% loss → price rises 0.5%
            slTriggerPx = (currentPrice * (1 + priceChangePercent / 100)).toFixed(2);
          }
        }
        
        // Calculate take-profit price based on actual P&L percentage
        if (values.tp_percentage) {
          const priceChangePercent = values.tp_percentage / leverage;
          if (values.side === 'buy') {
            // Long position: take-profit above entry price
            // Example: 10x leverage, 10% profit → price rises 1%
            tpTriggerPx = (currentPrice * (1 + priceChangePercent / 100)).toFixed(2);
          } else {
            // Short position: take-profit below entry price
            // Example: 10x leverage, 10% profit → price drops 1%
            tpTriggerPx = (currentPrice * (1 - priceChangePercent / 100)).toFixed(2);
          }
        }
      }
      
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
          sl_trigger_px: slTriggerPx?.toString(),
          tp_trigger_px: tpTriggerPx?.toString(),
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
          sl_trigger_px: slTriggerPx?.toString(),
          sl_ord_px: values.sl_ord_px?.toString() || '-1',
          tp_trigger_px: tpTriggerPx?.toString(),
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

  const handleConditionalOrderSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Get current price from ticker or use trigger price as reference
      const currentPrice = ticker ? parseFloat(ticker.last) : parseFloat(values.trigger_px);
      
      if (!currentPrice) {
        message.error('无法获取当前价格，请先选择合约');
        setLoading(false);
        return;
      }

      // Get account balance to calculate position size
      const balanceResponse = await accountAPI.getBalance(values.account_names);
      
      if (balanceResponse.code !== '0') {
        message.error('获取账户余额失败');
        setLoading(false);
        return;
      }

      // Calculate available balance (USDT)
      let totalAvailableBalance = 0;
      Object.values(balanceResponse.data).forEach(accountData => {
        if (accountData.code === '0' && accountData.data) {
          accountData.data.forEach(balanceInfo => {
            balanceInfo.details?.forEach(detail => {
              if (detail.ccy === 'USDT') {
                totalAvailableBalance += parseFloat(detail.availBal || 0);
              }
            });
          });
        }
      });

      if (totalAvailableBalance === 0) {
        message.error('账户可用余额不足');
        setLoading(false);
        return;
      }

      // Calculate position size based on percentage and leverage
      const percentage = values.percentage || 50;
      const leverage = values.leverage || 1;
      const positionValue = totalAvailableBalance * (percentage / 100) * leverage;
      
      // Calculate contract size (for SWAP, 1 contract = 1 USD value)
      const sz = Math.floor(positionValue / currentPrice);

      if (sz < 1) {
        message.error('计算出的合约数量小于1，请增加仓位比例或杠杆');
        setLoading(false);
        return;
      }

      // Calculate stop-loss and take-profit prices based on percentages
      let slTriggerPx = null;
      let tpTriggerPx = null;
      
      if (values.conditional_sl_percentage || values.conditional_tp_percentage) {
        const triggerPrice = parseFloat(values.trigger_px);
        
        // Calculate stop-loss price (percentage based on actual P&L)
        if (values.conditional_sl_percentage) {
          const priceChangePercent = values.conditional_sl_percentage / leverage;
          if (values.side === 'buy') {
            // Long position: stop-loss below trigger price
            slTriggerPx = (triggerPrice * (1 - priceChangePercent / 100)).toFixed(2);
          } else {
            // Short position: stop-loss above trigger price
            slTriggerPx = (triggerPrice * (1 + priceChangePercent / 100)).toFixed(2);
          }
        }
        
        // Calculate take-profit price (percentage based on actual P&L)
        if (values.conditional_tp_percentage) {
          const priceChangePercent = values.conditional_tp_percentage / leverage;
          if (values.side === 'buy') {
            // Long position: take-profit above trigger price
            tpTriggerPx = (triggerPrice * (1 + priceChangePercent / 100)).toFixed(2);
          } else {
            // Short position: take-profit below trigger price
            tpTriggerPx = (triggerPrice * (1 - priceChangePercent / 100)).toFixed(2);
          }
        }
      }

      const result = await tradingAPI.placeConditionalOrder({
        account_names: values.account_names,
        inst_id: values.inst_id,
        side: values.side,
        sz: sz.toString(),
        trigger_px: values.trigger_px?.toString(),
        order_px: values.order_px?.toString() || '-1',
        td_mode: values.td_mode,
        pos_side: values.pos_side,
        sl_trigger_px: slTriggerPx,
        tp_trigger_px: tpTriggerPx,
      });

      if (result.code === '0') {
        let successMsg = `条件单提交成功（不占用资金）- 数量：${sz}张`;
        if (slTriggerPx || tpTriggerPx) {
          successMsg += '\n';
          if (slTriggerPx) successMsg += `止损价: $${slTriggerPx} `;
          if (tpTriggerPx) successMsg += `止盈价: $${tpTriggerPx}`;
        }
        message.success(successMsg);
        conditionalForm.resetFields();
      } else {
        message.error(`条件单提交失败: ${result.msg}`);
      }
    } catch (error) {
      message.error(`条件单提交失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>交易</h1>
      
      <Row gutter={16}>
        <Col span={16}>
          <Card style={{ marginTop: 24 }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'normal',
                  label: '开仓交易',
                  children: (
                    <div>
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

              <Alert
                message="止盈止损说明"
                description="百分比基于实际盈亏计算。例如：10倍杠杆，设置5%止损，则价格变动0.5%时触发止损。"
                type="info"
                showIcon
                closable
                style={{ marginBottom: 16 }}
              />

              <Form.Item label="止盈止损模式">
                <Radio.Group value={slTpMode} onChange={(e) => setSlTpMode(e.target.value)}>
                  <Radio.Button value="percentage">实际盈亏百分比</Radio.Button>
                  <Radio.Button value="price">价格</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {slTpMode === 'percentage' ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="止盈百分比 (%)"
                      name="tp_percentage"
                      extra="基于实际盈亏，例如：10% = 盈利10%时平仓"
                    >
                      <Select
                        placeholder="选择止盈百分比"
                        allowClear
                      >
                        {TAKE_PROFIT_PRESETS.map(p => (
                          <Option key={p} value={p}>{p}% 盈利</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="止损百分比 (%)"
                      name="sl_percentage"
                      extra="基于实际盈亏，例如：5% = 亏损5%时平仓"
                    >
                      <Select
                        placeholder="选择止损百分比"
                        allowClear
                      >
                        {STOP_LOSS_PRESETS.map(p => (
                          <Option key={p} value={p}>{p}% 亏损</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Row gutter={16}>
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
                </Row>
              )}

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  提交订单
                </Button>
              </Form.Item>
            </Form>
                    </div>
                  ),
                },
                {
                  key: 'conditional',
                  label: '条件单（不占用资金）',
                  children: (
                    <div>
                      <Alert
                        message="条件单说明"
                        description="条件单是预设订单，当市场价格达到触发价时自动执行。条件单不会占用账户资金，适合用于抄底或逃顶。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      <Form
                        form={conditionalForm}
                        layout="vertical"
                        onFinish={handleConditionalOrderSubmit}
                        initialValues={{
                          td_mode: 'cross',
                          percentage: 50,
                          leverage: 10,
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
                              label="保证金模式"
                              name="td_mode"
                            >
                              <Select>
                                <Option value="cross">全仓</Option>
                                <Option value="isolated">逐仓</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          label="仓位比例"
                          name="percentage"
                          rules={[{ required: true, message: '请选择仓位比例' }]}
                          extra="选择使用多少比例的可用余额（条件单不占用资金，仅用于计算触发后的开仓数量）"
                        >
                          <Select placeholder="选择仓位比例">
                            {POSITION_SIZE_PRESETS.map(p => (
                              <Option key={p} value={p}>{p}%</Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Alert
                          message="数量计算说明"
                          description={
                            <div>
                              系统将根据：<strong>可用余额 × 仓位比例 × 杠杆 ÷ 当前价格</strong> 自动计算合约数量。
                              <br />
                              例如：余额$1000，50%仓位，10倍杠杆，BTC价格$50000 → 合约数量 = 1000 × 0.5 × 10 ÷ 50000 = 0.1张
                            </div>
                          }
                          type="success"
                          showIcon
                          closable
                          style={{ marginBottom: 16 }}
                        />

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="触发价格"
                              name="trigger_px"
                              rules={[{ required: true, message: '请输入触发价格' }]}
                              extra="当市场价格达到此价格时触发订单"
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                placeholder="触发价"
                                min={0}
                                step={0.01}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label="杠杆倍数"
                              name="leverage"
                              extra="设置杠杆倍数（1-125x）"
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                placeholder="杠杆倍数"
                                min={1}
                                max={125}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          label="委托价格"
                          name="order_px"
                          extra="触发后的委托价格，留空或-1表示市价"
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="委托价（-1为市价）"
                            min={-1}
                            step={0.01}
                          />
                        </Form.Item>

                        <Divider>止盈止损设置（可选）</Divider>

                        <Alert
                          message="条件单止盈止损说明"
                          description="条件单触发后，将自动设置止盈止损。百分比基于实际盈亏，会根据杠杆自动计算触发价格。"
                          type="info"
                          showIcon
                          closable
                          style={{ marginBottom: 16 }}
                        />

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="止盈百分比 (%)"
                              name="conditional_tp_percentage"
                              extra="基于实际盈亏，例如：10% = 盈利10%时平仓"
                            >
                              <Select
                                placeholder="选择止盈百分比（可选）"
                                allowClear
                              >
                                {TAKE_PROFIT_PRESETS.map(p => (
                                  <Option key={p} value={p}>{p}% 盈利</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label="止损百分比 (%)"
                              name="conditional_sl_percentage"
                              extra="基于实际盈亏，例如：5% = 亏损5%时平仓"
                            >
                              <Select
                                placeholder="选择止损百分比（可选）"
                                allowClear
                              >
                                {STOP_LOSS_PRESETS.map(p => (
                                  <Option key={p} value={p}>{p}% 亏损</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          label="持仓方向"
                          name="pos_side"
                        >
                          <Select placeholder="单向持仓可留空" allowClear>
                            <Option value="long">多</Option>
                            <Option value="short">空</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item>
                          <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            提交条件单（不占用资金）
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  ),
                },
              ]}
            />
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
