#!/bin/bash

# Shell Format 插件简化部署脚本
# 自动编译、打包并安装到 VSCode 扩展目录

set -e # 遇到错误时退出

echo "🔧 Shell Format 插件本地部署开始..."

# 获取插件信息
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录是脚本目录的父目录
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
echo "项目根目录: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# 从 package.json 读取信息
PKG_NAME=$(node -p "require('./package.json').name")
PKG_PUBLISHER=$(node -p "require('./package.json').publisher")
PKG_VERSION=$(node -p "require('./package.json').version")
PKG_DISPLAY_NAME=$(node -p "require('./package.json').displayName")

echo "📦 插件信息: ${PKG_PUBLISHER}.${PKG_NAME}-${PKG_VERSION} (${PKG_DISPLAY_NAME})"

# 目标扩展目录
VSCODE_EXT_DIR="$HOME/.vscode/extensions"
VSIX_FILE="${PKG_NAME}-${PKG_VERSION}.vsix"
TARGET_DIR="$VSCODE_EXT_DIR/${PKG_PUBLISHER}.${PKG_NAME}-${PKG_VERSION}"

echo "📁 目标目录: $TARGET_DIR"
echo "📦 VSIX 文件: $VSIX_FILE"

# 步骤1: 编译 TypeScript
echo "🔄 步骤1: 编译 TypeScript..."
npm run compile
echo "✅ 编译完成"

# 步骤2: 打包 VSIX
echo "📦 步骤2: 打包 VSIX..."
npx vsce package
echo "✅ 打包完成"

# 步骤3: 检查目标目录是否存在
echo "🗑️  步骤3: 检查目标目录是否存在"
if [ -d "$TARGET_DIR" ]; then
  echo "⚠️  目标目录已存在，删除旧目录."
  rm -rf "$TARGET_DIR"
  echo "目录删除成功, 创建新目录..."
  mkdir -p "$TARGET_DIR"
else
  echo "目录不存在，创建目录..."
  mkdir -p "$TARGET_DIR"
fi

# 步骤4: 解压 VSIX 到目标目录
echo "📤 步骤4: 解压插件文件..."
unzip -q "$VSIX_FILE" -d "$TARGET_DIR"

# 步骤5: 处理解压后的文件结构
echo "🔄 步骤5: 整理文件结构..."
if [ -d "$TARGET_DIR/extension" ]; then
  # 移动 extension/ 下的所有内容到目标目录根目录
  mv "$TARGET_DIR/extension/"* "$TARGET_DIR/"
  rmdir "$TARGET_DIR/extension"
  echo "✅ 文件结构已整理"
else
  echo "⚠️  警告: VSIX 文件中未找到 extension/ 文件夹"
fi

# 步骤6: 删除 VSIX 文件（可选，保留源文件用于分发）
# echo "🗑️  步骤6: 清理VSIX文件..."
# rm -f "$VSIX_FILE"
# echo "✅ VSIX文件已清理"
echo "✅ 步骤6: VSIX文件已保留"

# 步骤7: 验证安装
echo "🔍 步骤7: 验证安装..."
if [ -f "$TARGET_DIR/package.json" ]; then
  echo "✅ 验证成功: package.json 存在"
  echo "✅ 插件已成功安装到: $TARGET_DIR"
else
  echo "❌ 错误: 安装验证失败，package.json 不存在"
  exit 1
fi

echo ""
echo "🎉 部署完成!"
echo "📋 插件位置: $TARGET_DIR"
echo ""
echo "下一步操作:"
echo "1. 重启 VS Code 或重新加载窗口 (Ctrl+Shift+P → 'Developer: Reload Window')"
echo "2. 打开一个 Shell 脚本文件 (.sh, .bash, .zsh) 测试格式化功能"
echo "3. 查看日志: Ctrl+Shift+U 打开输出面板，选择 'shell-format' 通道"
echo ""
echo "📝 注意: 如需卸载，删除目录: $TARGET_DIR"
