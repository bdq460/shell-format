#!/bin/bash

# 生成插件图标的脚本
# 使用 ImageMagick 创建一个简单的图标

# 检查是否安装了 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "ImageMagick 未安装"
    echo "请运行: brew install imagemagick"
    exit 1
fi

# 创建 128x128 的图标
convert -size 128x128 xc:transparent \
    -fill '#89D185' \
    -draw 'roundrectangle 10,10 118,118 20,20' \
    -fill '#FFFFFF' \
    -font 'Arial-Bold' \
    -pointsize 72 \
    -gravity center \
    -annotate 0 '$' \
    /Users/klein/workspace/tech/personal_project/vscode/extension/shell_format/icon.png

echo "图标已生成: icon.png"

# 也可以生成其他尺寸
for size in 256 512; do
    convert icon.png -resize ${size}x${size} /Users/klein/workspace/tech/personal_project/vscode/extension/shell_format/icon-${size}.png
    echo "已生成: icon-${size}.png (${size}x${size})"
done
