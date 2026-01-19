# 架构改进实施方案

## 📋 改进步骤清单

### Phase 1: 类型系统重构（低风险）

#### Step 1.1: 重命名工具层类型

**文件**: `src/tools/shell/types.ts`

- [ ] 重命名 `CheckResult` → `ToolCheckResult`
- [ ] 重命名 `FormatResult` → `ToolFormatResult`
- [ ] 更新所有导入和使用处
- [ ] 验证编译无错误

**影响范围**:

- `src/tools/shell/shellcheck/shellcheckTool.ts`
- `src/tools/shell/shfmt/shfmtTool.ts`
- `src/adapters/diagnosticAdapter.ts`
- `src/adapters/formatterAdapter.ts`

**验证方法**:

```bash
# 搜索所有使用处
grep -r "CheckResult\|FormatResult" src/ --include="*.ts" | grep -v node_modules
```

---

### Phase 2: 适配器层增强（中风险，需要细致处理）

#### Step 2.1: 增强 DiagnosticAdapter

**文件**: `src/adapters/diagnosticAdapter.ts`

**现有方法保留**:

- `convert()` - 基础转换（保持兼容性）

**新增方法**:

```typescript
static convertToDiagnosticsWithErrors(
    result: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
): { diagnostics: vscode.Diagnostic[]; errorMessage?: string }
```

**实现要点**:

- 统一的错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
- 提取首个错误作为 errorMessage
- 返回完整的诊断数组和错误信息

**测试用例**:

```typescript
describe("DiagnosticAdapter.convertToDiagnosticsWithErrors", () => {
  it("should prioritize execute errors over other errors");
  it("should extract first error as error message");
  it("should include all issue types in diagnostics");
  it("should handle empty results");
});
```

#### Step 2.2: 增强 FormatterAdapter

**文件**: `src/adapters/formatterAdapter.ts`

**新增方法**:

```typescript
static convertToTextEditsWithValidation(
    result: ToolFormatResult,
    document: vscode.TextDocument,
): { textEdits: vscode.TextEdit[]; error?: string }
```

**实现要点**:

- 检查 executeErrors (返回 error)
- 检查 syntaxErrors (返回 error)
- 检查 formattedContent 存在性
- 比较内容变化
- 返回 TextEdit 数组和可选的错误信息

**测试用例**:

```typescript
describe("FormatterAdapter.convertToTextEditsWithValidation", () => {
  it("should return error on execute errors");
  it("should return error on syntax errors");
  it("should return empty edits when content unchanged");
  it("should return full document edit on content change");
});
```

---

### Phase 3: 插件层简化（高优先级）

#### Step 3.1: 更新 BaseFormatPlugin

**文件**: `src/plugins/baseFormatPlugin.ts`

**移除的方法**:

- `createCheckResult()` 中的诊断转换逻辑
- `createFormatResult()` 中的条件检查逻辑
- 相关的辅助函数（例如 `getErrorMessage()` 可以内联到适配器）

**保留的方法**:

- `handleCheckError()` - 仅处理异常情况
- `handleFormatError()` - 仅处理异常情况

**简化后的 createCheckResult()**:

```typescript
protected createCheckResult(
    toolResult: ToolCheckResult,
    document: vscode.TextDocument,
    source: string,
): CheckResult {
    const { diagnostics, errorMessage } = DiagnosticAdapter
        .convertToDiagnosticsWithErrors(toolResult, document, source);

    return {
        hasErrors: diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error),
        diagnostics,
        errorMessage,
    };
}
```

**简化后的 createFormatResult()**:

```typescript
protected createFormatResult(
    toolResult: ToolFormatResult,
    document: vscode.TextDocument,
    diagnosticSource: string,
): FormatResult {
    // 处理诊断
    const { diagnostics, errorMessage } = DiagnosticAdapter
        .convertToDiagnosticsWithErrors(toolResult, document, diagnosticSource);

    // 处理文本编辑
    const { textEdits, error } = FormatterAdapter
        .convertToTextEditsWithValidation(toolResult, document);

    return {
        hasErrors: diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error) || !!error,
        diagnostics,
        errorMessage: errorMessage || error,
        textEdits,
    };
}
```

---

### Phase 4: 插件实现更新（低风险）

#### Step 4.1: 更新 PureShellcheckPlugin

**文件**: `src/plugins/pureShellcheckPlugin.ts`

**改动**:

- 将 `DiagnosticAdapter.convert` 替换为 `this.createCheckResult()`
- 后者已经调用了新的 `convertToDiagnosticsWithErrors()` 方法

**改动前**:

```typescript
return this.createCheckResult(
  result,
  document,
  PackageInfo.diagnosticSource,
  DiagnosticAdapter.convert, // 传递转换函数
);
```

**改动后**:

```typescript
return this.createCheckResult(result, document, this.getDiagnosticSource());
```

#### Step 4.2: 更新 PureShfmtPlugin

**类似处理** (如果存在)

---

### Phase 5: 测试和验证（必须做）

#### Step 5.1: 单元测试

**文件**: `test/unit/adapters/diagnosticAdapter.test.ts`

```typescript
describe("DiagnosticAdapter", () => {
  describe("convertToDiagnosticsWithErrors", () => {
    it("should handle execute errors with highest priority");
    it("should handle syntax errors");
    it("should handle format issues");
    it("should handle linter issues");
    it("should extract error message correctly");
    it("should return empty array for empty result");
  });
});
```

**文件**: `test/unit/adapters/formatterAdapter.test.ts`

```typescript
describe("FormatterAdapter", () => {
  describe("convertToTextEditsWithValidation", () => {
    it("should return error on execute errors");
    it("should return error on syntax errors");
    it("should return empty edits when no content change");
    it("should return full document edit on change");
    it("should handle missing formatted content");
  });
});
```

#### Step 5.2: 集成测试

**文件**: `test/unit/plugins/baseFormatPlugin.test.ts`

```typescript
describe("BaseFormatPlugin", () => {
  it("should correctly handle check with tool result");
  it("should correctly handle format with tool result");
  it("should handle errors in both check and format");
});
```

#### Step 5.3: 手动测试流程

1. **测试 Shellcheck 诊断**:
   - 打开带语法错误的 sh 文件
   - 验证诊断显示正确
   - 验证错误消息显示

2. **测试格式化**:
   - 打开格式不符合规范的 sh 文件
   - 运行格式化命令
   - 验证文本正确修改

3. **边界情况**:
   - 工具不可用
   - 工具超时
   - 空文件
   - 非常大的文件

---

## 🔄 迁移检查表

### 编译检查

```bash
# 1. 编译所有改动
npm run build

# 2. 检查错误
npm run lint

# 3. 检查类型
npm run type-check
```

### 搜索检查

```bash
# 4. 搜索旧的导入名称
grep -r "CheckResult\|FormatResult" src/ test/ --include="*.ts" | grep -v "ToolCheckResult\|ToolFormatResult"

# 5. 搜索硬编码的优先级检查
grep -n "executeErrors.*syntaxErrors.*formatIssues" src/
```

### 运行测试

```bash
# 6. 运行所有单元测试
npm run test

# 7. 运行特定测试套件
npm run test -- adapters/
npm run test -- plugins/
```

---

## 📊 改进前后对比

### 代码复杂度

**改进前 - BaseFormatPlugin.createFormatResult() (~70 行)**:

```
├─ 检查 executeErrors (3 行逻辑 + 5 行返回)
├─ 检查 syntaxErrors (3 行逻辑 + 4 行返回)
├─ 检查 formattedContent (2 行逻辑 + 4 行返回)
├─ 检查内容变化 (2 行逻辑 + 1 行返回)
└─ 转换 TextEdit (3 行逻辑)
```

**改进后 - BaseFormatPlugin.createFormatResult() (~15 行)**:

```
├─ 调用 DiagnosticAdapter (2 行)
├─ 调用 FormatterAdapter (2 行)
└─ 组装返回对象 (11 行)
```

### 错误处理位置

**改进前**:

- DiagnosticAdapter.convert() - 4 个 if 块
- BaseFormatPlugin.createFormatResult() - 4 个 if 块
- **总计**: 8 处重复

**改进后**:

- DiagnosticAdapter.convertToDiagnosticsWithErrors() - 4 个 if 块（统一管理）
- FormatterAdapter.convertToTextEditsWithValidation() - 3 个 if 块（统一管理）
- **总计**: 7 处逻辑，无重复

---

## ⚠️ 风险评估

### 低风险操作

- ✅ 类型重命名（Phase 1）
- ✅ 添加新的适配器方法（Phase 2）
- ✅ 保留旧方法的兼容性

### 中风险操作

- ⚠️ 修改 BaseFormatPlugin 的实现
- ⚠️ 需要更新所有继承类

### 风险缓解

1. **阶段式实施** - 先做低风险的，再做高风险的
2. **保持向后兼容** - 旧的适配器方法保留，新方法并行
3. **充分的测试** - Phase 5 确保功能完整性
4. **代码审查** - 每个 Phase 完成后进行审查

---

## 📅 预计工时

| Phase    | 任务         | 工时                | 风险 |
| -------- | ------------ | ------------------- | ---- |
| 1        | 类型重命名   | 30min               | 低   |
| 2        | 适配器增强   | 60min               | 中   |
| 3        | 插件层简化   | 45min               | 高   |
| 4        | 插件实现更新 | 30min               | 低   |
| 5        | 测试和验证   | 90min               | 中   |
| **总计** |              | **255min (~4.25h)** |      |

---

## 🎯 成功标准

改进完成后应满足以下标准：

- [ ] 编译无错误，运行无警告
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 代码行数减少 40%+
- [ ] 错误处理逻辑集中到适配器层
- [ ] 新增插件时无需重复实现错误处理
- [ ] 代码覆盖率维持或提高
