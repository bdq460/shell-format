# package.json 配置说明

`package.json` 是 VSCode 扩展的核心配置文件，包含以下重要字段：

## 基本信息

```json
{
  "name": "shell-format",                    // 扩展唯一标识符
  "displayName": "Shell Format with shfmt",   // 显示名称
  "description": "...",                      // 扩展描述
  "version": "1.0.0",                         // 版本号（遵循 semver）
  "publisher": "bdq460",                     // 发布者名称（需在 VSCode Marketplace 注册）
  "icon": "icon.png",                         // 扩展图标路径
  "engines": {
    "vscode": "^1.74.0"                       // 最低 VSCode 版本要求
  },
  "categories": ["Formatters", "Linters"],    // 扩展分类
  "repository": {                             // 代码仓库信息
    "type": "git",
    "url": "https://github.com/..."
  }
}
```

## 激活事件 (activationEvents)

定义扩展何时被激活：

```json
"activationEvents": [
  "onLanguage:shellscript",                  // 打开 shell 脚本时激活
  "onCommand:shellformat.formatDocument",    // 执行特定命令时激活
  "onCommand:shellformat.fixAllProblems",   // 执行特定命令时激活
]
```

## 主入口 (main)

```json
"main": "./dist/extension.js"                // 扩展入口文件路径（编译后）
```

## 贡献点 (contributes)

定义扩展向 VSCode 贡献的功能：

### 1. 语言定义

```json
"languages": [
  {
    "id": "shellscript",                     // 语言 ID
    "aliases": ["Shell", "Shell Script"],    // 语言别名
    "extensions": [".sh", ".bash", ".zsh"],  // 文件扩展名
    "configuration": "./language-configuration.json"  // 语言配置文件
  }
]
```

**language-configuration.json** 定义语言的编辑器行为：

- 注释符号
- 括号配对
- 自动闭合
- 代码包裹

详细说明请参考 `language-configuration-explained.md`

### 2. 配置选项

```json
"configuration": {
  "type": "object",
  "title": "Shell Format",
  "properties": {
    "shellformat.path": {
      "type": "string",
      "default": "shfmt",
      "description": "Path to shfmt executable"
    },
    "shellformat.args": {
      "type": "array",
      "default": ["-i", "2", "-bn", "-ci", "-sr"],
      "description": "Arguments to pass to shfmt"
    }
  }
}
```

### 3. 命令 (commands)

```json
"commands": [
  {
    "command": "shellformat.formatDocument",  // 命令 ID
    "title": "Format Document"                // 显示标题
  }
]
```

### 4. 代码操作 (codeActions)

```json
"codeActions": [
  {
    "kind": "source.fixAll.shell-format",    // 动作类型
    "title": "Fix all with shfmt",           // 显示标题
    "languages": ["shellscript"]             // 支持的语言
  }
]
```

## 脚本 (scripts)

脚本通过 npm 运行，包含以下脚本：

```json
"scripts": {
  "vscode:prepublish": "npm run compile",    // 发布前执行
  "compile": "tsc -p ./",                    // 编译 TypeScript
  "watch": "tsc -watch -p ./",               // 监听模式编译
  "pretest": "npm run compile && npm run lint",  // 测试前执行
  "lint": "eslint src --ext ts",             // 代码检查
  "test": "node ./out/test/runTest.js"       // 运行测试
}
```

运行方式为 `npm run <script>`

**注意**：`scripts` 字段不会包含在打包文件中，仅在开发和构建阶段使用。

## 依赖 (devDependencies)

```json
"devDependencies": {
  "@types/node": "^18.0.0",                  // Node.js 类型定义
  "@types/vscode": "^1.74.0",                // VSCode API 类型定义
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "eslint": "^8.0.0",                        // 代码检查工具
  "typescript": "^5.0.0"                    // TypeScript 编译器
}
```

**注意**：`devDependencies` 中的依赖不会打包到 VSIX 文件中，仅用于开发和构建。

## 打包说明

### 打包包含的文件

使用 `vsce package` 打包后，VSIX 文件包含以下文件：

```shell
shell-format-1.0.0.vsix (11 files, 137.23 KB)
├── LICENSE.txt
├── example.sh
├── icon-256.png
├── icon-512.png
├── icon.png
├── language-configuration.json
├── package.json
├── readme.md
└── dist/
    └── extension.js
```

### 打包排除的文件

以下文件通过 `.vscodeignore` 排除，不会打包到 VSIX 中：

- **开发文件**：`.eslintrc.js`、`src/**`、`tsconfig.json`、`**/*.ts`
- **配置文件**：`.vscode/**`、`.gitignore`、`.yarnrc`
- **依赖目录**：`node_modules/**`、`package-lock.json`
- **文档文件**：`PUBLISH.md`、`doc/**`、`package-optimization.md`
- **其他文件**：`generate_icon.sh`、`out/**`、`*.vsix`

详细的打包优化说明请参考 `package-optimization.md` [打包: ❌]
