# 单元测试

## 测试概述

本项目使用混合测试策略，结合了 JavaScript 和 TypeScript 测试：

- **JavaScript 测试**: 测试不需要编译的纯函数逻辑
- **TypeScript 测试**: 测试需要类型检查和编译的模块

## 测试文件

### 1. shellcheck.test.js

**用途**: 测试 shellcheck 输出解析逻辑

**测试场景**:

- ✓ 解析 GCC 格式的 error、warning、note
- ✓ 解析多条输出
- ✓ 正确计算行号和列号
- ✓ 处理空行和无效输入
- ✓ 处理超出范围的行号

**运行**: `node test/shellcheck.test.js`

### 2. documentFormatter.test.js

**用途**: 测试文档格式化器的基本逻辑

**测试场景**:

- ✓ shfmt 基本参数构建
- ✓ 支持不同缩进级别
- ✓ spawn 命令构建
- ✓ 错误码识别 (ENOENT, EACCES)
- ✓ Buffer 输出处理

**运行**: `node test/documentFormatter.test.js`

### 3. messages.test.ts

**用途**: 测试消息工具类（类型安全）

**测试场景**:

- ✓ 工具未安装消息内容
- ✓ 权限错误消息格式
- ✓ 执行错误消息格式
- ✓ 消息格式一致性
- ✓ 特殊字符处理

**运行**: `mocha test/messages.test.ts --require ts-node/register`

### 4. shfmtArgs.test.ts

**用途**: 测试 shfmt 参数构建逻辑

**测试场景**:

- ✓ tabSize 为 'ignore' 时的参数
- ✓ tabSize 为数字时的参数
- ✓ tabSize 为 'vscode' 时的参数
- ✓ 参数顺序验证
- ✓ 边缘情况处理

**运行**: `mocha test/shfmtArgs.test.ts --require ts-node/register`

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行单个测试文件

```bash
# JavaScript 测试
node test/shellcheck.test.js
node test/documentFormatter.test.js

# TypeScript 测试
npx mocha test/messages.test.ts --require ts-node/register
npx mocha test/shfmtArgs.test.ts --require ts-node/register
```

### 运行 Mocha 测试（所有 .ts 测试）

```bash
npx mocha test/*.test.ts --require ts-node/register
```

## 测试框架

- **Mocha**: 测试运行器
- **Chai**: 断言库（用于 .ts 测试）
- **Node.js Assert**: 内置断言（用于 .js 测试）
- **ts-node**: 直接运行 TypeScript 文件

## 测试覆盖率

当前测试覆盖以下模块：

| 模块 | 覆盖率 | 测试文件 |
|------|---------|---------|
| messages | 100% | messages.test.ts |
| spawnErrorHandler | 部分覆盖 | documentFormatter.test.js |
| shellcheck 输出解析 | 100% | shellcheck.test.js |
| shfmt 参数构建 | 100% | shfmtArgs.test.ts |
| extensionInfo | 待添加 | - |

## 添加新测试

### 添加 JavaScript 测试

1. 在 `test/` 目录创建 `.test.js` 文件
2. 使用 Node.js 内置 `assert` 模块
3. 在 `test/run.js` 中添加测试文件路径

### 添加 TypeScript 测试

1. 在 `test/` 目录创建 `.test.ts` 文件
2. 使用 `describe`, `it` 和 `assert`
3. 在 `test/run.js` 中添加测试文件路径

## 注意事项

- VSCode 扩展相关的测试需要使用 `@vscode/test-electron`
- 依赖 `vscode` 模块的测试需要 mock 或使用集成测试
- 所有测试文件都应该包含清晰的测试场景描述
