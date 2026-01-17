# Shell Format

> 基于 shfmt 和 shellcheck 的智能 Shell 脚本格式化和检查工具

**English Version**: [README_EN.md](README_EN.md)

## 开发者快速开始

### 项目概述

Shell Format 是一个 VSCode 扩展，提供 Shell 脚本的格式化和诊断功能。采用模块化架构，服务层封装了外部工具调用，支持性能优化（缓存、并行诊断）和细粒度配置管理。

### 核心功能

- **格式化** - 使用 shfmt 自动格式化 Shell 脚本
- **诊断** - 使用 shellcheck 和 shfmt 检测语法和语义错误
- **自动诊断** - 打开、保存或编辑时自动检查（500ms 防抖）
- **快速修复** - 一键修复格式问题

### 开发文档

详细的技术文档请查看 [doc/developer/](doc/developer/)：

- **[快速开始指南](doc/developer/getting-started.md)** - 开发环境搭建、编译、调试
- **[架构设计文档](doc/developer/architecture.md)** - 架构设计、模块划分、扩展性指南

### 项目结构

```text
├── src/
│   ├── extension.ts          # 扩展入口
│   ├── services/             # 服务层（新增）
│   │   ├── serviceManager.ts      # 服务单例管理器
│   │   ├── shfmtService.ts        # 格式化服务
│   │   └── shellcheckService.ts  # 诊断服务
│   ├── diagnostics/          # 诊断模块
│   ├── formatters/           # 格式化模块
│   ├── providers/            # 提供者模块
│   ├── commands/             # 命令模块
│   ├── config/               # 配置管理
│   └── tools/                # 工具层
└── doc/
    ├── developer/            # 开发者文档
    └── user/                 # 用户文档
```

### 技术架构

- **服务层模式** - 封装外部工具调用，提供统一的服务接口
- **单例管理** - ServiceManager 管理服务实例，避免重复创建
- **配置缓存** - 基于 SettingInfo 实现配置快照和自动失效
- **性能优化** - 诊断结果缓存、并行诊断、防抖机制

### 快速上手

```bash
# 安装依赖
npm install

# 打包插件
## 方法1
npm run package:extension
## 方法2
npx vsce package

# 安装插件
##方法1
npm run install:extension
##方法2
右键点击根目录下的 shell-format-0.0.1.vsix 文件，点击"安装扩展VSIX"
```

详细说明请参考 [快速开始指南](doc/developer/getting-started.md)。

### 用户文档

面向最终用户的使用文档请查看 [doc/user/](doc/user/)：

- **配置选项** - 完整的配置说明
- **使用方法** - 格式化、快速修复等操作指南
- **常见问题** - 故障排除和 FAQ

---

## 系统要求

- **Node.js** >= 16.x
- **npm** >= 8.x
- **TypeScript** >= 5.0
- **VSCode** >= 1.74.0

## 链接

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [License](LICENSE)

## 致谢

感谢以下开源工具：

- [shfmt](https://github.com/mvdan/sh) - Shell 脚本格式化工具
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell 脚本静态分析工具
