# 国内 ATS 适配器落地指引（北森 / Moka / 大易 / 飞书招聘）

P1 已实现四个海外 ATS 的官方公开 API 适配器（Greenhouse / Lever /
Ashby / SmartRecruiters，全部实测验证）。国内 ATS 的门户是纯客户端
渲染（CSR）或需要凭证，2026-08 的实测探测结论与后续落地步骤如下，
适配器骨架位置：`api/app/services/job_source_service.py`（新增一个
`fetch_xxx` 函数 + 注册进 `_ADAPTERS` + 在 `_URL_PATTERNS` 加 URL
识别即可）。

## 实测探测结论（2026-08-15）

| ATS | 门户特征 | 实测结论 |
|---|---|---|
| 北森 zhiye | `{公司}.zhiye.com/campus` | 页面含 `BSGlobal` 配置（PortalId/PageId），职位列表由前端 chunk 动态 XHR 加载；curl 能拿到 HTML 但拿不到接口路径（loader 只有 polyfill） |
| Moka | `app.mokahr.com/su/{短码}` | 302 → `/m/campus-recruitment/{公司}/{id}?sourceToken=...`，移动版 SPA；当前网络环境直连失败 |
| 大易 dayee | dayee.com 云招聘门户 | 未探测 |
| 飞书招聘 | hire.feishu.cn | 官方开放 API `open.feishu.cn/open-apis/hire/v1`，需自建应用 app_id/secret（限流 1000 次/分，个人够用） |

## 浏览器抓包步骤（每家约 5 分钟）

1. Chrome 打开任一该 ATS 的企业招聘页（如 `beisen.zhiye.com/campus`）
2. F12 → Network → 筛选 Fetch/XHR → 刷新页面并翻页/切筛选
3. 找到返回职位列表 JSON 的请求（特征：响应里含职位名 `name/title`、
   地点、详情链接数组，通常带分页参数 `pageNo/pageIndex/pageSize`）
4. 记录：请求 URL、方法（多为 POST JSON）、必需参数/请求头
   （重点看是否有 token、`PortalId` 之类字段——北森的就在页面 `BSGlobal` 里）
5. 用 curl 复现该请求验证无登录态可用，然后照 `fetch_smartrecruiters`
   的样式写适配器 + 单测（payload 样例塞进 `tests/test_job_source_service.py`）

注意：这些内部接口无稳定性承诺，可能随版本变化；适配器务必
`try/except` 兜底（现有 `sync_job_source` 已保证失败只记状态不断服务）。
合规上保持低频（默认 12 小时一次）、个人使用、不二次分发。

## 飞书招聘（官方 API 路线）

无需抓包，按官方文档实现即可，需要用户在飞书开放平台自建应用并授权
招聘权限：

1. `POST /open-apis/auth/v3/tenant_access_token/internal`（app_id/secret 换 token）
2. `GET /open-apis/hire/v1/websites/{website_id}/jobs`（分页拉职位）

凭证放进 `ai_settings_lite` 同款的本地设置表或 `.env.lite`，适配器读
settings 即可（参考 `config_lite.py` 的 MCP_*_URL 模式）。
