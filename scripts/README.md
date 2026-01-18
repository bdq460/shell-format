# README.md 管理脚本

## 概述

本目录包含用于安全打包 VSCode 扩展的脚本，主要解决以下问题：

**原问题**：打包时需要临时替换 `README.md`，但如果打包失败，备份文件可能无法正确恢复，导致下次打包时覆盖原有内容。

**解决方案**：
1. 使用带时间戳的备份文件，避免覆盖
2. 实现自动错误处理和恢复机制
3. 提供精细的备份/恢复控制

## 脚本说明

### 1. `manage-readme.sh` - README 管理脚本

**功能**：提供 README.md 的备份、替换、恢复功能

**用法**：
```bash
bash scripts/manage-readme.sh {backup|replace|restore|check}
```

**命令**：

- `backup` - 备份当前的 README.md
  - 创建带时间戳的备份：`README.md.bak.YYYYMMDD_HHMMSS`
  - 更新快速备份：`README.md.bak`
  - 自动清理旧的备份（保留最新 3 个）

- `replace` - 备份并替换为用户 README.md
  - 先备份当前的 README.md
  - 然后复制 `doc/user/README.md` 为根目录的 `README.md`
  - 自动清理旧的备份

- `restore` - 恢复原始 README.md
  - 优先使用快速备份 (`README.md.bak`)
  - 如果快速备份不存在，查找最新的带时间戳备份
  - 自动清理旧的备份

- `check` - 检查是否已替换
  - 退出码 0：已替换为用户 README
  - 退出码 1：未替换，使用原始 README

### 2. `safe-package.sh` - 安全打包脚本

**功能**：自动处理 README.md 备份和恢复的安全打包脚本

**特性**：
- 自动备份并替换 README.md
- 执行打包流程（编译、打包、清理）
- 无论成功或失败，都确保 README.md 被恢复
- 显示详细的执行步骤和进度

**错误处理**：
- 如果任何步骤失败，脚本会自动恢复 README.md
- 提供清晰的错误信息和恢复状态

## NPM 脚本命令

在 `package.json` 中定义了以下便捷命令：

### 打包相关

```bash
# 安全打包（推荐）
npm run package:extension

# 传统打包方式（已弃用）
npm run package:extension:legacy
```

### README 管理

```bash
# 仅备份 README.md
npm run readme:backup

# 备份并替换为用户 README.md
npm run readme:replace

# 恢复原始 README.md
npm run readme:restore

# 检查 README.md 状态
npm run readme:check
```

### 安装扩展

```bash
# 打包并安装扩展到本地 VSCode
npm run install:extension
```

## 使用场景

### 场景 1：正常打包流程

```bash
npm run package:extension
```

执行流程：
1. ✅ 备份当前 `README.md` → `README.md.bak.YYYYMMDD_HHMMSS`
2. ✅ 替换为 `doc/user/README.md`
3. ✅ 编译代码
4. ✅ 执行 `vsce package`
5. ✅ 清理临时文件
6. ✅ 恢复原始 `README.md`

### 场景 2：打包失败时的自动恢复

```bash
npm run package:extension
```

如果第 4 步打包失败：
1. ✅ 触发错误处理
2. ✅ 自动恢复 `README.md`
3. ⚠️ 显示错误信息和恢复状态

### 场景 3：手动控制 README 状态

```bash
# 检查当前状态
npm run readme:check && echo "已替换" || echo "原始状态"

# 临时替换为用户文档（例如测试）
npm run readme:replace

# 完成测试后恢复
npm run readme:restore
```

### 场景 4：多版本备份

```bash
# 执行多次打包后，会生成多个备份
ls -lh README.md.bak.*
```

示例输出：
```
README.md.bak.20250118_143025
README.md.bak.20250118_150123
README.md.bak.20250118_152234
```

脚本会自动保留最新的 3 个备份，删除其余的。

## 优势对比

| 特性 | 旧方案 | 新方案 |
|------|--------|--------|
| 备份覆盖 | ❌ 直接覆盖 `.bak` 文件 | ✅ 使用时间戳，保留历史 |
| 错误恢复 | ❌ 需要手动运行 `restore-readme` | ✅ 自动恢复 |
| 备份验证 | ❌ 无 | ✅ 检查备份文件存在性 |
| 备份清理 | ❌ 手动清理 | ✅ 自动清理，保留 3 个 |
| 灵活性 | ❌ 仅支持打包流程 | ✅ 支持独立备份/恢复 |
| 错误提示 | ❌ 基础错误信息 | ✅ 详细的进度和错误提示 |

## 故障排除

### 问题：README.md 无法恢复

**解决方法**：
```bash
# 手动恢复最新的备份
npm run readme:restore

# 或手动查找备份文件
ls -lht README.md.bak.* | head -n 1
```

### 问题：备份文件过多

**解决方法**：
```bash
# 手动清理旧备份（保留最新 3 个）
ls -t README.md.bak.* | tail -n +4 | xargs rm -f
```

### 问题：打包后 README.md 未恢复

**检查步骤**：
1. 查看备份文件是否存在：
   ```bash
   ls README.md.bak*
   ```

2. 手动恢复：
   ```bash
   npm run readme:restore
   ```

3. 如果恢复失败，手动复制备份：
   ```bash
   cp README.md.bak.YYYYMMDD_HHMMSS README.md
   ```

## 注意事项

1. **备份文件位置**：所有备份文件都在项目根目录
2. **时间戳格式**：`YYYYMMDD_HHMMSS`，便于排序和识别
3. **保留策略**：自动保留最新 3 个备份
4. **符号链接**：如果 `README.md` 是符号链接，跳过备份
5. **权限要求**：脚本需要执行权限（已自动添加）

## 迁移指南

如果您之前使用的是旧的打包方式，可以无缝切换到新方式：

```bash
# 切换到新方式
npm run package:extension  # 使用 safe-package.sh
```

旧的 `package:extension:legacy` 命令仍然可用，但建议使用新的安全打包方式。
