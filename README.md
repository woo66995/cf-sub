# CF-Sub 优选IP订阅生成器

基于 Cloudflare Workers 的轻量级订阅转换工具。

## ✨ 功能

- 支持 VMess / VLESS / Trojan 协议解析
- 支持批量替换服务器地址为优选 IP（可选，不填则纯格式转换）
- 自动生成多格式订阅：Raw (V2rayN)、Clash、Surge
- 支持二维码生成，方便移动端导入
- KV 短链接存储，自动去重（需绑定 KV 命名空间）
- 无 KV 时自动降级为内联模式
- 通过环境变量集成 Google Ads（可选）
- 访问令牌保护（可选）
- 完善的 SEO meta 标签

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 部署到 Cloudflare
npm run deploy
```

## ⚙️ 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `SUB_ACCESS_TOKEN` | 订阅访问令牌 | 否 |
| `GOOGLE_ADS_CLIENT` | Google AdSense 客户端 ID | 否 |
| `GOOGLE_ADS_SLOT` | Google AdSense 广告位 ID | 否 |
| `SITE_TITLE` | 自定义站点标题 | 否 |
| `SITE_DESCRIPTION` | 自定义站点描述 | 否 |

## 📖 部署指南

详细中文部署指南请查看 [Deploy_Guide.CN.md](./Deploy_Guide.CN.md)。

## 📄 License

MIT
