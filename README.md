# 骑手招聘 · 求职者端 H5（Task 2/5）

候选侧 H5 应用，遵循 Shared Interface Contract v1。所有数据均为虚构/脱敏，无真实个人信息，不向境外 LLM 发送任何数据。

## 技术栈（全部 MIT / Apache-2.0 / BSD 许可）
- 前端：React 18 + Vite 6（TypeScript-free JSX）
- Mock 服务：Express 4（Node 22）
- 端到端测试：Playwright 1.65
- 容器：Node 22 Alpine 官方镜像（MIT 类许可）

## 一键启动

### 方式 A：Docker（验收用）
```bash
docker compose up --build
```
- H5: http://localhost:4173
- Mock API: http://localhost:3001/api/v1/health
- 打开 H5 后从入口页走完整流程即可。

### 方式 B：本机开发（无需 Docker）
```bash
npm install
npm run dev:all     # 同时起 mock(3001) 和 H5(5173)
```
打开 http://localhost:5173 。

### 方式 C：本机生产预览（模拟容器行为）
```bash
npm install && npm run build
node server.js      # 一个进程同时提供 H5(4173) + API(3001)
```
打开 http://localhost:4173 。

## 完整流程（验收路径）
1. 入口：支持 `?source_channel=xxx` 渠道参数；AI 身份标识每屏可见
2. 知情同意：勾选后才开始；不同意走电话咨询出口；回传同意版本+时间戳
3. 对话：聊天气泡、快捷回复、进度条(x/7)、政策问答(带来源卡片)、切换人工
4. 站点推荐：距离/名额/时段；选时段→预约→结果页(导航/改期/取消/虚拟号)
5. 个人信息自助：查看/更正、下载副本、撤回同意并删除、联系人工

## 端到端测试
```bash
npm run test:install   # 首次：安装 Chromium
npm test               # 三档屏宽 375/390/414 全部跑
```
测试覆盖：主流程(入口→同意→7项→问答→选站点→预约→结果)、同意门禁、AI 标识、个人信息自助。
截图产物：`test-results/result-page.png`。

## 契约合规
- `GET/POST /api/v1/agent/sessions` 及其 `/messages`：mock Task 1 会话 API，返回 `reply / quick_replies / progress / actions`，actions 含 `show_stations / handoff / end_minor`。
- `POST /api/v1/vault/tokenize`：mock Task 5，返回 token 与掩码。
- `GET /api/v1/stations`、`POST /api/v1/bookings`、`PATCH /api/v1/bookings/:id/cancel`：mock Task 3。
- Candidate 7 字段按契约顺序采集：name / birth_ym / area_text / job_type / has_ebike / start_text / experience_text。
- 出生年月只采集到月；未满 18 岁返回 `end_minor` 并停止追问。

## 诚实边界
- 这是**演示级可运行交付**：mock 服务用内存数据，重启即清空，不接真实数据库。按契约要求，其他 4 个任务的 API 由本方写 mock 自测，不等待对方。
- 未实现：真实微信支付、真实短信、真实语音转文字、小程序认证上架（任务明确排除）。
- 无真实个人信息、无真实企业名、无境外 LLM 调用。

## 依赖其他任务
Task 1 session API / Task 3 booking API / Task 5 consent & rights API —— 均按契约本地 mock，可独立集成测试。
