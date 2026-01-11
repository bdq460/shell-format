# shfmt 完整使用说明

## 简介

`shfmt` 是一个用于格式化和解析 shell 脚本的工具，支持 Bash、mksh 和其他 POSIX 兼容的 shell。

## 安装

### macOS

```bash
brew install shfmt
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install shfmt

# Arch Linux
sudo pacman -S shfmt

# Fedora
sudo dnf install shfmt
```

### 使用 Go 安装

```bash
go install mvdan.cc/sh/v3/cmd/shfmt@latest
```

## 基本用法

### 格式化文件（直接覆盖）

```bash
shfmt script.sh
```

### 查看格式化结果（不修改文件）

```bash
shfmt -d script.sh
```

### 格式化并输出到新文件

```bash
shfmt script.sh > formatted_script.sh
```

### 从标准输入读取并格式化

```bash
cat script.sh | shfmt
```

## 常用参数

### 缩进设置

#### `-i` / `-indent`

设置缩进空格数（默认：0）

```bash
# 使用 2 个空格缩进
shfmt -i 2 script.sh

# 使用 4 个空格缩进
shfmt -i 4 script.sh
```

#### `-bn` / `-binary-next-line`

二元运算符后换行

```bash
# 格式化前
x=1+2+3

# 格式化后（使用 -bn）
x=1 + \
  2 + \
  3
```

#### `-ci` / `-case-indent`

在 `case` 模式中对齐替代语句

```bash
# 格式化前
case "$1" in
    start)
    echo "starting"
    ;;
    stop)
    echo "stopping"
    ;;
esac

# 格式化后（使用 -ci）
case "$1" in
    start)
        echo "starting"
        ;;
    stop)
        echo "stopping"
        ;;
esac
```

#### `-sr` / `-space-redirects`

重定向操作符后换行

```bash
# 格式化前
cat test.txt | grep "hello" > output.txt

# 格式化后（使用 -sr）
cat test.txt | grep "hello" \
    > output.txt
```

#### `-kp` / `-keep-padding`

保留操作符周围的空格

```bash
# 格式化前
let x=1 + 2

# 不使用 -kp 格式化
let x=1+2

# 使用 -kp 格式化
let x=1 + 2
```

### 解析器选项

#### `-ln` / `-language`

指定解析的 shell 语言

```bash
# 指定为 Bash
shfmt -ln bash script.sh

# 指定为 POSIX shell
shfmt -ln posix script.sh

# 指定为 mksh
shfmt -ln mksh script.sh

# 指定为 BATS
shfmt -ln bats script.sh
```

#### `-p` / `-posix`

POSIX 模式（简化为 POSIX 子集）

```bash
shfmt -p script.sh
```

### 简化选项

#### `-s` / `-simplify`

简化代码（简化未引用变量、移除双引号等）

```bash
# 格式化前
echo "$var"
let x=$((x))

# 格式化后（使用 -s）
echo "$var"  # 如果变量不需要引号
let x=x
```

#### `-mn` / `-minify`

最小化代码（移除注释和空行）

```bash
shfmt -mn script.sh
```

### 检查选项

#### `-d` / `-diff`

以 diff 格式显示格式差异

```bash
shfmt -d script.sh
```

输出示例：

```diff
--- a/script.sh
+++ b/script.sh
@@ -1,3 +1,3 @@
-echo        "hello"
+echo "hello"
```

#### `-l` / `-list`

列出格式不正确的文件

```bash
shfmt -l script.sh
```

如果有格式问题，输出文件路径；如果没有问题，不输出任何内容。

#### `-w` / `-write`

格式化并写入文件（默认行为，但可以显式指定）

```bash
shfmt -w script.sh
```

### 查找选项

#### `-f` / `-find`

递归查找并格式化指定目录下的所有 shell 脚本

```bash
# 格式化当前目录下的所有 shell 脚本
shfmt -f .

# 格式化指定目录
shfmt -f /path/to/directory

# 与其他参数结合使用
shfmt -i 2 -w -f .
```

### 实用选项

#### `-filename` / `-filename`

指定文件名（当从标准输入读取时）

```bash
cat script.sh | shfmt -filename script.sh -d
```

#### `-h` / `-help`

显示帮助信息

```bash
shfmt -h
```

#### `-version`

显示版本信息

```bash
shfmt -version
```

## 常用组合示例

### 标准格式化（2 空格缩进）

```bash
shfmt -i 2 -bn -ci -sr script.sh
```

### 4 空格缩进格式化

```bash
shfmt -i 4 -bn -ci -sr script.sh
```

### 检查格式但不修改

```bash
shfmt -i 2 -bn -ci -sr -d script.sh
```

### 递归格式化目录

```bash
shfmt -i 2 -bn -ci -sr -w -f .
```

### POSIX 兼容格式化

```bash
shfmt -i 2 -p script.sh
```

### 最小化代码

```bash
shfmt -mn script.sh
```

### 从管道格式化

```bash
cat script.sh | shfmt -i 2 -bn -ci -sr
```

## 与编辑器集成

### VSCode

#### 1. 安装扩展

搜索并安装支持 shfmt 的扩展，如：

- `shell-format` (foxundermoon.shell-format)
- 自定义扩展（如本项目）

#### 2. 配置 settings.json

```json
{
  "[shellscript]": {
    "editor.defaultFormatter": "publisher.extension-name",
    "editor.formatOnSave": true
  },
  "shellformat.path": "/usr/bin/shfmt",
  "shellformat.args": ["-i", "2", "-bn", "-ci", "-sr"]
}
```

### Vim

#### 1. 安装插件

使用 `vim-plug`：

```vim
Plug 'z0mbix/vim-shfmt', { 'for': 'sh' }
```

#### 2. 配置

```vim
" 格式化命令
autocmd FileType sh setlocal formatprg=shfmt\ -i\ 2\ -bn\ -ci\ -sr
" 保存时自动格式化
autocmd BufWritePost *.sh !shfmt -i 2 -bn -ci -sr -w %
```

### Neovim

使用 `nvim-lspconfig`：

```lua
require('lspconfig').efm.setup{
  settings = {
    rootMarkers = {".git/"},
    languages = {
      sh = {
        {
          lintCommand = "shfmt -d ${INPUT}",
          lintFormats = {"%f:%l:%c: %m"},
          formatCommand = "shfmt -i 2 -bn -ci -sr",
          formatStdin = true
        }
      }
    }
  }
}
```

### Emacs

```elisp
;; 使用 shfmt
(defun shfmt ()
  "Format current buffer with shfmt."
  (interactive)
  (let ((buffer (current-buffer))
        (file (buffer-file-name)))
    (if file
        (progn
          (call-process-region (point-min) (point-max)
                           "shfmt" t (current-buffer)
                           nil "-i" "2" "-bn" "-ci" "-sr" "-w" file)
          (revert-buffer t t))
      (error "Buffer is not visiting a file"))))
```

## Git 钩子

### Pre-commit 钩子

创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash

# 检查所有即将提交的 shell 脚本
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(sh|bash)$'); do
  if ! shfmt -i 2 -bn -ci -sr -d "$file" > /dev/null 2>&1; then
    echo "Error: $file is not properly formatted with shfmt"
    echo "Run: shfmt -i 2 -bn -ci -sr -w $file"
    exit 1
  fi
done

exit 0
```

### Pre-push 钩子

创建 `.git/hooks/pre-push`：

```bash
#!/bin/bash

# 格式化所有修改的 shell 脚本
for file in $(git diff --name-only HEAD | grep -E '\.(sh|bash)$'); do
  echo "Formatting $file..."
  shfmt -i 2 -bn -ci -sr -w "$file"
done
```

## Makefile 集成

```makefile
# 格式化所有 shell 脚本
.PHONY: fmt
fmt:
    find . -name "*.sh" -exec shfmt -i 2 -bn -ci -sr -w {} \;

# 检查格式
.PHONY: fmt-check
fmt-check:
    find . -name "*.sh" -exec shfmt -i 2 -bn -ci -sr -d {} \;

# 查找格式不正确的文件
.PHONY: fmt-lint
fmt-lint:
    @find . -name "*.sh" -exec shfmt -l {} \;
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Shell Script Format Check

on: [push, pull_request]

jobs:
  shfmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install shfmt
        run: go install mvdan.cc/sh/v3/cmd/shfmt@latest
      - name: Check formatting
        run: |
          shfmt -i 2 -bn -ci -sr -d $(find . -name "*.sh")
```

### GitLab CI

```yaml
shfmt:
  stage: test
  image: golang:latest
  script:
    - go install mvdan.cc/sh/v3/cmd/shfmt@latest
    - shfmt -i 2 -bn -ci -sr -d $(find . -name "*.sh")
```

### Travis CI

```yaml
language: bash
install:
  - go install mvdan.cc/sh/v3/cmd/shfmt@latest
script:
  - shfmt -i 2 -bn -ci -sr -d $(find . -name "*.sh")
```

## 常见问题

### Q: shfmt 改变了我的脚本行为

A: 使用 `-d` 参数先查看差异，确认无误后再格式化。使用 `-w` 参数时会直接修改文件。

### Q: 如何忽略某些文件

A: 使用 `find` 命令排除文件：

```bash
find . -name "*.sh" ! -path "./vendor/*" ! -path "./node_modules/*" -exec shfmt -w {} \;
```

### Q: shfmt 报语法错误但脚本能运行

A: shfmt 使用严格的语法检查，可能检测到运行时忽略的问题。检查：

- 未闭合的引号
- 语法错误
- POSIX 兼容性问题（使用 `-ln posix`）

### Q: 如何格式化管道中的脚本

A: 使用 `-filename` 参数：

```bash
cat script.sh | shfmt -filename script.sh -i 2
```

### Q: shfmt 与 ShellCheck 的区别

A:

- **shfmt**: 格式化工具，调整代码格式、缩进、换行
- **ShellCheck**: 静态分析工具，检测语法错误、常见问题

推荐同时使用两者：

```bash
# 先格式化
shfmt -i 2 -bn -ci -sr -w script.sh
# 再检查
shellcheck script.sh
```

## 最佳实践

1. **在提交前检查格式**

   ```bash
   shfmt -i 2 -bn -ci -sr -d script.sh
   ```

2. **配置团队统一格式**
   在项目中创建 `.editorconfig`：

   ```ini
   [*.sh]
   indent_style = space
   indent_size = 2
   end_of_line = lf
   charset = utf-8
   ```

3. **使用 Git 钩子**
   确保所有提交的脚本格式一致

4. **定期更新 shfmt**

   ```bash
   go install mvdan.cc/sh/v3/cmd/shfmt@latest
   ```

5. **与 ShellCheck 配合使用**

   ```bash
   shfmt -i 2 -bn -ci -sr -w script.sh && shellcheck script.sh
   ```

## 参考资料

- 官方文档: <https://github.com/mvdan/sh>
- GitHub 仓库: <https://github.com/mvdan/sh>
- ShellCheck: <https://www.shellcheck.net/>
