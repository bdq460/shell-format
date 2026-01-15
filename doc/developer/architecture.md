# Shell Format 架构设计文档

## 概述

Shell Format 是一个基于 VSCode 扩展 API 的 Shell 脚本格式化和诊断工具。本文档详细说明项目的架构设计、技术选型和实现细节。

> **注意**：本文档专注于项目架构设计。关于 VSCode Extension API 的详细说明，请参考 [extension-api.md](../vscode/extension-api.md)。

## 核心概念

### 诊断集合 (DiagnosticCollection)

用于集中管理 Shell 脚本的格式化和语法检查诊断信息。详细 API 说明请参考 [../vscode/extension-api.md](../tools/vscode.md)。

### 文档过滤

跳过特殊文件（如 Git 冲突文件、临时文件），避免对非目标文件进行诊断和格式化。

**跳过模式**：

| 模式 | 说明 | 示例 |
|-----|------|------|
| `/\.git$/` | Git 冲突文件 | `example.sh.git` |
| `/\.swp$/` | Vim 临时文件 | `file.sh.swp` |
| `/\.swo$/` | Vim 交换文件 | `file.sh.swo` |
| `/~$/` | 备份文件 | `file.sh~` |
| `/\.tmp$/` | 临时文件 | `file.sh.tmp` |
| `/\.bak$/` | 备份文件 | `file.sh.bak` |

**示例代码**：

```typescript
function shouldSkipFile(fileName: string): boolean {
    const baseName = path.basename(fileName);
    const skipPatterns = [
        /\.git$/, /\.swp$/, /\.swo$/, /~$/, /\.tmp$/, /\.bak$/
    ];
    return skipPatterns.some(pattern => pattern.test(baseName));
}
```

## 设计原则

### 1. 模块化设计

项目采用清晰的模块划分，每个模块职责单一，便于维护和扩展：

```text
┌─────────────────────────────────────────────────┐
│              extension.ts (入口)                │
│  - 初始化各模块                                  │
│  - 注册提供者和监听器                            │
│  - 管理生命周期                                  │
└─────────────────────────────────────────────────┘
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
┌─────────┐    ┌─────────┐    ┌─────────┐
│commands │    │diagnostics│   │formatters│
└─────────┘    └─────────┘    └─────────┘
    ↓               ↓               ↓
┌─────────────────────────────────────────┐
│              utils (工具层)               │
│  - 日志系统                                │
│  - 配置管理                                │
│  - 外部命令执行                            │
└─────────────────────────────────────────┘
```

### 2. 单向依赖

模块之间保持单向依赖关系：

```text
extension.ts
    ↓
commands/
    ↓
diagnostics/ ──────→ formatters/ ──────→ providers/
    ↓                   ↓                    ↓
utils/ ◄──────────────────────────────────────┘
```

- `extension.ts` 依赖所有功能模块
- 功能模块可以依赖 `utils/`
- 功能模块之间相互独立

### 3. 关注点分离

| 层级 | 职责 | 示例 |
|-----|------|------|
| **入口层** | 注册和协调 | `extension.ts` |
| **业务层** | 实现具体功能 | `commands/`, `diagnostics/`, `formatters/` |
| **工具层** | 提供通用能力 | `utils/` |

## 核心模块详解

### 1. 扩展入口 (extension.ts)

**职责**：

- 扩展生命周期的管理
- 各模块的初始化
- Provider 和监听器的注册
- 资源清理

**关键代码**：

```typescript
export function activate(context: vscode.ExtensionContext) {
    // 1. 初始化日志系统
    initializeLogger();

    // 2. 创建诊断集合（全局单例）
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(
        PackageInfo.extensionName
    );

    // 3. 初始化各模块
    initializeDiagnostics(diagnosticCollection);
    initializeFormatter(diagnosticCollection);

    // 4. 注册提供者
    const formatProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(...);
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(...);

    // 5. 注册命令
    const commands = registerAllCommands();

    // 6. 监听事件
    const saveListener = vscode.workspace.onDidSaveTextDocument(...);
    const openListener = vscode.workspace.onDidOpenTextDocument(...);
    const changeListener = vscode.workspace.onDidChangeTextDocument(...);
    const configListener = vscode.workspace.onDidChangeConfiguration(...);

    // 7. 清理资源
    context.subscriptions.push(
        formatProvider,
        codeActionProvider,
        ...commands,
        saveListener,
        openListener,
        changeListener,
        configListener,
        diagnosticCollection
    );
}
```

**设计要点**：

1. **延迟初始化**：只在需要时初始化各模块
2. **资源管理**：所有 Disposable 对象都注册到 context.subscriptions
3. **统一入口**：所有初始化逻辑集中在 `activate()` 函数中

### 2. 命令模块 (commands/)

**职责**：

- 处理用户命令
- 协调其他模块完成任务

**文件结构**：

```tree
commands/
├── index.ts              # 注册所有命令
├── formatCommand.ts      # 格式化命令（已废弃，使用格式化 Provider）
└── fixCommand.ts         # 修复命令
```

**工作流程**：

```flow
用户触发命令
    ↓
vscode.commands.registerCommand()
    ↓
命令处理器函数
    ↓
调用 formatDocument()
    ↓
返回 TextEdit[]
    ↓
VSCode 应用编辑
```

> 有关命令和 CodeAction 的详细 API 说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 3. 诊断模块 (diagnostics/)

**职责**：

- 调用外部工具检测问题
- 解析工具输出
- 生成 VSCode Diagnostic 对象

**诊断触发时机**：

| 触发条件 | 监听器 | 防抖 |
|---------|--------|------|
| 文档保存 | `onDidSaveTextDocument` | ❌ 否 |
| 文档打开 | `onDidOpenTextDocument` | ❌ 否 |
| 文档变化 | `onDidChangeTextDocument` | ✅ 是（500ms） |
| 配置变更 | `onDidChangeConfiguration` | ❌ 否 |

**文件结构**：

```tree
diagnostics/
├── index.ts              # 诊断模块入口
├── shellcheck.ts         # Shellcheck 诊断
└── shfmt.ts              # Shfmt 诊断
```

**工作流程**：

```flow
文档事件触发
    ↓
diagnoseDocument()
    ↓
并行调用多个诊断器
    ├─ checkWithShellcheck()
    └─ checkWithShfmt()
    ↓
解析输出并生成 Diagnostic[]
    ↓
合并结果
    ↓
更新 DiagnosticCollection
```

**关键设计**：

```typescript
// 并行执行多个诊断
const [shellcheckDiagnostics, shfmtDiagnostics] = await Promise.all([
    checkWithShellcheck(document),
    checkWithShfmt(document)
]);

// 合并结果
const allDiagnostics = [
    ...shellcheckDiagnostics,
    ...shfmtDiagnostics
];

// 更新诊断集合
diagnosticCollection.set(document.uri, allDiagnostics);
```

**防抖实现**：

```typescript
let debounceTimer: NodeJS.Timeout | undefined;

function debounceDiagnose(document: vscode.TextDocument, delay: number = 500): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        diagnoseDocument(document);
    }, delay);
}
```

> 有关防抖机制的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 4. 格式化模块 (formatters/)

**职责**：

- 提供文档格式化功能
- 调用 shfmt 执行格式化
- 返回格式化后的 TextEdit

**文件结构**：

```tree
formatters/
└── documentFormatter.ts  # 文档格式化实现
```

**关键实现**：

```typescript
export async function formatDocument(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    const content = document.getText();
    const args = ConfigManager.buildShfmtArgs();

    return new Promise((resolve, reject) => {
        const shfmt = spawn('shfmt', args);

        // 监听输出
        shfmt.stdout.on('data', (chunk) => {
            // 收集格式化后的内容
        });

        // 监听进程结束
        shfmt.on('close', (code) => {
            if (code === 0) {
                const formatted = Buffer.concat(stdout).toString();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(content.length)
                );
                resolve([vscode.TextEdit.replace(fullRange, formatted)]);
            } else {
                resolve([]);
            }
        });

        // 支持取消
        token?.onCancellationRequested(() => {
            shfmt.kill();
        });

        // 写入输入
        shfmt.stdin.write(content);
        shfmt.stdin.end();
    });
}
```

> 有关 DocumentRangeFormattingEditProvider 和 DocumentFormattingEditProvider 的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

**工作流程**：

```flow
用户触发格式化
    ↓
provideDocumentRangeFormattingEdits()
    ↓
spawn('shfmt', args)
    ↓
写入文档内容到 stdin
    ↓
读取 stdout 获取格式化结果
    ↓
生成 TextEdit
    ↓
返回给 VSCode 应用
```

### 5. 提供者模块 (providers/)

**职责**：

- 提供 Code Action（快速修复）
- 处理用户的修复请求

**文件结构**：

```tree
providers/
└── codeActionProvider.ts  # Code Action 提供者实现
```

**工作流程**：

```flow
VSCode 检测到问题
    ↓
提供 CodeActionProvider
    ↓
用户点击黄色灯泡
    ↓
provideCodeActions()
    ↓
返回可执行的 CodeAction[]
    ↓
用户选择修复操作
    ↓
执行对应的命令
```

**关键实现**：

```typescript
export class ShellFormatCodeActionProvider
    implements vscode.CodeActionProvider {

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        // 单个问题修复
        const fixAction = new vscode.CodeAction(
            'Fix this issue with shell-format',
            vscode.CodeActionKind.QuickFix
        );
        fixAction.command = {
            command: 'shell-format.formatDocument',
            title: 'Fix this issue'
        };
        actions.push(fixAction);

        // 一键修复所有问题
        const fixAllAction = new vscode.CodeAction(
            'Fix all with shell-format',
            vscode.CodeActionKind.SourceFixAll
        );
        fixAllAction.command = {
            command: 'shell-format.fixAllProblems',
            title: 'Fix all problems'
        };
        actions.push(fixAllAction);

        return actions;
    }
}
```

> 有关 CodeActionProvider、QuickFix 和 SourceFixAll 的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 6. 工具模块 (utils/)

**职责**：

- 提供通用的工具函数
- 管理配置和日志
- 封装外部命令调用

**文件结构**：

```tree
utils/
├── logger.ts                  # 日志系统
├── extensionInfo.ts           # 配置管理
├── messages.ts                # 消息定义
├── shell.ts                   # Shell 工具
└── spawnErrorHandler.ts       # 错误处理
```

#### 日志系统 (logger.ts)

**功能**：

- 统一的日志接口
- 带时间戳的日志输出
- 支持开关控制

**实现**：

```typescript
export function initializeLogger(): void {
    // 根据配置决定是否输出到输出窗口
    if (ConfigManager.getLogOutput() === 'on') {
        outputChannel = vscode.window.createOutputChannel('shell-format');
    }
}

export function logger.info(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;

    // 输出到控制台
    console.log(logMessage);

    // 输出到输出窗口
    if (outputChannel) {
        outputChannel.appendLine(logMessage);
    }
}
```

#### 配置管理 (extensionInfo.ts)

**功能**：

- 统一管理配置
- 提供类型安全的配置访问
- 处理默认值

**实现**：

```typescript
export class PackageInfo {
    static readonly extensionName = 'shell-format';
    static readonly languageId = 'shellscript';
    static readonly defaultShfmtPath = 'shfmt';
    static readonly defaultShfmtArgs = ['-i', '2', '-bn', '-ci', '-sr'];
}

export class ConfigManager {
    static getShfmtPath(): string {
        const config = vscode.workspace.getConfiguration('shell-format');
        return config.get<string>('shfmtPath', PackageInfo.defaultShfmtPath);
    }

    static buildShfmtArgs(): string[] {
        return PackageInfo.defaultShfmtArgs;
    }

    static getLogOutput(): string {
        const config = vscode.workspace.getConfiguration('shell-format');
        return config.get<string>('logOutput', 'off');
    }

    static isConfigurationChanged(event: vscode.ConfigurationChangeEvent): boolean {
        // 检查配置是否变化
        if (event.affectsConfiguration('shell-format')) {
            return true;
        }
        return false;
    }
}
```

> 有关配置管理的详细 API 说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

## 关键设计模式

### 1. Provider 模式

VSCode 使用 Provider 模式来扩展编辑器功能：

| Provider | 功能 | 接口 |
|----------|------|------|
| DocumentFormattingEditProvider | 文档格式化 | `provideDocumentFormattingEdits()` |
| DocumentRangeFormattingEditProvider | 选区格式化 | `provideDocumentRangeFormattingEdits()` |
| CodeActionsProvider | 代码操作 | `provideCodeActions()` |

**优势**：

- 解耦扩展实现和 VSCode 核心
- 提供一致的扩展接口
- 便于测试和维护

> 有关 Provider 模式的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 2. 事件驱动模式

通过监听 VSCode 事件来触发诊断：

```typescript
// 文档保存时触发
const saveListener = vscode.workspace.onDidSaveTextDocument(document => {
    if (isShellScript(document)) {
        diagnoseDocument(document);
    }
});

// 文档打开时触发
const openListener = vscode.workspace.onDidOpenTextDocument(document => {
    if (isShellScript(document)) {
        diagnoseDocument(document);
    }
});

// 文档变化时防抖触发
const changeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (isShellScript(event.document)) {
        debounceDiagnose(event.document);
    }
});

// 配置变更时触发
const configListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (isConfigurationChanged(event)) {
        diagnoseAllDocuments();
    }
});
```

> 有关事件监听的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 3. 防抖模式 (Debounce)

避免频繁触发诊断：

```typescript
let debounceTimer: NodeJS.Timeout | undefined;

function debounceDiagnose(document: vscode.TextDocument, delay: number = 500): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        diagnoseDocument(document);
    }, delay);
}
```

**时间线**：

```text
用户输入:    A    B    C    D
时间轴:   |----|--|---|---------> 500ms
诊断触发:                        ✓ (只在D之后500ms触发一次)
```

> 有关防抖机制的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

### 4. Promise 封装模式

将异步操作封装成 Promise，便于使用 async/await：

```typescript
export async function checkWithShellcheck(
    document: vscode.TextDocument
): Promise<vscode.Diagnostic[]> {
    return new Promise((resolve) => {
        const shellcheck = spawn('shellcheck', args);
        let stdout: Buffer[] = [];
        let stderr: Buffer[] = [];

        shellcheck.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.on('close', (code) => {
            const diagnostics = parseShellcheckOutput(document, stdout, stderr);
            resolve(diagnostics);
        });

        shellcheck.on('error', (err) => {
            console.error('Shellcheck error:', err);
            resolve([]);
        });
    });
}
```

## 性能优化

### 1. 防抖机制

编辑时使用 500ms 防抖，避免频繁触发诊断。

### 2. 按需诊断

只在以下情况触发诊断：

- 打开 Shell 脚本文件
- 保存 Shell 脚本文件
- 编辑 Shell 脚本文件（防抖）
- 配置变更时重新诊断所有文件

### 3. 异步执行

所有外部命令（shellcheck、shfmt）使用异步执行，不阻塞 UI。

### 4. 缓存机制

诊断结果缓存在 DiagnosticCollection 中，避免重复计算。

### 5. 取消支持

通过 CancellationToken 支持取消操作：

```typescript
export async function formatDocument(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    const shfmt = spawn('shfmt', args);

    token?.onCancellationRequested(() => {
        shfmt.kill();
        reject(new vscode.CancellationError());
    });

    // ...
}
```

> 有关 CancellationToken 的详细说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

## 错误处理

### 1. 外部命令错误

```typescript
shellcheck.on('error', (err) => {
    // 命令不存在或无法执行
    console.error('Shellcheck error:', err.message);
    resolve([]);
});
```

### 2. 格式化错误

```typescript
shfmt.on('close', (code) => {
    if (code === 0) {
        // 格式化成功
    } else {
        // 格式化失败，返回空数组
        resolve([]);
    }
});
```

### 3. 用户取消操作

```typescript
token?.onCancellationRequested(() => {
    shfmt.kill();
    reject(new vscode.CancellationError());
});
```

## 扩展性设计

### 1. 添加新诊断器

```typescript
// 在 diagnostics/ 下创建新文件
export async function checkWithMyTool(
    document: vscode.TextDocument
): Promise<vscode.Diagnostic[]> {
    // 实现诊断逻辑
    return diagnostics;
}

// 在 index.ts 中调用
export async function diagnoseDocument(
    document: vscode.TextDocument
): Promise<void> {
    const diagnostics = [
        ...(await checkWithShellcheck(document)),
        ...(await checkWithShfmt(document)),
        ...(await checkWithMyTool(document)),  // 添加新诊断器
    ];
    diagnosticCollection.set(document.uri, diagnostics);
}
```

### 2. 添加新命令

```typescript
// 在 commands/ 下创建新文件
export function registerMyCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
        'shell-format.myCommand',
        () => {
            // 实现命令逻辑
        }
    );
}

// 在 index.ts 中注册
export function registerAllCommands(): vscode.Disposable[] {
    return [
        registerFormatCommand(),
        registerFixCommand(),
        registerMyCommand(),  // 注册新命令
    ];
}
```

### 3. 添加新的配置项

```typescript
// 在 package.json 中添加
"configuration": {
    "properties": {
        "shell-format.mySetting": {
            "type": "string",
            "default": "defaultValue"
        }
    }
}

// 在 extensionInfo.ts 中访问
export class ConfigManager {
    static getMySetting(): string {
        const config = vscode.workspace.getConfiguration('shell-format');
        return config.get<string>('mySetting', 'defaultValue');
    }
}
```

> 有关配置管理的详细 API 说明，请参考 [../vscode/extension-api.md](../vscode/extension-api.md)。

## 测试策略

### 1. 单元测试

- 测试工具函数（如配置管理、日志系统）
- 测试诊断器（解析逻辑）
- 测试格式化器（参数构建）

### 2. 集成测试

- 测试完整的格式化流程
- 测试完整的诊断流程
- 测试命令执行

### 3. 端到端测试

- 使用 VSCode Extension Host 测试扩展
- 测试用户交互流程
- 测试扩展激活和停用

## 总结

Shell Format 采用模块化、可扩展的架构设计，通过清晰的模块划分和单向依赖关系，实现了高内聚、低耦合的代码结构。项目充分利用了 VSCode Extension API 的 Provider 模式和事件驱动机制，提供了良好的用户体验和开发者体验。

**架构优势**：

- ✅ 模块化设计，易于维护和扩展
- ✅ 单向依赖，避免循环依赖
- ✅ 关注点分离，职责清晰
- ✅ 异步执行，不阻塞 UI
- ✅ 完善的错误处理和日志系统

**相关文档**：

- [../vscode/extension-api.md](../vscode/extension-api.md) - VSCode 扩展开发 API 详细说明
- [package.json](../../package.json) - 扩展配置文件
