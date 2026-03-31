# GEOCopilot Chrome Extension

[English](#english) | [中文](#中文)

---

## English

### Overview
GEOCopilot is a Chrome extension for GEO/SEO submission workflows. It stores reusable site profiles, discovers form fields on target pages, and fills values through either smart matching or manual selection.

### Current Feature Set

#### 1) Site Profile Management
- Add, edit, and delete multiple site profiles.
- Mark one profile as **Default** for faster filling.
- Structured fields per profile:
  - Site Name
  - Category
  - Site URL
  - Contact Email
  - Short Description
  - Long Description
  - Keyword Tags

#### 2) Smart Fill (Auto Match)
- Detects candidate form fields on the current page.
- Supports standard inputs/textareas and common rich-text iframe editors (for long description/content fields).
- Uses built-in + custom matching strategies to map page labels/placeholders/names to profile fields.
- Supports one-click fill for matched fields.
- Shows match status and fill result count.

#### 3) Manual Fill
- Pulls detectable page fields into a selector.
- Lets you choose one page field + one profile value.
- Fills only the selected target (useful for edge-case forms).

#### 4) Strategy Editor (Custom Matching)
- Add/edit/delete alias rules per profile field.
- Persist custom rules in extension storage.
- Export/import rules together with site data.

#### 5) Settings
- Auto fill on page load (only when matching succeeds).
- Side panel mode hint and compatibility support.
- Language switching (Auto / Chinese / English).
- Theme switching (Auto / Light / Dark).

#### 6) Config Export / Import
- Export full config (sites + active site + settings + matching strategies) as JSON.
- Import JSON to restore data.
- Includes normalization to guard against malformed inputs.

---

### Custom Matching Strategy Rules
A strategy item is composed of:
- `key`: target internal field key (`name`, `category`, `url`, `email`, `shortDesc`, `longDesc`, `tags`)
- `aliases`: comma-separated keywords used to match page fields

#### Matching Behavior (Practical Rule)
When GEOCopilot reads a field from a page, it compares the field’s visible label / placeholder / related text with strategy aliases.

If any alias matches, GEOCopilot maps the page field to the strategy `key` and fills the corresponding value from the selected site profile.

#### Recommended Alias Design
- Keep aliases short and semantic (`website`, `homepage`, `company site`).
- Cover multilingual variants when needed (`邮箱,email,mail`).
- Prefer stable domain vocabulary over one-off page wording.
- Avoid overly broad aliases like `text` or `info` to reduce false positives.

#### Example Strategies

##### Example A: URL field
- key: `url`
- aliases: `url, website, site, homepage, domain, official site`

Useful for forms using labels such as:
- “Website”
- “Homepage URL”
- “Official Domain”

##### Example B: Short description field
- key: `shortDesc`
- aliases: `tagline, summary, short description, one line intro`

Useful for:
- “Tagline”
- “Project Summary”
- “One-line introduction”

##### Example C: Tags field
- key: `tags`
- aliases: `keywords, tags, seo keywords, topic tags`

Useful for:
- “Keywords”
- “SEO Keywords”
- “Topic Tags”

---

### Release Packaging

```bash
bash scripts/package-chrome-extension.sh
```

The script reads the version from `manifest.json` and outputs:

```text
release/GEOCopilot-chrome-v<version>.zip
```

> Note: `release/*.zip` artifacts are generated locally/CI and are not committed to git.

### GitHub Auto Release (Tag Trigger)
- Trigger: push tag `v<version>` (example: `v1.2.2`)
- Validation: tag version must match `manifest.json`
- Output: release asset uploaded to GitHub Releases
- Guardrail: release commit must be on `main`

### Local Install in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Unzip package to a local folder
4. Click **Load unpacked** and select the folder

### Publish to Chrome Web Store
1. Open Chrome Web Store Developer Dashboard
2. Create/select extension item
3. Upload `release/GEOCopilot-chrome-v<version>.zip`
4. Add privacy policy URL/content (see `PRIVACY.md`)
5. Complete listing and submit for review

### Chrome Web Store Review Checklist
- Keep extension purpose single and clear: GEO/SEO form fill assistant.
- Request least-privilege permissions.
- Keep privacy disclosures consistent with real behavior.
- Ensure listing screenshots/text match current functionality.
- Avoid misleading claims and remote code loading.

---

## 中文

### 项目简介
GEOCopilot 是一个用于 GEO/SEO 提交流程的 Chrome 扩展。它支持站点资料复用、页面字段识别，以及“智能匹配填充 + 手动精确填充”两种方式。

### 当前已实现功能

#### 1）站点资料管理
- 支持添加 / 编辑 / 删除多个站点资料。
- 支持设置默认站点，提升高频填报效率。
- 每个站点可维护以下字段：
  - 网站名称
  - 分类
  - 网站地址
  - 联系邮箱
  - 简短描述
  - 详细描述
  - 关键词标签

#### 2）智能填充（自动匹配）
- 自动读取当前页面可填字段。
- 支持普通 input/textarea 以及常见富文本 iframe 编辑器（适合“详细描述/正文”等字段）。
- 使用“内置 + 自定义匹配策略”把页面字段映射到站点资料字段。
- 一键执行填充，并展示命中状态和填充数量。

#### 3）手动填充
- 可从检测到的页面字段中手动选择目标。
- 可从站点资料值中手动选择填充值。
- 适合复杂页面或智能匹配未完全覆盖的场景。

#### 4）匹配策略编辑器
- 支持新增 / 编辑 / 删除策略项。
- 每个策略项可配置字段及关键字别名。
- 策略和站点配置一起持久化存储，可导出/导入。

#### 5）设置项
- 打开页面后自动匹配并填充（仅匹配成功时触发）。
- 侧边栏模式提示与兼容。
- 语言切换（跟随浏览器 / 中文 / English）。
- 主题切换（跟随系统 / 浅色 / 深色）。

#### 6）配置导入导出
- 导出完整 JSON（站点、默认站点、设置、匹配策略）。
- 导入后进行结构规范化，降低异常配置导致的问题。

---

### 自定义匹配填充策略规则（详细）

一个策略项包含两个核心部分：
- `key`：目标字段键（`name`, `category`, `url`, `email`, `shortDesc`, `longDesc`, `tags`）
- `aliases`：用于匹配页面字段的别名关键字（逗号分隔）

#### 匹配逻辑（实用描述）
GEOCopilot 会读取页面字段的标签文本、placeholder、关联说明等信息，并与 `aliases` 逐项比较：

- 只要任一别名命中，即认定该页面字段映射到对应 `key`。
- 映射后，插件会从当前选中的站点资料中取出对应值进行填充。

#### 别名设计建议
- 关键字保持短小、语义清晰，如：`website, homepage, domain`。
- 面向多语言页面时可混合中英文，如：`邮箱,email,mail`。
- 优先使用稳定业务词，避免一次性页面文案。
- 避免过宽泛词（如 `text`, `info`），减少误匹配。

#### 策略示例

##### 示例 A：网站地址
- key: `url`
- aliases: `url, website, site, homepage, domain, official site`

可覆盖的页面字段文案示例：
- Website
- Homepage URL
- Official Domain

##### 示例 B：简短描述
- key: `shortDesc`
- aliases: `tagline, summary, short description, one line intro`

可覆盖的页面字段文案示例：
- Tagline
- Project Summary
- One-line introduction

##### 示例 C：关键词标签
- key: `tags`
- aliases: `keywords, tags, seo keywords, topic tags`

可覆盖的页面字段文案示例：
- Keywords
- SEO Keywords
- Topic Tags

---

### Release 打包

```bash
bash scripts/package-chrome-extension.sh
```

脚本会读取 `manifest.json` 版本号，并生成：

```text
release/GEOCopilot-chrome-v<version>.zip
```

> 说明：`release/*.zip` 为本地或 CI 产物，不提交到 git。

### Chrome Web Store 上架检查清单
- 扩展用途保持单一且清晰（GEO/SEO 表单填充助手）。
- 权限遵循最小化原则，避免不必要的高权限申请。
- 隐私披露与实际行为保持一致（详见 `PRIVACY.md`）。
- 商店截图与文案和当前版本功能一致。
- 不做误导性描述，不加载远程代码。

### 开源规范
- License：`LICENSE`（MIT）
- Contribution：`CONTRIBUTING.md`
- Code of Conduct：`CODE_OF_CONDUCT.md`
- Security：`SECURITY.md`
- Support：`SUPPORT.md`

---

## Sponsor / 赞助支持

If GEOCopilot helps your workflow, you can support ongoing maintenance and feature development here:

- GitHub Sponsors: https://github.com/sponsors/Cweiping

如果 GEOCopilot 对你的工作流有帮助，欢迎通过以下链接支持后续维护与功能迭代：

- GitHub Sponsors：https://github.com/sponsors/Cweiping

Support helps with:
- Continued form-adaptation and compatibility updates
- UI/UX refinements and quality improvements
- New automation capabilities for GEO/SEO submission scenarios
