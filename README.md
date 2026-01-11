# Shell Format VSCode Extension

基于 shfmt 和 shellcheck 的 Shell 脚本格式化 VSCode 插件，支持格式化、语法检查和自动修复。

## 功能特性

1. **格式化 Shell 脚本**：使用 shfmt 对 `.sh`, `.bash`, `.zsh` 文件进行格式化
2. **智能错误检测**：
   - 使用 shellcheck 检测语法错误和语义问题
   - 使用 shfmt 检测格式化问题
3. **自动诊断**：在打开、保存和编辑文件时自动检查问题
4. **快速修复**：提供 Code Actions 可以一键修复所有格式化问题
5. **详细日志输出**：所有操作均输出带时间戳的详细日志，便于调试和故障排查

## 项目结构

```shell
shell-format/
├── .eslintrc.js                    # ESLint 配置文件，用于代码质量检查 [打包: ❌]
├── .gitignore                      # Git 忽略文件配置 [打包: ❌]
├── .vscodeignore                   # VSCode 扩展打包时忽略的文件 [打包: ❌]
├── .pytest_cache/                  # pytest 缓存目录 [打包: ❌]
├── LICENSE                         # 项目许可证文件 (MIT) [打包: ✅]
├── README.md                       # 项目说明文档 (当前文件) [打包: ✅]

├── example.sh                      # 示例 Shell 脚本文件 [打包: ✅]
├── icon-256.png                    # 256x256 扩展图标 [打包: ✅]
├── icon-512.png                    # 512x512 扩展图标 [打包: ✅]
├── icon.png                        # 主扩展图标 (128x128) [打包: ✅]
├── language-configuration.json     # Shell 语言配置文件 [打包: ✅]
├── package.json                    # 项目配置和依赖声明 [打包: ✅]
├── package-lock.json               # npm 包版本锁定文件 [打包: ❌]
├── tsconfig.json                   # TypeScript 编译配置文件 [打包: ❌]
├── shell-format-1.0.0.vsix       # 打包后的扩展安装文件 [打包: ❌]
├── node_modules/                   # Node.js 依赖包目录 [打包: ❌]
├── dist/                           # 编译后的输出目录 [打包: ✅]
│   └── extension.js                # 扩展主入口文件（编译后） [打包: ✅]
├── src/                            # 源代码目录 [打包: ❌]
│   └── extension.ts                # 扩展主入口文件（源代码） [打包: ❌]
├── doc/                            # 文档目录 [打包: ❌]
│   ├── PUBLISH.md                  # 发布说明文档 [打包: ❌]
│   ├── language-configuration-explained.md  # 语言配置详解 [打包: ❌]
│   └── npm-guide.md                # npm 使用指南 [打包: ❌]
└── script/                         # 开发脚本目录 [打包: ❌]
    ├── deploy-local.sh             # 部署脚本（开发用） [打包: ❌]
    ├── example.sh                  # 示例脚本（开发用） [打包: ❌]
    └── generate_icon.sh            # 图标生成脚本 [打包: ❌]
```

**图例**：

- `[打包: ✅]` - 该文件会包含在 VSIX 安装包中
- `[打包: ❌]` - 该文件不会包含在 VSIX 安装包中（仅用于开发）

## 安装

### 1. 安装依赖工具

此插件需要以下工具：

#### shfmt（必需）

用于 Shell 脚本格式化：

```bash
# macOS
brew install shfmt

# Linux
sudo apt-get install shfmt

# 或使用 go install
go install mvdan.cc/sh/v3/cmd/shfmt@latest
```

#### shellcheck（推荐）

用于语法检查和最佳实践检测：

```bash
# macOS
brew install shellcheck

# Linux
sudo apt-get install shellcheck

# 或使用其他包管理器安装
```

> 注意：shellcheck 是可选的，如果未安装，插件将只使用 shfmt 进行格式化和基础检查。

### 2. 安装 VSCode 插件

1. 下载 `shell-format-*.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` / `Cmd+Shift+P` 打开命令面板
3. 输入 "Install from VSIX"
4. 选择下载的 `.vsix` 文件

或使用本地部署脚本：

```bash
script/deploy-local.sh
```

## 配置

在 VSCode 设置中可以配置以下选项：

- `shellformat.path`: shfmt 可执行文件路径（默认：`shfmt`）
- `shellformat.args`: 传递给 shfmt 的参数（默认：`["-i", "2", "-bn", "-ci", "-sr"]`）
- `shellformat.onError`: 错误处理方式（`showProblem` 或 `ignore`，默认：`showProblem`）

默认参数说明：

- `-i 2`: 缩进 2 个空格
- `-bn`: 二元运算符后换行
- `-ci`: 在 `case` 模式中对齐替代语句
- `-sr`: 重定向操作符后换行

## 错误检测说明

插件提供两种方式的错误检测：

### 1. Shellcheck 检测（推荐）

Shellcheck 可以检测：

- 语法错误
- 语义错误（如 `local` 关键字不在函数内使用）
- 最佳实践违规
- 常见编程陷阱

示例错误代码：

- `SC2168`: 'local' is only valid in functions
- `SC2154`: variable is referenced but not assigned
- `SC2034`: variable appears unused

### 2. Shfmt 格式检测

Shfmt 主要检测：

- 代码格式是否符合规范
- 语法错误（基础级别）

### 检测优先级

当两种检测方式同时使用时：

- Shellcheck 的错误会显示在"问题"面板，来源为 `shellcheck`
- Shfmt 的格式问题会显示为警告，来源为 `shell-format`
- 修复操作会同时应用格式化修复，但语义错误需要手动修复

## 使用方法

### 格式化文档

- 使用快捷键 `Shift+Alt+F`（Windows/Linux）或 `Shift+Option+F`（macOS）
- 右键菜单选择"格式化文档"
- 命令面板输入 `Format Document`

### 修复所有问题

- 在代码编辑器中点击黄色灯泡图标，选择"Fix all with shfmt"
- 或在命令面板执行 `Shell Format: Fix All Problems`

**注意**：修复操作只会修复格式化问题，不会修复 shellcheck 检测到的语义错误。

### 查看错误和警告

- 打开 VSCode 的"问题"面板（Ctrl+Shift+M / Cmd+Shift+M）
- 查看所有 shell 脚本的错误和警告
- 错误来源：
  - `shellcheck`: 语法和语义错误（红色）
  - `shell-format`: 格式化问题（黄色）

### 查看日志

- 打开输出面板（Ctrl+Shift+U / Cmd+Shift+U）
- 选择 "shell-format" 通道查看详细日志
- 所有日志行均包含 `[HH:MM:SS]` 格式的时间戳，便于跟踪操作时序

## 开发

### 编译

```bash
npm install
npm run compile
```

### 运行测试

```bash
npm test
```

### 打包

```bash
npm install -g @vscode/vsce
vsce package
```

### 本地部署

项目提供 `script/deploy-local.sh` 脚本用于快速本地安装：

```bash
script/deploy-local.sh
```

脚本会自动编译、打包并安装到 `~/.vscode/extensions/` 目录，方便开发测试。

## 许可证

MIT

## 联系作者

- Github: [bdq460](https://github.com/bdq460)
- Email: [bdq460@gmail.com](mailto:bdq460@gmail.com)
