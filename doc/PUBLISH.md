# 发布 VSCode 插件指南

## 1. 插件图标 ✓

已生成以下图标文件：

- `icon.png` (128x128) - 主图标
- `icon-256.png` (256x256) - 大图标
- `icon-512.png` (512x512) - 超大图标

图标设计：

- 绿色圆角矩形背景 (#89D185)
- 白色 $ 符号（Shell 提示符）
- 清晰易识别

## 2. 编译和测试 ✓

### 编译插件

```bash
# 安装依赖
npm install

# 编译 TypeScript 代码到 dist 目录
npm run compile

# 监视模式编译（开发时使用）
npm run watch
```

编译输出目录：`dist/`

### 运行测试

```bash
# 运行测试套件
npm test

# 运行测试并查看覆盖率
npm run test:coverage
```

### 本地调试

```bash
# 按 F5 启动 VSCode 扩展开发主机
# 或在命令面板运行 "Run Extension"
```

### 验证编译输出

```bash
# 检查 dist 目录
ls -la dist/

# 预期输出：
# extension.js    - 编译后的扩展入口文件
# extension.js.map - Source map 文件
```

## 3. 打包插件 ✓

### 安装打包工具

```bash
# 全局安装 @vscode/vsce（推荐）
npm install -g @vscode/vsce

# 或使用 npx（无需全局安装）
npx @vscode/vsce package
```

### 打包前检查

```bash
# 1. 确保代码已编译
npm run compile

# 2. 检查 package.json 配置
#    - version: 版本号（如 1.0.0）
#    - publisher: 发布者名称
#    - repository: 仓库地址
#    - license: 许可证类型（如 MIT）

# 3. 检查必需文件是否存在
ls -l icon.png
ls -l LICENSE
ls -l README.md
```

### 打包插件

```bash
# 打包生成 .vsix 文件
vsce package

# 或指定版本
vsce package --version 1.0.0

# 输出示例：
# WARNING  The publisher name "your-publisher-name" is not valid.
#   Publisher names must be at least 3 characters long, and must only contain
#   alphanumeric characters, dashes or underscores.
#
#   The publisher name will be "your-publisher-name" in the extension manifest.
#   If you want to rename this publisher, run:
#   `vsce rename <new-publisher-name>`
#
#   Or create a new publisher, and rename this publisher.
#
#   If you want to bypass this check, use the --allow-missing-publisher flag.
#
#   Created: /path/to/shell-format-1.0.0.vsix
```

### 查看打包内容

```bash
# 解压并查看 VSIX 内容
unzip -l shell-format-1.0.0.vsix

# 或解压到目录
unzip shell-format-1.0.0.vsix -d vsix-contents
ls -la vsix-contents/
```

### 打包优化

`.vscodeignore` 文件配置了打包时需要排除的文件：

```list
**/.git
**/.DS_Store
**/*.vsix
**/node_modules/**
**/dist/**
**/*.log
**/doc/**
**/example.sh
**/generate_icon.sh
**/*.md
!README.md
!LICENSE
**/.eslintrc.js
**/.gitignore
**/tsconfig.json
**/.vscodeignore
**/package-optimization.md
**/shell-format-*.vsix
```

当前包大小：约 136 KB

## 4. 本地验证 ✓

### 安装打包的插件

```bash
# 方法 1: 使用 code 命令
code --install-extension shell-format-1.0.0.vsix

# 方法 2: 在 VSCode 中
# 1. 打开命令面板 (Ctrl+Shift+P / Cmd+Shift+P)
# 2. 输入 "Extensions: Install from VSIX..."
# 3. 选择 shell-format-1.0.0.vsix 文件
```

### 测试插件功能

```bash
# 1. 打开一个 shell 脚本文件
code example.sh

# 2. 测试格式化功能
#    - 快捷键: Shift+Alt+F (Windows/Linux) 或 Shift+Option+F (macOS)
#    - 右键菜单: "格式化文档"
#    - 命令面板: "Format Document"

# 3. 测试错误提示
#    - 在 "问题" 面板 (Ctrl+Shift+M / Cmd+Shift+M) 查看错误
#    - 点击黄色灯泡图标测试快速修复

# 4. 测试命令
#    - 命令面板输入 "Shell Format: Fix All Problems"
```

### 查看插件日志

```bash
# 打开 VSCode 输出面板
# 1. Ctrl+Shift+U / Cmd+Shift+U
# 2. 选择 "Extension Host" 频道
# 3. 查看插件运行日志
```

### 卸载插件

```bash
# 方法 1: 使用 code 命令
code --uninstall-extension bdq460.shell-format

# 方法 2: 在 VSCode 扩展面板右键卸载
```

## 5. 发布到 VSCode 插件市场

### 步骤 1: 准备工作

1. **创建 Microsoft 账户**
   - 访问 <https://aka.ms/vscode-publish>
   - 使用 Microsoft 账户登录

2. **创建发布者（Publisher）**
   - 访问 <https://marketplace.visualstudio.com/manage>
   - 点击"Create publisher"
   - 填写发布者名称（如：`your-publisher-name`）
   - 获取 Access Token（Personal Access Token）

### 步骤 2: 更新 package.json

在发布前需要修改以下信息：

```json
{
  "publisher": "your-publisher-name",  // 改为你的发布者名称
  "repository": {
    "type": "git",
    "url": "https://github.com/${your-username}/shell-format.git"  // 改为你的仓库地址
  }
}
```

### 步骤 3: 创建许可证文件

```bash
# 创建 MIT 许可证
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 ${Your Name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

### 步骤 4: 发布插件

#### 方法 A: 使用 @vscode/vsce 命令行工具

```bash
# 安装 @vscode/vsce（如果还没安装）
npm install -g @vscode/vsce

# 创建 Personal Access Token 后，设置环境变量
export VSCE_PAT="your-publisher-token"

# 发布插件
vsce publish

# 或发布特定版本
vsce publish minor
vsce publish patch
```

#### 方法 B: 直接上传 .vsix 文件

1. 访问 <https://marketplace.visualstudio.com/manage>
2. 选择你的发布者账户
3. 点击"New Extension"
4. 上传 `shell-format-1.0.0.vsix` 文件
5. 填写插件信息和图标
6. 提交审核

### 步骤 5: 插件信息完善

在发布页面填写以下信息：

**基本信息：**

- **Display Name**: Shell Format with shfmt
- **Short Description**: Format shell scripts using shfmt and show errors in Problems panel
- **Long Description**: 从 README.md 复制详细说明
- **Categories**: Formatters, Linters
- **Tags**: shell, shellscript, bash, format, formatter, shfmt, linter

**图标和横幅：**

- **Icon**: 上传 icon.png (128x128)
- **Banner**: 可选（1152x256）

**版本管理：**

- Version: 1.0.0
- Release Notes:

  ```shell
  Initial release
  - Format shell scripts using shfmt
  - Show errors in Problems panel
  - Provide quick fix code actions
  - Auto-diagnose on save and open
  ```

### 步骤 6: 等待审核

- 插件提交后需要人工审核
- 通常 1-3 个工作日
- 审核通过后会收到邮件通知

## 验证插件

### 本地测试

```bash
# 安装打包的插件
code --install-extension shell-format-1.0.0.vsix

# 卸载插件
code --uninstall-extension bdq460.shell-format
```

### 查看插件状态

发布后可以在以下地址查看：

[shell-format@vscode_marketplace](https://marketplace.visualstudio.com/items?itemName=bdq460.shell-format)

## 维护和更新

### 更新插件版本

1. 修改 `package.json` 中的版本号
2. 更新 README.md 或 CHANGELOG.md
3. 重新编译：`npm run compile`
4. 重新打包：`vsce package`
5. 发布：`vsce publish patch`（或 minor/major）

### 版本号规则

- **patch**: 1.0.0 -> 1.0.1（Bug 修复）
- **minor**: 1.0.0 -> 1.1.0（新功能）
- **major**: 1.0.0 -> 2.0.0（不兼容更新）

## 注意事项

1. **许可证文件**: 必须包含 LICENSE.md 或 LICENSE.txt
2. **发布者名称**: 只能包含字母、数字和连字符
3. **插件名称**: 需要唯一，建议使用 `{publisher}.{extension-name}` 格式
4. **图标要求**: 128x128 像素，PNG 格式
5. **README**: 必须包含功能说明和使用方法
6. **隐私策略**: 如果插件收集用户数据，需要提供隐私策略链接

## 参考资源

- VSCode 扩展开发文档: <https://code.visualstudio.com/api>
- 发布者管理: <https://marketplace.visualstudio.com/manage>
- vsce 工具: <https://github.com/microsoft/vscode-vsce>
- 插件市场指南: <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>
