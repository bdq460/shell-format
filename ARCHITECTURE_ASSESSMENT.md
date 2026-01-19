# 架构评估报告：插件到代码执行的数据流

## 📊 现状分析

### 1. 当前数据流架构

```
工具层 (tools/shell/*)
    ↓ (返回: CheckResult/FormatResult - 包含 4 种错误类型)

适配器层 (adapters/)
    ├─ DiagnosticAdapter.convert()
    └─ FormatterAdapter.convert()
    ↓ (返回: vscode.Diagnostic[]/vscode.TextEdit[])

插件层 (plugins/BaseFormatPlugin)
    ├─ createCheckResult()    # 包装适配器输出
    ├─ createFormatResult()   # 检查多个错误条件
    └─ handleCheckError()     # 异常处理
    ↓ (返回: CheckResult/FormatResult 对象)

命令/提供者层 (commands/, providers/)
    └─ 使用诊断和编辑结果
```

### 2. 问题识别

#### **问题 1: 结果类型的重复定义（多层复用）**

| 层级     | 返回类型                                  | 包含的字段                                                                |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| 工具层   | `CheckResult`/`FormatResult`              | syntaxErrors, formatIssues, linterIssues, executeErrors, formattedContent |
| 适配器层 | `vscode.Diagnostic[]`/`vscode.TextEdit[]` | range, severity, source, code, message                                    |
| 插件层   | `CheckResult`/`FormatResult`              | **相同的工具层类型** ⚠️ 重复包装                                          |

**根本问题**：插件层的返回类型和工具层相同，导致结果被重复包装。

#### **问题 2: 多层级的转换和检查逻辑分散**

错误处理和结果转换逻辑分布在 3 个地方：

```typescript
// 工具层 -> 工具结果对象
CheckResult {
    syntaxErrors?: SyntaxError[]        // 不处理
    formatIssues?: FormatIssue[]        // 不处理
    linterIssues?: LinterIssue[]        // 不处理
    executeErrors?: ExecuteError[]      // 不处理
}

// 适配器层 -> DiagnosticAdapter.convert()
在 DiagnosticAdapter.convert() 中：
if (result.executeErrors) { ... }
if (result.syntaxErrors) { ... }
if (result.formatIssues) { ... }
if (result.linterIssues) { ... }

// 插件层 -> BaseFormatPlugin.createFormatResult()
if (formatResult.executeErrors && ...) { ... }
if (formatResult.syntaxErrors && ...) { ... }
if (!formatResult.formattedContent) { ... }
```

**问题**：同样的条件判断在适配器层和插件层都重复出现！

#### **问题 3: 插件层的检查逻辑过重**

`BaseFormatPlugin.createFormatResult()` 执行了 **3 层转换**：

```typescript
// 1️⃣ 第一层：检查执行错误
if (formatResult.executeErrors && formatResult.executeErrors.length > 0) {
    return createErrorFormatResult(...)
}

// 2️⃣ 第二层：检查语法错误
if (formatResult.syntaxErrors && formatResult.syntaxErrors.length > 0) {
    return { ... }
}

// 3️⃣ 第三层：转换 TextEdit
const edits = textEditsConverter(formatResult, document);

// 4️⃣ 第四层：创建返回结果
return createSuccessFormatResult(edits, ...)
```

这些操作应该更早被处理（在适配器层）。

#### **问题 4: CheckResult 的歧义（工具层 vs 插件层）**

```typescript
// 工具层的 CheckResult 用来表示工具执行的原始结果
export interface CheckResult extends ToolResult {
  syntaxErrors?: SyntaxError[];
  formatIssues?: FormatIssue[];
  linterIssues?: LinterIssue[];
  executeErrors?: ExecuteError[];
}

// 插件层的 CheckResult 用来表示插件处理后的结果
export interface CheckResult {
  hasErrors: boolean;
  diagnostics: Diagnostic[]; // 这里已经是 VSCode 对象了
  errorMessage?: string;
}
```

**同名不同意**：两个 CheckResult 指代不同的东西，容易造成混淆。

---

## 🔧 改进建议

### **方案 A: 分离职责（推荐）**

#### 核心思想

- 工具层 → 返回原始结构化数据
- 适配器层 → 完全处理所有转换和错误，返回最终 VSCode 对象
- 插件层 → 仅编排适配器，不重复处理

#### 具体改进

**1. 重命名工具层类型，避免命名冲突**

```typescript
// src/tools/shell/types.ts
export interface ToolCheckResult {
  // 重命名
  syntaxErrors?: SyntaxError[];
  formatIssues?: FormatIssue[];
  linterIssues?: LinterIssue[];
  executeErrors?: ExecuteError[];
}

export interface ToolFormatResult extends ToolCheckResult {
  formattedContent?: string;
}
```

**2. 增强适配器的职责**

```typescript
// src/adapters/diagnosticAdapter.ts
export class DiagnosticAdapter {
  /**
   * 完整的结果处理
   * 包含：错误检查、诊断创建、错误聚合
   */
  static convertToDiagnosticsWithErrors(
    result: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
  ): { diagnostics: vscode.Diagnostic[]; errorMessage?: string } {
    const diagnostics: vscode.Diagnostic[] = [];
    let errorMessage: string | undefined;

    // 统一的错误优先级处理
    if (result.executeErrors && result.executeErrors.length > 0) {
      errorMessage = result.executeErrors[0].message;
      diagnostics.push(
        ...this.createExecuteErrors(result.executeErrors, document, source),
      );
    }

    if (result.syntaxErrors && result.syntaxErrors.length > 0) {
      errorMessage ||= `${result.syntaxErrors.length} syntax errors found`;
      diagnostics.push(
        ...this.createSyntaxErrors(result.syntaxErrors, document, source),
      );
    }

    if (result.formatIssues && result.formatIssues.length > 0) {
      diagnostics.push(...this.createFormatIssues(result.formatIssues, source));
    }

    if (result.linterIssues && result.linterIssues.length > 0) {
      diagnostics.push(...this.createLinterIssues(result.linterIssues, source));
    }

    return { diagnostics, errorMessage };
  }

  private static createExecuteErrors(
    errors: ExecuteError[],
    document: vscode.TextDocument,
    source: string,
  ): vscode.Diagnostic[] {
    // 实现...
  }

  // ... 其他辅助方法
}
```

**3. 增强格式化适配器，处理错误条件**

```typescript
// src/adapters/formatterAdapter.ts
export class FormatterAdapter {
  static convertToTextEditsWithValidation(
    result: ToolFormatResult,
    document: vscode.TextDocument,
  ): { textEdits: vscode.TextEdit[]; error?: string } {
    // 错误优先级处理
    if (result.executeErrors?.length > 0) {
      return { textEdits: [], error: result.executeErrors[0].message };
    }

    if (result.syntaxErrors?.length > 0) {
      return {
        textEdits: [],
        error: `Cannot format: ${result.syntaxErrors.length} syntax errors`,
      };
    }

    if (!result.formattedContent) {
      return { textEdits: [], error: "No formatted content returned" };
    }

    if (result.formattedContent === document.getText()) {
      return { textEdits: [] }; // 无需修改
    }

    return {
      textEdits: [
        this.createFullDocumentEdit(result.formattedContent, document),
      ],
    };
  }

  private static createFullDocumentEdit(
    content: string,
    document: vscode.TextDocument,
  ): vscode.TextEdit {
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );
    return vscode.TextEdit.replace(fullRange, content);
  }
}
```

**4. 简化插件层**

```typescript
// src/plugins/baseFormatPlugin.ts
export abstract class BaseFormatPlugin implements IFormatPlugin {
  // ... 其他方法

  /**
   * 简化的 check 处理
   */
  protected createCheckResult(
    toolResult: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
  ): CheckResult {
    const { diagnostics, errorMessage } =
      DiagnosticAdapter.convertToDiagnosticsWithErrors(
        toolResult,
        document,
        source,
      );

    return {
      hasErrors: diagnostics.some(
        (d) => d.severity === vscode.DiagnosticSeverity.Error,
      ),
      diagnostics,
      errorMessage,
    };
  }

  /**
   * 简化的 format 处理
   */
  protected createFormatResult(
    toolResult: ToolFormatResult,
    document: vscode.TextDocument,
    diagnosticSource: string,
  ): FormatResult {
    // 处理诊断
    const { diagnostics, errorMessage } =
      DiagnosticAdapter.convertToDiagnosticsWithErrors(
        toolResult,
        document,
        diagnosticSource,
      );

    // 处理文本编辑
    const { textEdits, error } =
      FormatterAdapter.convertToTextEditsWithValidation(toolResult, document);

    return {
      hasErrors:
        diagnostics.some(
          (d) => d.severity === vscode.DiagnosticSeverity.Error,
        ) || !!error,
      diagnostics,
      errorMessage: errorMessage || error,
      textEdits,
    };
  }
}
```

**5. 简化插件实现**

```typescript
// src/plugins/pureShellcheckPlugin.ts
export class PureShellcheckPlugin extends BaseFormatPlugin {
  async check(
    document: vscode.TextDocument,
    options: CheckOptions,
  ): Promise<CheckResult> {
    const timer = startTimer(PERFORMANCE_METRICS.SHELLCHECK_DIAGNOSE_DURATION);
    try {
      const toolResult = await this.tool.check({
        file: "-",
        token: options.token,
        content: document.getText(),
      });

      timer.stop();

      // 直接委托给基类处理（少 2 步转换）
      return this.createCheckResult(
        toolResult,
        document,
        this.getDiagnosticSource(),
      );
    } catch (error) {
      timer.stop();
      logger.error(`PureShellcheckPlugin.check failed: ${String(error)}`);
      return this.handleCheckError(document, error);
    }
  }
}
```

### **方案 B: 使用 Result 模式（替代方案）**

如果将来需要更复杂的错误处理，可以考虑使用 Result 模式：

```typescript
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// 使用示例
export interface CheckResult {
  diagnostics: Result<vscode.Diagnostic[], ErrorInfo>;
  errorMessage?: string;
}
```

---

## 📈 改进效果对比

| 方面               | 现在                                          | 改进后                                     |
| ------------------ | --------------------------------------------- | ------------------------------------------ |
| **代码行数**       | BaseFormatPlugin 279 行                       | ~150 行（减少 46%）                        |
| **错误检查重复**   | 3 处                                          | 1 处（在适配器层）                         |
| **类型命名冲突**   | CheckResult 用于 2 种不同的事物               | 明确分离：ToolCheckResult vs CheckResult   |
| **转换层级**       | 工具 → 适配器 → 插件 → 外层                   | 工具 → 适配器 → 插件（消除了插件层的转换） |
| **测试复杂度**     | 需要 mock 多层逻辑                            | 每层独立测试，减少 mock 复杂度             |
| **新增插件的成本** | 需要实现 createCheckResult/createFormatResult | 仅需调用基类的简单方法                     |

---

## 🎯 实施优先级

1. **高优先级**（强烈推荐）
   - 重命名工具层 CheckResult → ToolCheckResult
   - 增强适配器的错误处理能力
   - 简化 BaseFormatPlugin 的逻辑

2. **中优先级**（提高代码质量）
   - 提取错误优先级处理为共享的枚举/常量
   - 完整的单元测试覆盖

3. **低优先级**（可选）
   - 考虑 Result 模式用于复杂场景

---

## 💡 额外建议

### 1. 增加类型守卫（Type Guards）

```typescript
// src/adapters/diagnosticAdapter.ts
export class DiagnosticAdapter {
  static hasExecuteErrors(result: ToolResult): boolean {
    return !!result.executeErrors?.length;
  }

  static hasSyntaxErrors(result: ToolResult): boolean {
    return !!result.syntaxErrors?.length;
  }

  // ... 使用统一的守卫，避免重复的空值检查
}
```

### 2. 创建错误优先级常量

```typescript
// src/adapters/constants.ts
export const ERROR_PRIORITY = {
  EXECUTE: 0, // 最高优先级
  SYNTAX: 1,
  FORMAT: 2,
  LINTER: 3, // 最低优先级
} as const;
```

### 3. 文档化数据流

在 ARCHITECTURE_REVIEW.md 中添加数据流图：

```
[Tool Result]
    │
    ├─► Diagnostics Adapter ─► Diagnostic[]
    │
    ├─► Formatter Adapter ─► TextEdit[]
    │
[Plugin Result]
```
