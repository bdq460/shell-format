# 文档索引

## 快速导航

### 👤 我是用户（已安装插件）

- [用户使用文档](user/README.md) - 插件功能、配置和使用说明

### 👨‍💻 我是开发者（贡献代码）

- [根目录 README.md](../README.md) - 项目概述、架构设计、开发指南
- [快速开始指南](developer/getting-started.md) - 开发环境配置和上手
- [架构设计文档](developer/architecture.md) - 详细的架构设计说明
- [VSCode 扩展 API 参考](vscode/extension-api.md) - VSCode 扩展开发 API 详细说明
- [package.json 配置说明](vscode/package-json.md) - 扩展配置详解
- [language-configuration.json 详解](vscode/language-configuration.md) - 语言配置说明

### 🔧 工具参考

- [shellcheck 使用指南](tools/shellcheck.md) - shellcheck 工具说明
- [shfmt 使用指南](tools/shfmt.md) - shfmt 工具说明
- [spawn 使用指南](tools/spawn.md) - Node.js spawn API 使用

## 文档分类

### 用户文档

| 文档 | 目标读者 | 场景 |
|-----|---------|------|
| [user/README.md](user/README.md) | 已安装插件的用户 | 查看插件功能、配置和使用方法 |
| [user/README_EN.md](user/README_EN.md) | English-speaking users | View plugin features, configuration, and usage methods |

### 开发者文档

| 文档 | 目标读者 | 场景 |
|-----|---------|------|
| [../README.md](../README.md) | 开发者 | 项目概述、核心设计、开发指南 |
| [getting-started.md](developer/getting-started.md) | 新加入项目的开发者 | 快速搭建开发环境 |
| [architecture.md](developer/architecture.md) | 需要理解架构的开发者 | 了解项目架构设计 |
| [extension-api.md](vscode/extension-api.md) | VSCode 扩展开发者 | VSCode 扩展 API 详细说明 |
| [package-json.md](vscode/package-json.md) | 需要修改配置的开发者 | 了解 package.json 配置 |
| [language-configuration.md](vscode/language-configuration.md) | 需要修改语言配置的开发者 | 了解语言配置文件 |

### 工具文档

| 文档 | 目标读者 | 场景 |
|-----|---------|------|
| [shellcheck.md](tools/shellcheck.md) | 开发者和用户 | 了解 shellcheck 工具 |
| [shfmt.md](tools/shfmt.md) | 开发者和用户 | 了解 shfmt 工具 |
| [spawn.md](tools/spawn.md) | 开发者 | 了解 Node.js spawn API |

## 打包说明

| 目录/文件 | 打包状态 | 说明 |
|----------|---------|------|
| `user/README.md` | ✅ | 打包时复制为根目录 README.md（插件市场首页） |
| `user/` | ✅ | 用户文档打包到扩展中 |
| `tools/` | ✅ | 工具文档打包到扩展中 |
| `developer/` | ❌ | 开发者文档不打包 |
| `vscode/` | ❌ | VSCode 文档不打包 |
| `INDEX.md` | ❌ | 文档索引不打包 |

## 文档说明

- **根目录 README.md** 是开发者文档，在开发阶段使用
- **打包时**，`doc/user/README.md` 会被复制为根目录的 `README.md`，作为插件市场首页
- 本索引文档仅用于开发阶段，帮助快速查找各类文档
