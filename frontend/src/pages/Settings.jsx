import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, InputNumber, Button, message, Space, Divider, Alert, List
} from 'antd';
import { accountAPI, tradingAPI, marketAPI } from '../services/api';

const { Option } = Select;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [instruments, setInstruments] = useState([]);

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

  const handleSetLeverage = async (values) => {
    try {
      setLoading(true);
      const res = await tradingAPI.setLeverage({
        account_names: values.account_names,
        inst_id: values.inst_id,
        lever: values.lever,
        mgn_mode: values.mgn_mode,
        pos_side: values.pos_side
      });

      if (res.code === '0') {
        message.success('杠杆设置成功');
        form.resetFields();
      } else {
        message.error(`杠杆设置失败: ${res.msg}`);
      }
    } catch (error) {
      message.error(`杠杆设置失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>设置</h1>
      
      <Card title="杠杆设置" style={{ marginTop: 24 }}>
        <Alert
          message="重要提示"
          description="设置杠杆前请确保账户没有对应合约的持仓，否则可能设置失败"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSetLeverage}
          initialValues={{
            mgn_mode: 'cross',
            lever: 10
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

          <Form.Item
            label="杠杆倍数"
            name="lever"
            rules={[{ required: true, message: '请输入杠杆倍数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="1-125"
              min={1}
              max={125}
            />
          </Form.Item>

          <Form.Item
            label="保证金模式"
            name="mgn_mode"
            rules={[{ required: true, message: '请选择保证金模式' }]}
          >
            <Select>
              <Option value="cross">全仓</Option>
              <Option value="isolated">逐仓</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="持仓方向 (双向持仓模式)"
            name="pos_side"
            extra="单向持仓模式可留空"
          >
            <Select placeholder="选择持仓方向" allowClear>
              <Option value="long">多</Option>
              <Option value="short">空</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              设置杠杆
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="系统信息" style={{ marginTop: 24 }}>
        <List>
          <List.Item>
            <List.Item.Meta
              title="配置的账户数量"
              description={`${accounts.length} 个账户`}
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              title="支持的合约类型"
              description="永续合约 (SWAP)"
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              title="可用合约"
              description={`${instruments.length} 个永续合约`}
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              title="仓位比例预设"
              description="10%, 20%, 25%, 33%, 50%, 66%, 100%"
            />
          </List.Item>
        </List>
      </Card>

      <Card title="功能说明" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h3>✅ 已实现功能</h3>
            <ul>
              <li>✔️ 多账户管理和协同交易</li>
              <li>✔️ 永续合约交易 (市价单/限价单)</li>
              <li>✔️ 条件单做多/做空</li>
              <li>✔️ 杠杆设置 (全仓/逐仓)</li>
              <li>✔️ 账户余额查询</li>
              <li>✔️ 持仓管理</li>
              <li>✔️ 挂单管理</li>
              <li>✔️ 一键取消所有订单 (包括条件单)</li>
              <li>✔️ 历史成交记录查询</li>
              <li>✔️ 盈亏统计 (含手续费)</li>
              <li>✔️ 比例开仓 (10%/20%/25%/33%/50%/66%/100%)</li>
              <li>✔️ 固定数量开仓</li>
              <li>✔️ 止盈止损设置</li>
              <li>✔️ 单账户操作</li>
              <li>✔️ 多账户协同操作</li>
            </ul>
          </div>

          <Divider />

          <div>
            <h3>📖 使用说明</h3>
            <ul>
              <li><strong>交易页面:</strong> 支持按比例或固定数量开仓，可设置止盈止损</li>
              <li><strong>持仓页面:</strong> 查看所有账户的持仓情况和未实现盈亏</li>
              <li><strong>订单管理:</strong> 查看和管理挂单、条件单，支持一键取消</li>
              <li><strong>历史记录:</strong> 查看成交历史和盈亏统计</li>
              <li><strong>设置页面:</strong> 设置合约杠杆倍数</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Settings;
