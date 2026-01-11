#!/bin/bash
# 测试路径计算逻辑
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
echo "SCRIPT_DIR: $SCRIPT_DIR"
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "预期 SCRIPT_DIR 包含: script"
echo "预期 PROJECT_ROOT 包含: shell_format"
echo ""
# 测试清理逻辑
TARGET_DIR="/tmp/test-target"
mkdir -p "$TARGET_DIR"
echo "创建测试文件" > "$TARGET_DIR/test.txt"
cd "$TARGET_DIR"
echo "当前目录: $(pwd)"
echo "测试 rm -rf \"*\" 与 rm -rf * 的区别"
# 测试引号版本
echo "创建测试文件..." > "testfile1"
echo "创建测试文件..." > "testfile2"
ls -la
echo "执行: rm -rf \"*\""
rm -rf "*"
ls -la
echo ""
echo "测试无引号版本"
echo "创建测试文件..." > "testfile3"
echo "创建测试文件..." > "testfile4"
ls -la
echo "执行: rm -rf *"
rm -rf *
ls -la
