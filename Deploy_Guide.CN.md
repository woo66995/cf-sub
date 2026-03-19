# CF-Sub 部署指南（详细中文版）

> 本指南面向入门用户，每一步都有详细说明。部署后你将拥有一个公开的订阅转换工具，并可集成 Google Ads 广告变现。

---

## 目录

1. [前置准备](#1-前置准备)
2. [GitHub 仓库设置](#2-github-仓库设置)
3. [本地开发与测试](#3-本地开发与测试)
4. [创建 KV 命名空间](#4-创建-kv-命名空间)
5. [部署到 Cloudflare Workers](#5-部署到-cloudflare-workers)
6. [配置环境变量](#6-配置环境变量)
7. [绑定自定义域名](#7-绑定自定义域名)
8. [配置 GitHub 自动部署](#8-配置-github-自动部署)
9. [Google Ads 配置](#9-google-ads-配置)
10. [使用说明](#10-使用说明)
11. [SEO 与 GEO 优化建议](#11-seo-与-geo-优化建议)
12. [常见问题](#12-常见问题)

---

## 1. 前置准备

### 你需要准备

| 项目 | 说明 |
|------|------|
| **Cloudflare 账号** | 免费注册：https://dash.cloudflare.com/sign-up |
| **域名**（可选） | 已经添加到 Cloudflare 的域名，用于自定义访问地址 |
| **Node.js** | 版本 >= 18，下载：https://nodejs.org/ |
| **Git** | 下载：https://git-scm.com/ |
| **GitHub 账号** | https://github.com/ |

### 检查环境

打开终端（macOS 的 Terminal 或 Windows 的 PowerShell），运行以下命令确认工具已安装：

```bash
node --version    # 应显示 v18.x.x 或更高
npm --version     # 应显示 9.x.x 或更高
git --version     # 应显示 git version 2.x.x
```

---

## 2. GitHub 仓库设置

### 方法 A：创建新仓库（推荐）

1. 登录 GitHub，进入 https://github.com/new
2. 仓库名填写：`cf-sub`
3. 选择 **Public**（公开仓库）
4. 不要勾选"Add a README file"
5. 点击 **Create repository**

### 推送代码到 GitHub

在终端中执行以下命令：

```bash
# 进入项目目录
cd /Users/zhou/Antigravity/cf_sub

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "初始化 CF-Sub 订阅转换工具"

# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/woo66995/cf-sub.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

> 💡 **提示**：如果你是第一次使用 Git，可能需要配置用户名和邮箱：
> ```bash
> git config --global user.name "你的用户名"
> git config --global user.email "你的邮箱"
> ```

---

## 3. 本地开发与测试

```bash
# 安装项目依赖
npm install

# 启动本地开发服务器
npm run dev
```

启动后，终端会显示类似 `Ready on http://localhost:8787` 的信息。在浏览器中打开该地址即可预览。

> ⚠️ **注意**：本地开发时没有 KV 命名空间，系统会自动使用"内联模式"直接返回结果；部署后配置 KV 即可使用短链接模式。

---

## 4. 创建 KV 命名空间

KV 是 Cloudflare 提供的键值存储服务，用于保存生成的订阅短链接。

### 方法 A：通过控制台创建（推荐新手）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 左侧菜单点击 **Workers 和 Pages** → **KV**
3. 点击 **创建命名空间**
4. 名称填写：`CF_SUB_STORE`
5. 点击 **添加**
6. 创建完成后，记录下 **命名空间 ID**（一串字母数字）

### 方法 B：通过命令行创建

```bash
# 先登录 Cloudflare（会打开浏览器授权）
npx wrangler login

# 创建 KV 命名空间
npx wrangler kv namespace create SUB_STORE
```

终端会显示命名空间的 ID，类似：
```
{ binding = "SUB_STORE", id = "abc123..." }
```

### 更新配置文件

打开 `wrangler.toml`，将注释的 KV 配置取消注释，并填入你的命名空间 ID：

```toml
[[kv_namespaces]]
binding = "SUB_STORE"
id = "你复制的命名空间ID"
```

---

## 5. 部署到 Cloudflare Workers

### 首次部署

```bash
# 确保已登录 Cloudflare
npx wrangler login

# 部署
npm run deploy
```

部署成功后，终端会显示你的 Worker URL，类似：
```
Published cf-sub (x.xx sec)
  https://cf-sub.你的子域名.workers.dev
```

在浏览器中打开这个 URL，就能看到你的订阅转换工具了！本项目现已完美支持 **VMess、VLESS、Trojan、TUIC v5 和 Hysteria 2** 协议。

---

## 6. 配置环境变量

环境变量用于配置访问令牌、Google Ads 等功能。你可以通过两种方式设置：

### 方法 A：通过 Cloudflare 控制台（推荐）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 左侧菜单点击 **Workers 和 Pages**
3. 点击你的 Worker（`cf-sub`）
4. 点击 **设置** → **变量和机密**
5. 在"环境变量"部分点击 **添加**
6. 添加以下变量（按需）：

| 变量名 | 类型 | 示例值 | 用途 |
|--------|------|------|
| `SUB_ACCESS_TOKEN` | **Secret (机密)** | `mypassword123` | 保护订阅链接，防止被他人使用 |
| `GOOGLE_ADS_CLIENT` | **Text (文本)** | `ca-pub-xxxxxxxx` | Google AdSense 客户端 ID |
| `GOOGLE_ADS_SLOT` | **Text (文本)** | `xxxxxxxx` | Google AdSense 广告位 ID |
| `SITE_TITLE` | **Text (文本)** | `我的倍速转换器` | 覆盖默认站点标题 |
| `SITE_DESCRIPTION` | **Text (文本)** | `支持各种新协议...` | 覆盖默认 SEO 描述 |

7. 点击 **保存并部署**

### 方法 B：通过命令行

```bash
# 设置密钥（访问令牌建议用这个）
npx wrangler secret put SUB_ACCESS_TOKEN
# 然后输入你的密码

# 设置普通变量
npx wrangler secret put GOOGLE_ADS_CLIENT
npx wrangler secret put GOOGLE_ADS_SLOT
```

> 💡 **所有环境变量都是可选的**。不设置任何变量，工具也能正常运行，只是没有访问保护和广告。

---

## 7. 绑定自定义域名

如果你想用自己的域名（如 `sub.example.com`）访问，而不是 `xxx.workers.dev`：

### 方法 A：Custom Domains（推荐）

1. 在 Cloudflare 控制台 → Workers 和 Pages → 你的 Worker
2. 点击 **设置** → **域和路由**
3. 点击 **添加** → **自定义域**
4. 输入你的域名，如 `sub.example.com`
5. 点击 **添加域**

> Cloudflare 会自动配置 DNS 记录和 SSL 证书。

### 方法 B：Workers Routes

1. 在 Cloudflare 控制台 → 你的域名 → **Workers 路由**
2. 添加路由：`sub.example.com/*` → 选择 `cf-sub`
3. 确保 DNS 中有对应的 A 或 CNAME 记录（可以是空的代理记录）

---

## 8. 配置 GitHub 自动部署

设置后，每次推送代码到 GitHub，Cloudflare 就会自动重新部署。

### 步骤

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 左侧菜单点击 **Workers 和 Pages**
3. 点击 **创建** → **导入存储库**（或在你现有 Worker 的设置中关联 Git）
4. 选择 **GitHub** → 授权并选择仓库 `woo66995/cf-sub`
5. 配置构建设置：
   - **构建命令**: 留空（不需要构建）
   - **部署命令**: `npm run deploy`（或选择 Workers 类型）
6. 点击 **保存并部署**

### 替代方案：GitHub Actions

在 GitHub 仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

然后在 GitHub 仓库 → Settings → Secrets → Actions 中添加：
- `CF_API_TOKEN`：从 Cloudflare 控制台 → My Profile → API Tokens 创建

---

## 9. Google Ads 配置

### 9.1 申请 Google AdSense

1. 访问 https://www.google.com/adsense/start/
2. 使用你的 Google 账号登录
3. 填写你的网站地址（部署后的域名）
4. 按提示完成验证和审核
5. 审核通过后，你将获得：
   - **客户端 ID**（Publisher ID）：格式为 `ca-pub-xxxxxxxxxxxxxxxx`
   - **广告位 ID**（Ad Slot）：你在 AdSense 中创建的广告单元 ID

### 9.2 配置到 Worker

将上面获得的 ID 配置为环境变量：

1. **Cloudflare 控制台** → Workers → `cf-sub` → 设置 → 变量
2. 添加 `GOOGLE_ADS_CLIENT` = `ca-pub-xxxxxxxxxxxxxxxx`
3. 添加 `GOOGLE_ADS_SLOT` = `xxxxxxxxxx`
4. **保存并部署**

> 💡 广告会自动出现在页面顶部和底部。**不配置这两个变量时，页面完全正常运行，不显示任何广告代码。**

### 9.3 最大化广告收益

- 确保页面内容丰富，AdSense 审核更容易通过
- 添加 Privacy Policy 页面可以提高广告审批率
- 保持页面加载速度 — Workers 天然快速
- 适当增加关键词密度来提高广告匹配度

---

## 10. 使用说明

### 基本使用流程

1. 打开你的工具网址
2. 在"节点链接"框中粘贴你的 vmess:// / vless:// / trojan:// 链接
3. （可选）在"优选地址"框中输入优选 IP
4. 点击"生成订阅"
5. 复制对应客户端的订阅链接

### 客户端使用

| 客户端 | 使用哪个链接 |
|--------|-------------|
| V2rayN / V2rayNG | 原始订阅链接 or 自动识别 |
| Clash / Mihomo / Clash Verge | Clash 订阅链接 |
| Shadowrocket（小火箭） | 原始订阅链接 |
| Surge | Surge 订阅链接 |

---

## 11. SEO 与 GEO 优化建议

### 📈 SEO 优化（提高搜索引擎排名）

#### A. 技术 SEO（已内置）

本项目已内置以下 SEO 优化：
- ✅ 语义化 HTML5 标签
- ✅ 完整的 `<title>` 和 `<meta description>`
- ✅ Open Graph 社交分享标签
- ✅ `<link rel="canonical">` 规范链接
- ✅ 响应式设计（移动端友好）
- ✅ 快速加载（Workers 边缘计算）

#### B. 内容 SEO 增强建议

1. **自定义站点标题和描述**
   通过环境变量 `SITE_TITLE` 和 `SITE_DESCRIPTION` 设置包含关键词的标题：
   ```
   SITE_TITLE = "免费在线订阅转换器 - 支持VLESS/VMess/Trojan | CloudflareSub"
   SITE_DESCRIPTION = "免费的在线代理订阅转换工具，支持VLESS、VMess、Trojan协议，一键生成Clash、Surge、V2rayN订阅链接，支持Cloudflare优选IP替换"
   ```

2. **添加使用教程页面**
   可以增加 `/guide` 路由返回一个教程页面，包含图文教程内容，增加搜索引擎收录的页面数。

3. **添加 sitemap.xml**
   在 `public/` 目录创建 `sitemap.xml`，列出你的页面 URL。

4. **结构化数据 (JSON-LD)**
   在 HTML 中添加 SoftwareApplication 类型的结构化数据，帮助搜索引擎理解你的工具。

#### C. 外链建设

- 在 GitHub README 中加入你的部署链接
- 在技术论坛发表使用教程
- 在社交媒体分享
- 提交到在线工具导航站

### 🌍 GEO 优化（基于地理位置的优化）

#### A. Cloudflare 原生 GEO 能力

Cloudflare Workers 可以获取访问者的地理位置信息（`request.cf.country`），基于此你可以：

1. **自动推荐对应地区的优选 IP**
   可在 Worker 中读取 `request.cf.country`，根据用户所在国家/地区推荐最近的优选 IP 列表。

2. **多语言支持**
   根据 `request.headers.get('Accept-Language')` 自动展示对应语言的界面。

3. **区域化广告**
   Google Ads 会自动根据用户位置展示本地化广告，但你可以通过在不同语言版本的页面上使用不同关键词来优化。

#### B. 多区域部署

Cloudflare Workers 本身就是全球边缘部署，访问速度已经很快。额外可以：

1. 为不同地区设置不同的子域名（如 `hk.sub.example.com`）
2. 预设不同区域的优选 IP 列表
3. 在界面上显示用户所在位置并推荐相关配置

#### C. 搜索引擎本地化

1. 添加 `hreflang` 标签声明不同语言版本
2. 使用 Google Search Console 设置地理位置定向
3. 提交到 Bing Webmaster Tools 和百度搜索资源平台

#### D. 代码增强示例

在 `src/worker.js` 中添加 GEO 感知路由的示例：

```javascript
// 在 fetch 处理器中获取用户位置
const country = request.cf?.country || 'US';
const city = request.cf?.city || '';

// 可以在 API 响应中返回位置信息，前端据此推荐优选 IP
if (url.pathname === '/api/geo') {
  return json({
    country,
    city,
    colo: request.cf?.colo || '',
  });
}
```

---

## 12. 常见问题

### Q: 部署后访问页面是空白的？
A: 确认 `wrangler.toml` 中 `[assets]` 配置正确，`directory = "./public"` 指向正确目录。

### Q: 生成订阅时提示"未绑定 KV"？
A: 需要创建 KV 命名空间并在 `wrangler.toml` 中配置绑定。没有 KV 时也能用（内联模式），但不会生成短链接。

### Q: Google Ads 不显示？
A: 检查环境变量 `GOOGLE_ADS_CLIENT` 和 `GOOGLE_ADS_SLOT` 是否正确设置。另外 AdSense 需要审核通过后才能展示广告。

### Q: 如何更新？
A: 修改本地代码后：
```bash
git add .
git commit -m "更新说明"
git push
```
如果配置了 GitHub 自动部署，推送后会自动更新。否则运行 `npm run deploy`。

### Q: Workers 免费额度够用吗？
A: Cloudflare Workers 免费计划包含每日 10 万次请求，KV 免费读取 10 万次/天、写入 1000 次/天，对个人网站完全够用。

---

> 📝 如有问题，请在 GitHub Issues 中提交：https://github.com/woo66995/cf-sub/issues
