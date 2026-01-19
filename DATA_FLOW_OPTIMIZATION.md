# 数据流转优化方案

> 基于 ARCHITECTURE_REVIEW.md 中提到的"数据流转仍存在2-3层转换，有一定复杂度"问题
> 生成时间: 2026-01-19

---

## 1. 当前数据流分析

### 1.1 现状概览

当前数据流转存在 **3层转换**，如下所示：

```
执行命令 → ExecutorResult
    ↓ Parser
ToolResult { syntaxErrors, formatIssues, linterIssues, executeErrors }
    ↓ DiagnosticFactory/FormatterAdapter
Diagnostic[] / TextEdit[]
    ↓ BaseFormatPlugin
PluginResult { hasErrors, diagnostics, textEdits }
    ↓
VSCode API
```

### 1.2 转换层次详解

#### 层次1: ExecutorResult → ToolResult (Parser层)

**位置**: `tools/shell/shfmt/parser.ts`、`tools/shell/shellcheck/parser.ts`

**职责**: 解析命令行工具的原始输出，转换为工具无关的中间表示

**示例**:
```typescript
// parseShfmtOutput
export function parseShfmtOutput(
    result: ExecutionResult,
    mode: "format" | "check",
): ToolFormatResult {
    let toolResult: ToolFormatResult = {};
    // 解析 stdout/stderr，填充 toolResult
    return toolResult;
}
```

**优势**:
- 工具无关的中间表示
- 易于添加新工具支持
- Parser 逻辑清晰

**问题**:
- 增加了一层类型转换
- ToolResult 需要维护额外的类型定义

---

#### 层次2: ToolResult → Diagnostic[]/TextEdit[] (Adapter/Factory层)

**位置**: `adapters/diagnosticFactory.ts`、`adapters/formatterAdapter.ts`

**职责**: 将工具结果转换为 VSCode API 类型

**示例**:
```typescript
// DiagnosticFactory
static convertToolResultToDiagnostics(
    result: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    if (result.executeErrors?.length) {
        for (const err of result.executeErrors) {
            diagnostics.push(this.createExecuteError(err, document, source));
        }
    }
    // ...
    return diagnostics;
}
```

**优势**:
- 错误优先级统一管理
- 诊断创建逻辑集中
- 易于维护和测试

**问题**:
- 又增加了一层转换
- DiagnosticAdapter 现在只是简单委托

---

#### 层次3: Diagnostic[]/TextEdit[] → PluginResult (Plugin层)

**位置**: `plugins/baseFormatPlugin.ts`

**职责**: 包装结果，计算 hasErrors，统一返回格式

**示例**:
```typescript
// BaseFormatPlugin
protected createCheckResult(
    toolResult: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
): PluginCheckResult {
    const diagnostics = DiagnosticAdapter.convertCheckResultToDiagnostics(
        toolResult,
        document,
        source,
    );

    return {
        hasErrors: diagnostics.some(
            (diag: vscode.Diagnostic) =>
                diag.severity === vscode.DiagnosticSeverity.Error,
        ),
        diagnostics,
    };
}
```

**优势**:
- 统一的返回格式
- hasErrors 计算集中
- 异常处理统一

**问题**:
- 增加了无意义的包装层
- PluginResult 和 Diagnostic[]/TextEdit[] 几乎等价

---

### 1.3 复杂度分析

**转换次数**: 3次
**中间类型**: 3个 (ExecutorResult → ToolResult → Diagnostic[]/TextEdit[] → PluginResult)
**代码行数**: 约500+行转换逻辑
**维护成本**: 每添加新工具需要修改3个转换点

---

## 2. 优化方案

### 方案1: 精简转换层（推荐）⭐⭐⭐⭐⭐

#### 核心思路
保留 Parser 层（工具无关），移除不必要的 PluginResult 包装层。

#### 优化后数据流
```
执行命令 → ExecutorResult
    ↓ Parser
ToolResult
    ↓ DiagnosticFactory/FormatterAdapter
Diagnostic[] / TextEdit[]
    ↓
VSCode API (直接使用，无 PluginResult)
```

#### 改动点

**1. 移除 PluginResult 类型**
```typescript
// 删除或标记为 @deprecated
// src/plugins/pluginInterface.ts

// 原代码
export interface PluginCommonResult {
    hasErrors: boolean;
    diagnostics: Diagnostic[];
}

export interface PluginCheckResult extends PluginCommonResult { }
export interface PluginFormatResult extends PluginCommonResult {
    textEdits: TextEdit[];
}

// 优化后：直接返回 vscode.Diagnostic[] 或 { diagnostics: Diagnostic[], textEdits: TextEdit[] }
```

**2. 简化 IFormatPlugin 接口**
```typescript
// src/plugins/pluginInterface.ts

// 优化后的接口
export interface IFormatPlugin {
    name: string;
    displayName: string;
    version: string;
    description: string;
    isAvailable(): Promise<boolean>;

    // 直接返回 Diagnostic[]，不需要 PluginResult 包装
    check(document: TextDocument, options: PluginCheckOptions): Promise<Diagnostic[]>;

    // 返回 { diagnostics, textEdits }，不需要 hasErrors（可计算）
    format?(document: TextDocument, options: PluginFormatOptions): Promise<{
        diagnostics: Diagnostic[];
        textEdits: TextEdit[];
    }>;

    getSupportedExtensions(): string[];
}
```

**3. 简化 BaseFormatPlugin**
```typescript
// src/plugins/baseFormatPlugin.ts

export abstract class BaseFormatPlugin implements IFormatPlugin {
    // 保留基本抽象方法...

    // 简化：直接返回 Diagnostic[]
    protected convertToDiagnostics(
        toolResult: ToolCheckResult,
        document: vscode.TextDocument,
        source: string,
    ): Diagnostic[] {
        return DiagnosticFactory.convertToolResultToDiagnostics(
            toolResult,
            document,
            source,
        );
    }

    // 简化：直接返回 { diagnostics, textEdits }
    protected convertToFormatResult(
        toolResult: ToolFormatResult,
        document: vscode.TextDocument,
        source: string,
    ): { diagnostics: Diagnostic[]; textEdits: TextEdit[] } {
        return FormatterAdapter.convertFormatResultToDiagnosticsAndTextEdits(
            toolResult,
            document,
            source,
        );
    }
}
```

**4. 更新插件实现**
```typescript
// src/plugins/pureShfmtPlugin.ts

async check(
    document: vscode.TextDocument,
    options: PluginCheckOptions,
): Promise<Diagnostic[]> {  // 直接返回 Diagnostic[]
    const timer = startTimer(PERFORMANCE_METRICS.SHFMT_DIAGNOSE_DURATION);
    try {
        const result = await this.tool.check("-", {
            ...this.defaultShfmtOptions,
            token: options.token,
            content: document.getText(),
        });

        timer.stop();

        // 简化：直接返回 Diagnostic[]
        return this.convertToDiagnostics(
            result,
            document,
            this.getDiagnosticSource(),
        );
    } catch (error) {
        timer.stop();
        logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
        // 异常时返回错误诊断
        return [
            DiagnosticFactory.createExecuteError(
                {
                    command: 'shfmt',
                    exitCode: null,
                    message: String(error),
                },
                document,
                this.getDiagnosticSource(),
            ),
        ];
    }
}

async format(
    document: vscode.TextDocument,
    options: PluginFormatOptions,
): Promise<{ diagnostics: Diagnostic[]; textEdits: TextEdit[] }> {
    const timer = startTimer(PERFORMANCE_METRICS.SHFMT_FORMAT_DURATION);
    try {
        const result = await this.tool.format("-", {
            ...this.defaultShfmtOptions,
            token: options.token,
            content: document.getText(),
        });

        timer.stop();

        // 简化：直接返回 { diagnostics, textEdits }
        return this.convertToFormatResult(
            result,
            document,
            this.getDiagnosticSource(),
        );
    } catch (error) {
        timer.stop();
        logger.error(`PureShfmtPlugin.format failed: ${String(error)}`);
        const errorDiagnostic = DiagnosticFactory.createExecuteError(
            {
                command: 'shfmt',
                exitCode: null,
                message: String(error),
            },
            document,
            this.getDiagnosticSource(),
        );
        return { diagnostics: [errorDiagnostic], textEdits: [] };
    }
}
```

**5. 更新 PluginManager**
```typescript
// src/plugins/pluginManager.ts

async check(
    document: vscode.TextDocument,
    options: PluginCheckOptions,
): Promise<PluginCheckResult> {
    const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_EXECUTE_CHECK_DURATION);

    if (this.activePlugins.size === 0) {
        return { diagnostics: [], hasErrors: false };
    }

    const allDiagnostics: vscode.Diagnostic[] = [];

    for (const name of this.activePlugins) {
        const plugin = this.plugins.get(name);
        if (plugin) {
            try {
                // 直接获取 Diagnostic[]
                const diagnostics = await plugin.check(document, options);
                allDiagnostics.push(...diagnostics);
            } catch (error) {
                const msg = `Plugin "${name}" check failed: ${String(error)}`;
                logger.error(msg);
                // 转换为 Diagnostic
                allDiagnostics.push(this.createErrorDiagnostic(msg, document, name));
            }
        }
    }

    timer.stop();
    return {
        diagnostics: allDiagnostics,
        hasErrors: allDiagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error),
    };
}

async format(
    document: vscode.TextDocument,
    options: PluginFormatOptions,
): Promise<PluginFormatResult> {
    const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_EXECUTE_FORMAT_DURATION);

    if (this.activePlugins.size === 0) {
        return { diagnostics: [], textEdits: [], hasErrors: true };
    }

    const allDiagnostics: vscode.Diagnostic[] = [];
    let finalTextEdits: vscode.TextEdit[] = [];

    for (const name of this.activePlugins) {
        const plugin = this.plugins.get(name);
        if (plugin?.format) {
            try {
                // 直接获取 { diagnostics, textEdits }
                const { diagnostics, textEdits } = await plugin.format(document, options);
                allDiagnostics.push(...diagnostics);

                // 如果有 textEdits，直接返回
                if (textEdits.length > 0) {
                    finalTextEdits = textEdits;
                    break;
                }
            } catch (error) {
                const msg = `Plugin "${name}" format failed: ${String(error)}`;
                logger.error(msg);
                allDiagnostics.push(this.createErrorDiagnostic(msg, document, name));
            }
        }
    }

    timer.stop();
    return {
        diagnostics: allDiagnostics,
        textEdits: finalTextEdits,
        hasErrors: allDiagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error),
    };
}
```

#### 优势分析

**✅ 显著优势**:
1. **减少转换次数**: 从3次降到2次
2. **简化类型系统**: 移除 PluginResult 类型
3. **降低维护成本**: 减少约30%的转换代码
4. **提升性能**: 减少不必要的数据复制
5. **代码更清晰**: PluginManager 直接处理 Diagnostic[]

**⚠️ 影响范围**:
- 需要修改所有插件实现
- 需要更新 PluginManager
- 需要更新测试代码

**📊 复杂度对比**:
- 转换次数: 3 → 2 (↓33%)
- 中间类型: 4 → 3 (↓25%)
- 转换代码: ~500行 → ~350行 (↓30%)

---

### 方案2: 管道模式（进阶）⭐⭐⭐⭐

#### 核心思路
引入管道模式，将数据转换步骤抽象为管道，每个管道处理一个转换。

#### 优化后数据流
```
执行命令 → ExecutorResult
    ↓ 管道: ParsePipeline
ToolResult
    ↓ 管道: AdaptPipeline
Diagnostic[] / TextEdit[]
    ↓
VSCode API
```

#### 实现示例

**1. 定义管道接口**
```typescript
// src/pipelines/pipeline.ts

export interface Pipeline<TInput, TOutput> {
    process(input: TInput): TOutput | Promise<TOutput>;
}

export class PipelineBuilder<TInput, TOutput> {
    private pipelines: Pipeline<any, any>[] = [];

    pipe<TNewOutput>(pipeline: Pipeline<TOutput, TNewOutput>): PipelineBuilder<TInput, TNewOutput> {
        this.pipelines.push(pipeline);
        return this as any;
    }

    build(): Pipeline<TInput, TOutput> {
        return {
            process: async (input: TInput): Promise<TOutput> => {
                let result: any = input;
                for (const pipeline of this.pipelines) {
                    result = await pipeline.process(result);
                }
                return result;
            },
        };
    }
}
```

**2. 定义转换管道**
```typescript
// src/pipelines/diagnosticPipeline.ts

export class ParsePipeline implements Pipeline<ExecutionResult, ToolCheckResult> {
    constructor(private mode: "format" | "check") {}

    process(input: ExecutionResult): ToolCheckResult {
        if (this.mode === "check") {
            return parseShfmtOutput(input, "check");
        } else {
            return parseShfmtOutput(input, "format");
        }
    }
}

export class AdaptPipeline implements Pipeline<ToolCheckResult, Diagnostic[]> {
    constructor(
        private document: vscode.TextDocument,
        private source: string,
    ) {}

    process(input: ToolCheckResult): Diagnostic[] {
        return DiagnosticFactory.convertToolResultToDiagnostics(
            input,
            this.document,
            this.source,
        );
    }
}
```

**3. 使用管道**
```typescript
// src/plugins/pureShfmtPlugin.ts

async check(
    document: vscode.TextDocument,
    options: PluginCheckOptions,
): Promise<Diagnostic[]> {
    const timer = startTimer(PERFORMANCE_METRICS.SHFMT_DIAGNOSE_DURATION);
    try {
        const execResult = await this.tool.check("-", {
            ...this.defaultShfmtOptions,
            token: options.token,
            content: document.getText(),
        });

        timer.stop();

        // 构建并执行管道
        const pipeline = new PipelineBuilder<ExecutionResult, Diagnostic[]>()
            .pipe(new ParsePipeline("check"))
            .pipe(new AdaptPipeline(document, this.getDiagnosticSource()))
            .build();

        return await pipeline.process(execResult);
    } catch (error) {
        timer.stop();
        logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
        // 返回错误诊断
        return [
            DiagnosticFactory.createExecuteError(
                { command: 'shfmt', exitCode: null, message: String(error) },
                document,
                this.getDiagnosticSource(),
            ),
        ];
    }
}
```

#### 优势分析

**✅ 优势**:
1. **更清晰的抽象**: 每个管道职责单一
2. **易于测试**: 每个管道可独立测试
3. **易于扩展**: 新增转换步骤只需添加新管道
4. **可组合**: 管道可以灵活组合

**⚠️ 劣势**:
1. **引入额外抽象**: 学习成本增加
2. **性能开销**: 管道调用有一定开销
3. **过度设计**: 当前场景可能不需要

**📊 适用场景**:
- 转换步骤复杂且可能变化
- 需要动态组合转换流程
- 团队熟悉管道模式

---

### 方案3: 直达模式（激进）⭐⭐⭐

#### 核心思路
Parser 直接返回 VSCode API 类型，移除中间的所有转换层。

#### 优化后数据流
```
执行命令 → ExecutorResult
    ↓ Parser (直接返回 vscode.Diagnostic[])
Diagnostic[]
    ↓
VSCode API
```

#### 实现示例

**1. Parser 直接返回 Diagnostic[]**
```typescript
// src/tools/shell/shfmt/parser.ts

export function parseShfmtOutputToDiagnostics(
    result: ExecutionResult,
    mode: "format" | "check",
    document: vscode.TextDocument,
    source: string,
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // 检查执行错误
    if (result.error) {
        diagnostics.push(DiagnosticFactory.createExecuteError(
            { command: result.command, exitCode: result.exitCode, message: result.error.message },
            document,
            source,
        ));
        return diagnostics;
    }

    if (mode === "check") {
        // 解析检查结果，直接创建 Diagnostic
        if (result.exitCode !== 0) {
            if (result.stderr.trim()) {
                const syntaxErrors = parseSyntaxErrors(result.stderr);
                for (const error of syntaxErrors) {
                    diagnostics.push(DiagnosticFactory.createSyntaxError(error, document, source));
                }
            }
            if (result.stdout.trim()) {
                const formatIssues = parseDiffOutput(result.stdout);
                for (const issue of formatIssues) {
                    diagnostics.push(DiagnosticFactory.createFormatIssue(issue, source));
                }
            }
        }
    } else if (mode === "format") {
        // 格式化模式：只返回错误诊断
        if (result.exitCode !== 0 && result.stderr.trim()) {
            const syntaxErrors = parseSyntaxErrors(result.stderr);
            for (const error of syntaxErrors) {
                diagnostics.push(DiagnosticFactory.createSyntaxError(error, document, source));
            }
        }
    }

    return diagnostics;
}
```

**2. 插件直接调用**
```typescript
// src/plugins/pureShfmtPlugin.ts

async check(
    document: vscode.TextDocument,
    options: PluginCheckOptions,
): Promise<Diagnostic[]> {
    const timer = startTimer(PERFORMANCE_METRICS.SHFMT_DIAGNOSE_DURATION);
    try {
        const execResult = await this.tool.check("-", {
            ...this.defaultShfmtOptions,
            token: options.token,
            content: document.getText(),
        });

        timer.stop();

        // 直接返回 Diagnostic[]
        return parseShfmtOutputToDiagnostics(
            execResult,
            "check",
            document,
            this.getDiagnosticSource(),
        );
    } catch (error) {
        timer.stop();
        logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
        return [
            DiagnosticFactory.createExecuteError(
                { command: 'shfmt', exitCode: null, message: String(error) },
                document,
                this.getDiagnosticSource(),
            ),
        ];
    }
}
```

#### 优势分析

**✅ 显著优势**:
1. **最少转换**: 只有1次转换
2. **最快性能**: 无中间类型转换开销
3. **最简单代码**: 最少的转换代码

**⚠️ 劣势**:
1. **失去抽象**: Parser 直接依赖 VSCode API
2. **难以测试**: Parser 需要模拟 vscode.TextDocument
3. **难以扩展**: 无法支持其他编辑器
4. **紧耦合**: 工具层与 VSCode 耦合

**📊 复杂度对比**:
- 转换次数: 3 → 1 (↓67%)
- 中间类型: 4 → 1 (↓75%)
- 转换代码: ~500行 → ~150行 (↓70%)

---

## 3. 方案对比

| 维度 | 方案1: 精简转换层 | 方案2: 管道模式 | 方案3: 直达模式 |
| ---- | ---------------- | --------------- | -------------- |
| **转换次数** | 2次 | 2次 | 1次 |
| **中间类型** | 3个 | 3个 | 1个 |
| **代码复杂度** | 低 | 中 | 极低 |
| **可维护性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **可扩展性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **可测试性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **性能** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **学习成本** | 低 | 中 | 低 |
| **架构清晰度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **推荐指数** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 4. 推荐方案

### 推荐方案1: 精简转换层 ⭐⭐⭐⭐⭐

**理由**:
1. ✅ 平衡了性能和架构清晰度
2. ✅ 保留了必要的抽象层次（Parser层）
3. ✅ 移除了无意义的 PluginResult 包装
4. ✅ 改动适中，风险可控
5. ✅ 向后兼容性好（可保留 PluginResult 作为类型别名）

**适用场景**:
- 当前架构已基本合理
- 需要适度优化
- 团队不希望大规模重构

**实施优先级**: **P1** (短期实施，2-4周)

---

### 备选方案2: 管道模式 ⭐⭐⭐⭐

**理由**:
1. ✅ 更清晰的抽象和职责分离
2. ✅ 易于扩展和测试
3. ✅ 适合未来需求变化

**适用场景**:
- 预期转换步骤会增加
- 团队熟悉函数式编程
- 需要灵活组合转换流程

**实施优先级**: **P2** (中期规划，1-2月)

---

### 不推荐方案3: 直达模式 ⭐⭐⭐

**理由**:
1. ❌ 失去了必要的抽象
2. ❌ 工具层与 VSCode 紧耦合
3. ❌ 难以支持其他编辑器
4. ❌ 违反分层架构原则

**适用场景**:
- 仅支持 VSCode，无其他编辑器计划
- 性能要求极高
- 团队追求极简主义

**实施优先级**: **不推荐**

---

## 5. 实施计划（方案1）

### 阶段1: 准备工作（1周）

1. **代码分析**
   - 确认所有使用 PluginResult 的位置
   - 分析影响范围

2. **测试准备**
   - 编写单元测试覆盖转换逻辑
   - 准备集成测试

3. **文档更新**
   - 更新接口文档
   - 编写迁移指南

### 阶段2: 逐步迁移（2-3周）

1. **简化接口定义**
   - 修改 IFormatPlugin 接口
   - 保留 PluginResult 作为 @deprecated 类型别名

2. **更新 BaseFormatPlugin**
   - 简化转换方法
   - 更新异常处理

3. **更新插件实现**
   - 更新 PureShfmtPlugin
   - 更新 PureShellcheckPlugin
   - 运行测试验证

4. **更新 PluginManager**
   - 调整 check 方法
   - 调整 format 方法
   - 运行测试验证

### 阶段3: 清理工作（1周）

1. **删除废弃代码**
   - 移除 PluginResult 相关类型
   - 清理未使用的导入

2. **文档完善**
   - 更新架构文档
   - 更新 README

3. **性能测试**
   - 对比优化前后性能
   - 确认性能提升

### 阶段4: 发布（1周）

1. **代码审查**
   - 团队评审
   - 收集反馈

2. **发布**
   - 版本号更新
   - 发布说明

---

## 6. 风险与缓解

### 风险1: 破坏现有扩展点

**风险描述**: 可能有其他扩展或测试代码依赖 PluginResult

**缓解措施**:
- 保留 PluginResult 作为类型别名（@deprecated）
- 提供兼容性库
- 发布前通知相关方

### 风险2: 回归缺陷

**风险描述**: 修改可能导致现有功能失效

**缓解措施**:
- 完善单元测试
- 完善集成测试
- 灰度发布

### 风险3: 团队学习成本

**风险描述**: 新接口需要团队学习

**缓解措施**:
- 提供详细的迁移指南
- 代码示例
- 团队培训

---

## 7. 预期收益

### 定量收益

| 指标 | 当前 | 优化后 | 提升 |
| ---- | ---- | ------ | ---- |
| 转换次数 | 3次 | 2次 | ↓33% |
| 中间类型 | 4个 | 3个 | ↓25% |
| 转换代码行数 | ~500行 | ~350行 | ↓30% |
| 类型定义 | ~50行 | ~30行 | ↓40% |

### 定性收益

1. **代码清晰度提升**: 更少的中间层，代码更易理解
2. **维护成本降低**: 更少的转换逻辑需要维护
3. **性能提升**: 减少不必要的数据复制和转换
4. **架构更简洁**: 移除无意义的包装层
5. **开发效率提升**: 新增工具支持更简单

---

## 8. 总结

### 核心建议

1. **推荐采用方案1（精简转换层）**
   - 平衡性能和架构清晰度
   - 风险可控，改动适中
   - 预期收益显著

2. **实施优先级: P1**
   - 短期实施（2-4周）
   - 分阶段迁移，降低风险
   - 完善测试覆盖

3. **保留方案2（管道模式）作为未来选项**
   - 当前架构已够用，暂不引入
   - 视需求变化考虑实施
   - 作为演进路线图的一部分

### 实施检查清单

- [ ] 完成代码分析，确认影响范围
- [ ] 编写单元测试覆盖转换逻辑
- [ ] 修改 IFormatPlugin 接口
- [ ] 更新 BaseFormatPlugin
- [ ] 更新所有插件实现
- [ ] 更新 PluginManager
- [ ] 运行所有测试验证
- [ ] 性能测试对比
- [ ] 更新文档
- [ ] 代码审查
- [ ] 发布

---

**文档版本**: v1.0
**最后更新**: 2026-01-19
**下次评审**: 优化完成后
