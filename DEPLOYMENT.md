# OKX 交易系统部署指南

## 快速部署

### 方式一：使用启动脚本（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 OKX API 密钥

# 2. 运行启动脚本
./start.sh
```

### 方式二：手动启动

```bash
# 1. 安装依赖
pip install -r requirements.txt
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动后端（终端1）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 4. 启动前端（终端2）
npm run dev
```

## 生产环境部署

### 使用 Docker（推荐）

创建 `Dockerfile`:

```dockerfile
# Backend stage
FROM python:3.9-slim as backend

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY .env .

# Frontend stage
FROM node:18-alpine as frontend

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY frontend ./frontend
COPY vite.config.js .
RUN npm run build

# Production stage
FROM python:3.9-slim

WORKDIR /app
COPY --from=backend /app /app
COPY --from=frontend /app/dist /app/dist

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  okx-trading:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

运行:

```bash
docker-compose up -d
```

### 使用 PM2（Node.js 进程管理）

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'okx-backend',
      script: 'uvicorn',
      args: 'backend.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'python',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'okx-frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

运行:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 使用 Systemd（Linux 系统服务）

创建 `/etc/systemd/system/okx-trading.service`:

```ini
[Unit]
Description=OKX Trading System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/okx-trading-system
Environment="PATH=/usr/local/bin:/usr/bin"
ExecStart=/usr/local/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl enable okx-trading
sudo systemctl start okx-trading
sudo systemctl status okx-trading
```

## 配置说明

### 环境变量

在 `.env` 文件中配置:

```env
# 服务器配置
PORT=8000
HOST=0.0.0.0

# 密钥（生产环境务必修改）
SECRET_KEY=your-strong-secret-key-here

# OKX API 配置 - 账户1
ACCOUNT1_API_KEY=your-api-key
ACCOUNT1_SECRET_KEY=your-secret-key
ACCOUNT1_PASSPHRASE=your-passphrase

# OKX API 配置 - 账户2（可选）
ACCOUNT2_API_KEY=your-api-key
ACCOUNT2_SECRET_KEY=your-secret-key
ACCOUNT2_PASSPHRASE=your-passphrase

# OKX API 端点
OKX_API_URL=https://www.okx.com
OKX_WS_URL=wss://ws.okx.com:8443/ws/v5/public

# 交易配置
DEFAULT_LEVERAGE=10
MAX_RETRY_ATTEMPTS=3
REQUEST_TIMEOUT=10
```

### Nginx 反向代理配置

创建 `/etc/nginx/sites-available/okx-trading`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # API 文档
    location /docs {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

启用配置:

```bash
sudo ln -s /etc/nginx/sites-available/okx-trading /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL 证书配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 安全最佳实践

### 1. API 密钥管理

- ✅ 使用环境变量存储密钥
- ✅ 不要将 `.env` 文件提交到版本控制
- ✅ 使用子账户 API 密钥
- ✅ 设置 IP 白名单
- ✅ 定期更换密钥
- ✅ 最小权限原则

### 2. 网络安全

- ✅ 使用 HTTPS（SSL/TLS）
- ✅ 配置防火墙规则
- ✅ 限制访问 IP
- ✅ 使用 VPN 连接
- ✅ 启用 CORS 白名单

### 3. 系统安全

- ✅ 定期更新依赖包
- ✅ 使用强密码
- ✅ 启用日志记录
- ✅ 定期备份数据
- ✅ 监控系统资源

### 4. 防火墙配置

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

## 监控和日志

### 日志配置

修改 `backend/main.py` 添加日志:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
```

### 系统监控

使用 PM2 监控:

```bash
pm2 monit
pm2 logs
```

使用 systemd 监控:

```bash
sudo journalctl -u okx-trading -f
```

## 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   sudo lsof -i :8000
   sudo kill -9 <PID>
   ```

2. **依赖安装失败**
   ```bash
   pip install --upgrade pip
   npm cache clean --force
   ```

3. **API 连接失败**
   - 检查 API 密钥是否正确
   - 检查 IP 白名单设置
   - 检查网络连接

4. **前端无法访问后端**
   - 检查 CORS 配置
   - 检查代理设置
   - 检查防火墙规则

### 日志查看

```bash
# 后端日志
tail -f logs/app.log

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 日志
pm2 logs okx-backend
```

## 性能优化

### 1. 后端优化

- 使用 Redis 缓存
- 启用 gzip 压缩
- 使用连接池
- 异步处理

### 2. 前端优化

- 代码分割
- 懒加载
- CDN 加速
- 图片优化

### 3. 数据库优化

- 添加索引
- 查询优化
- 连接池配置

## 备份和恢复

### 数据备份

```bash
# 备份配置文件
tar -czf backup-$(date +%Y%m%d).tar.gz .env logs/

# 上传到云存储
# aws s3 cp backup-*.tar.gz s3://your-bucket/
```

### 恢复数据

```bash
# 解压备份
tar -xzf backup-20240101.tar.gz

# 恢复配置
cp .env.backup .env
```

## 更新和维护

### 更新系统

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
pip install -r requirements.txt --upgrade
npm install

# 重启服务
pm2 restart all
# 或
sudo systemctl restart okx-trading
```

### 定期维护

- 每周检查日志
- 每月更新依赖
- 每季度审核安全配置
- 定期备份数据

## 支持

如有问题，请查看:
- GitHub Issues
- 文档: README.md
- API 文档: http://localhost:8000/docs

---

**警告**: 请务必保护好你的 API 密钥，不要在公共环境中暴露。交易有风险，投资需谨慎！
