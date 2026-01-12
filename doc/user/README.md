# Shell Format

> 基于 shfmt 和 shellcheck 的 Shell 脚本智能格式化和检查工具

## 快速开始

### 功能概览

- **智能格式化** - 使用 shfmt 自动格式化 Shell 脚本
- **错误检测** - 使用 shellcheck 检测语法和语义错误
- **自动诊断** - 打开、保存、编辑时自动检查
- **快速修复** - 一键修复格式化问题
- **详细日志** - 带时间戳的操作日志

## 配置选项

### 完整配置示例

```json
{
  "shell-format.shellcheckPath": "shellcheck",
  "shell-format.shfmtPath": "shfmt",
  "shell-format.logOutput": "off",
  "shell-format.onError": "showProblem"
}
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| `shellcheckPath` | string | "shellcheck" | shellcheck 可执行文件路径 |
| `shfmtPath` | string | "shfmt" | shfmt 可执行文件路径 |
| `logOutput` | "off" \| "on" | "off" | 是否输出日志到控制台和输出窗口 |
| `onError` | "showProblem" \| "ignore" | "showProblem" | 错误处理方式 |

### 自定义路径示例

```json
{
  "shell-format.shellcheckPath": "/usr/local/bin/shellcheck",
  "shell-format.shfmtPath": "/usr/local/bin/shfmt",
  "shell-format.logOutput": "on",
  "shell-format.onError": "showProblem"
}
```

## 插件命令

### 格式化命令

| 命令 | 说明 |
|-----|------|
| Format document with shell-format | 格式化整个文档 |

### 修复命令

| 命令 | 说明 |
|-----|------|
| Fix All Problems By Shellformat | 一键修复所有格式化问题 |

## 使用方法

### 1. 格式化文档

#### 方式一：格式化整个文档

- 快捷键：`Shift+Alt+F`（Windows/Linux）或 `Shift+Option+F`（macOS）
- 右键菜单：选择 "格式化文档"
- 命令面板：输入 "Format Document By Shellformat"

#### 方式二：格式化选中文本

- 选中需要格式化的代码
- 快捷键：`Ctrl+K Ctrl+F`（Windows/Linux）或 `Cmd+K Cmd+F`（macOS）
- 右键菜单：选择 "格式化选中文本"

> 注意：由于 Shell 脚本格式化需要完整上下文（if/fi、do/done 配对），即使选中部分文本，也会对整个文档进行格式化。VSCode 会自动裁剪选区内的变更。

### 2. 快速修复问题

#### 修复单个问题

- 将鼠标悬停在错误代码上
- 点击出现的黄色灯泡图标
- 选择 "Fix this issue with shell-format"

#### 修复所有问题

- 在代码编辑器中点击黄色灯泡图标
- 选择 "Fix all problems with shell-format"
- 或在命令面板执行 "Shell Format: Fix All Problems By Shellformat"

### 3. 查看错误和警告

- 打开 VSCode 的"问题"面板（`Ctrl+Shift+M` / `Cmd+Shift+M`）
- 查看所有 shell 脚本的错误和警告
- 错误来源：
  - `shellcheck`: 语法和语义错误（红色）
  - `shell-format`: 格式化问题（黄色）

### 4. 查看日志

- 打开输出面板（`Ctrl+Shift+U` / `Cmd+Shift+U`）
- 选择 "shell-format" 通道查看详细日志
- 所有日志行均包含 `[HH:MM:SS]` 格式的时间戳

## 格式化示例

### 格式化前

```bash
#!/bin/bash
if [ -f "test.txt" ];then
echo "file exists"
fi
```

### 格式化后

```bash
#!/bin/bash
if [ -f "test.txt" ]; then
    echo "file exists"
fi
```

## 支持的文件类型

- `.sh` - Shell 脚本
- `.bash` - Bash 脚本
- `.zsh` - Zsh 脚本

## 问题排查

### 格式化功能不工作

1. **检查是否安装了 shfmt**

   ```bash
   shfmt --version
   ```

2. **检查 shfmt 路径配置**

   ```json
   {
     "shell-format.shfmtPath": "/path/to/shfmt"
   }
   ```

3. **查看日志**

   - 打开输出面板（`Ctrl+Shift+U`）
   - 选择 "shell-format" 通道
   - 在设置中启用日志：`shell-format.logOutput: on`

### 错误检测不工作

1. **检查是否安装了 shellcheck**

   ```bash
   shellcheck --version
   ```

2. **检查 shellcheck 路径配置**

   ```json
   {
     "shell-format.shellcheckPath": "/path/to/shellcheck"
   }
   ```

3. **检查错误处理方式**

   ```json
   {
     "shell-format.onError": "showProblem"
   }
   ```

### 插件未激活

1. 检查文件扩展名是否为 `.sh`、`.bash` 或 `.zsh`
2. 打开一个 Shell 脚本文件
3. 检查"问题"面板是否显示错误

## 常见问题

### Q: 为什么格式化选中文本时整个文档都被格式化了？

A: Shell 脚本格式化需要完整上下文（如 if/fi、do/done 配对），即使选中部分文本，shfmt 也会对整个文档进行格式化。VSCode 会自动裁剪选区内的变更并应用到编辑器中。

### Q: shellcheck 错误可以自动修复吗？

A: 不可以。shellcheck 检测的是语义错误和最佳实践问题，这些需要开发者根据具体场景手动修复。只有格式化问题（由 shfmt 检测）可以自动修复。

### Q: 如何禁用特定的 shellcheck 警告？

A: 可以在脚本中使用注释来禁用特定警告：

```bash
#!/bin/bash
# shellcheck disable=SC2034
local unused_var="test"

# 禁用多个警告
# shellcheck disable=SC2034,SC2154
```

### Q: 如何查看详细日志？

A:

1. 在设置中启用日志：`shell-format.logOutput: on`
2. 打开输出面板（`Ctrl+Shift+U` / `Cmd+Shift+U`）
3. 选择 "shell-format" 通道

### Q: 插件会影响 VSCode 性能吗？

A: 不会。插件使用防抖机制（500ms），避免频繁触发诊断。所有外部命令都是异步执行，不会阻塞 UI。

## 系统要求

### VSCode 版本

- VSCode >= 1.74.0

### 外部工具

#### shfmt（必需）

Shell 脚本格式化工具

**macOS**:

```bash
brew install shfmt
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt-get install shfmt
```

**使用 Go 安装**:

```bash
go install mvdan.cc/sh/v3/cmd/shfmt@latest
```

#### shellcheck（推荐）

Shell 脚本静态分析工具

**macOS**:

```bash
brew install shellcheck
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt-get install shellcheck
```

**使用 Go 安装**:

```bash
go install github.com/koalaman/shellcheck/cmd/shellcheck@latest
```

> 注意：shellcheck 是可选的，如果未安装，插件将只使用 shfmt 进行格式化和基础检查。

## 链接

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [许可证](LICENSE)

## 致谢

感谢以下开源工具：

- [shfmt](https://github.com/mvdan/sh) - Shell 脚本格式化工具
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell 脚本静态分析工具
