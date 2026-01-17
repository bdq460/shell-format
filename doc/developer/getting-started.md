# 快速开始指南

本指南帮助新开发者快速上手 Shell Format 插件的开发。

## 前置要求

### 必需工具

| 工具           | 最低版本  | 说明              |
| -------------- | --------- | ----------------- |
| **Node.js**    | >= 16.x   | JavaScript 运行时 |
| **npm**        | >= 8.x    | 包管理器          |
| **VSCode**     | >= 1.74.0 | 开发环境          |
| **TypeScript** | >= 5.0    | 编译器            |

### 推荐工具

- **Git**: 版本控制
- **ESLint**: 代码检查
- **Prettier**: 代码格式化（可选）

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/bdq460/shell-format.git
cd shell-format
```

### 2. 安装依赖

```bash
npm install
```

### 3. 验证安装

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 检查 TypeScript 版本
tsc -v
```

---

## 项目理解

### 核心功能

Shell Format 插件提供两个核心功能:

1. **格式化**: 使用 shfmt 格式化 Shell 脚本
2. **诊断**: 使用 shellcheck 和 shfmt 检测错误

### 工作原理

```flow
用户操作
    ↓
VSCode API
    ↓
扩展代码
    ↓
服务层（ServiceManager）
    ↓
spawn 调用外部工具
    ↓
shfmt / shellcheck
    ↓
返回结果
    ↓
更新 VSCode UI
```

### 架构特点

- **服务层模式** - 使用 ServiceManager 管理服务实例，提供统一的服务接口
- **单例管理** - 避免重复创建服务实例，提升性能
- **配置缓存** - 基于 SettingInfo 实现配置快照和自动失效
- **性能优化** - 诊断结果缓存、并行诊断、防抖机制

---

## 开发环境配置

### 1. 安装 VSCode 扩展

推荐安装以下扩展:

- **ESLint**: 代码检查
- **Prettier - Code formatter**: 代码格式化（可选）
- **TypeScript Importer**: 自动导入

### 2. 配置 VSCode

在 `.vscode/settings.json` 中添加:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 3. 配置调试

在 `.vscode/launch.json` 中已有配置，直接按 `F5` 启动调试。

---

## 编译和运行

### 1. 一次性编译

```bash
npm run compile
```

编译后的代码输出到 `dist/` 目录。

### 2. 监听模式（推荐）

```bash
npm run watch
```

代码修改后会自动重新编译。

### 3. 运行测试

```bash
npm test
```

### 4. 代码检查

```bash
npm run lint
```

---

## 调试

### 启动调试

1. 按 `F5` 或点击 "Run Extension"
2. 会启动一个新的 VSCode 窗口（Extension Development Host）
3. 在新窗口中测试插件功能

### 设置断点

1. 在代码中设置断点
2. 按 `F5` 启动调试
3. 在 Extension Development Host 中触发功能
4. 程序会在断点处暂停

### 查看日志

1. 打开输出面板（`Ctrl+Shift+U` / `Cmd+Shift+U`）
2. 选择 "Extension Host" 或 "shell-format" 通道

---

## 第一个任务

让我们完成一个简单的任务: 添加一个新的命令。

### 任务: 添加 "Hello World" 命令

#### 步骤 1: 创建命令文件

在 `src/commands/` 下创建 `helloCommand.ts`:

```typescript
import * as vscode from "vscode";

export function registerHelloCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("shell-format.helloWorld", () => {
    vscode.window.showInformationMessage("Hello, World!");
  });
}
```

#### 步骤 2: 导出命令

在 `src/commands/index.ts` 中添加:

```typescript
export * from "./formatCommand";
export * from "./fixCommand";
export * from "./helloCommand"; // 新增
```

#### 步骤 3: 注册命令

在 `src/extension.ts` 中添加:

```typescript
import { registerHelloCommand } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  // ... 现有代码

  const helloCommand = registerHelloCommand();
  context.subscriptions.push(helloCommand);
}
```

#### 步骤 4: 测试命令

1. 按 `F5` 启动调试
2. 在 Extension Development Host 中打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. 输入 "Hello World"
4. 执行命令，应该会弹出 "Hello, World!" 消息

---

## 常见开发任务

### 添加新功能

参考本指南"第一个任务"章节了解如何添加新命令。

### 修改配置

1. 在 `package.json` 的 `configuration` 中添加配置项
2. 在 `src/config/settingInfo.ts` 中添加访问方法，使用 SettingInfo 统一管理配置

### 调试外部命令

使用服务层进行调试：

```typescript
import { logger } from "../utils/log";
import { ServiceManager } from "../services/serviceManager";

// 获取服务实例
const serviceManager = ServiceManager.getInstance();
const shfmtService = serviceManager.getShfmtService();

// 执行操作并查看日志
logger.info("Executing format operation");
const result = await shfmtService.format("/path/to/file.sh");
logger.info(`Result: ${result.success}`);
```

---

## 下一步

完成快速开始后，建议:

1. 阅读 [架构设计文档](architecture.md) 了解项目架构
2. 阅读 [架构优化总结](../ARCHITECTURE_OPTIMIZATION.md) 了解性能优化实施细节
3. 查看 [源代码](../../src/) 了解具体实现

---

## 获取帮助

如果遇到问题:

1. 查看项目文档
2. 查看 [VSCode 扩展开发文档](https://code.visualstudio.com/api)
3. 在 [GitHub Issues](https://github.com/bdq460/shell-format/issues) 中提问

---

## 相关资源

- [架构设计文档](architecture.md) - 项目架构详细说明
- [架构优化总结](../ARCHITECTURE_OPTIMIZATION.md) - 性能优化实施细节
- [VSCode 扩展开发文档](https://code.visualstudio.com/api) - 官方 API 文档
