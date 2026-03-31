# GEOCopilot Chrome Extension / GEOCopilot Chrome 扩展

[English](#english) | [中文](#中文)

---

## English

### Overview
GEOCopilot is a Chrome extension for GEO/SEO workflow assistance.

### Release Packaging
This repository supports one-command packaging for Chrome release upload.

```bash
bash scripts/package-chrome-extension.sh
```

The script reads the version from `manifest.json` and outputs:


> Note: `release/*.zip` artifacts are generated locally/CI and are not committed to git to keep PRs text-only.

```text
release/GEOCopilot-chrome-v<version>.zip
```

For current version `1.2.2`, the package is:

```text
release/GEOCopilot-chrome-v1.2.2.zip
```

### Install in Chrome (Local Test)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Unzip the package to a local folder
4. Click **Load unpacked** and select the extracted folder

### Publish to Chrome Web Store
1. Open Chrome Web Store Developer Dashboard
2. Create/select an extension item
3. Upload `release/GEOCopilot-chrome-v<version>.zip`
4. Complete listing and submit for review

### Open Source Policy
This repository follows common open-source community standards:
- License: MIT (`LICENSE`)
- Contribution guide: `CONTRIBUTING.md`
- Code of Conduct: `CODE_OF_CONDUCT.md`
- Security policy: `SECURITY.md`
- Support channels: `SUPPORT.md`

---

## 中文

### 项目简介
GEOCopilot 是一个用于 GEO/SEO 工作流辅助的 Chrome 扩展。

### Release 打包
项目支持一键打包为可发布的 Chrome 扩展压缩包。

```bash
bash scripts/package-chrome-extension.sh
```

脚本会读取 `manifest.json` 中的版本号，并输出：

> 说明：`release/*.zip` 属于本地或 CI 生成产物，不提交到 git，避免 PR 包含二进制文件。

```text
release/GEOCopilot-chrome-v<version>.zip
```

当前版本 `1.2.2` 的产物为：

```text
release/GEOCopilot-chrome-v1.2.2.zip
```

### Chrome 本地安装（调试）
1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 将 zip 解压到本地目录
4. 点击「加载已解压的扩展程序」，选择解压后的目录

### Chrome Web Store 发布
1. 登录 Chrome Web Store 开发者后台
2. 新建或选择扩展项目
3. 上传 `release/GEOCopilot-chrome-v<version>.zip`
4. 按提示完善商店信息并提交审核

### 开源规范说明
本仓库遵循常见开源社区规范：
- 许可证：`LICENSE`（MIT）
- 贡献指南：`CONTRIBUTING.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- 安全策略：`SECURITY.md`
- 支持说明：`SUPPORT.md`
