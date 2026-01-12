"use strict";
/**
 * 文档格式化器模块
 * 提供文档格式化功能
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFormatter = initializeFormatter;
exports.formatDocument = formatDocument;
exports.formatDocumentRange = formatDocumentRange;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const extensionInfo_1 = require("../utils/extensionInfo");
const logger_1 = require("../utils/logger");
const shell_1 = require("../utils/shell");
const spawnErrorHandler_1 = require("../utils/spawnErrorHandler");
let diagnosticCollection;
/**
 * 初始化格式化器
 */
function initializeFormatter(diagnosticCol) {
    diagnosticCollection = diagnosticCol;
}
/**
 * 格式化文档
 * @param document 文档对象
 * @param options 格式化选项
 * @param token 取消令牌
 * @returns TextEdit 数组
 */
async function formatDocument(document, options, token) {
    const fileName = path.basename(document.fileName);
    (0, logger_1.log)(`Starting format for: ${fileName}`);
    const shfmtPath = extensionInfo_1.ConfigManager.getShfmtPath();
    const args = extensionInfo_1.ConfigManager.buildShfmtArgs();
    const content = document.getText();
    const fullCommand = `${shfmtPath} ${args.join(' ')} ${fileName}`;
    (0, logger_1.log)(`Execute command: ${fullCommand}`);
    return new Promise((resolve, reject) => {
        if (token?.isCancellationRequested) {
            (0, logger_1.log)(`Formatting cancelled for: ${fileName}`);
            reject(new vscode.CancellationError());
            return;
        }
        const shfmt = (0, child_process_1.spawn)(shfmtPath, args);
        const stdout = [];
        const stderr = [];
        shfmt.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shfmt.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shfmt.on('close', (code) => {
            (0, shell_1.logShellCommandCloseOutput)(fullCommand, stdout, stderr, code);
            // 一般情况下shfmt -i 2 -bn -ci -sr执行格式化操作后, 无论是否有格式调整, 都会返回0的退出码
            // 通过stdout判断是否有格式修改
            // 1. 如果有格式调整, 则stdout不为空, 返回格式化后的内容
            // 2. 如果没有格式调整, 则stdout为空, 返回原内容
            //
            // 在一些情况下使用shfmt进行文件格式化操作的时候
            // 如果脚本代码存在语法错误，shfmt会返回非0的退出码，同时输出错误信息到stderr
            //
            // 如对于以下代码, 其if条件没有闭合:
            //  ```shell
            //      if [ "x" = "x" ]
            //         echo "missing then"
            //  ```
            //
            // 执行命令:
            // ```shell
            //  shfmt -i 2 -bn -ci -sr test_syntax.sh.git
            // ```
            //
            // shfmt会返回非0的退出码，同时输出错误信息到stderr。
            // 输出如下:
            // ```text
            //  returnCode: 1
            //  Stdout:
            //  Stderr: <standard input >: 16: 9: reached EOF without matching { with }
            // ```
            //
            // 对于这时发现的错误, 按道理应该也在diagnostic中显示, 要求用户修复
            // 但是由于shellcheck也会进行语法检查, 其检查结果会覆盖shfmt格式化时发现的语法错误
            // 当文件内容变化时就会触发文件合规检测, 其中就包括了shellcheck的检查.
            // 因此不会存丢失shfmt进行format操作时发现的问题.
            // 所以这里只对shfmt成功执行格式化的情况进行处理, 对返回code非0的情况不做处理,仅做记录处理.
            const stdoutStr = Buffer.concat(stdout).toString();
            if (code === 0) {
                (0, logger_1.log)(`File well format. file:${fileName}`);
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                diagnosticCollection.delete(document.uri);
                // 返回替换整个文档的 TextEdit
                // vscode会使用 TextEdit 替换整个文档
                resolve([vscode.TextEdit.replace(fullRange, stdoutStr)]);
            }
            else {
                (0, logger_1.log)(`Found format errors. file:${fileName}, stdoutStr: ${stdoutStr}`);
                (0, logger_1.log)('Returning empty edits due to format errors');
                resolve([]);
            }
        });
        shfmt.on('error', (err) => {
            (0, shell_1.logShellCommandErrorOutput)(fullCommand, stdout, stderr, err);
            const errorMessage = (0, spawnErrorHandler_1.formatErrorLogMessage)('shfmt', err);
            (0, logger_1.log)(`${errorMessage}\nCommand: ${fullCommand}`);
            const errorDiagnostic = (0, spawnErrorHandler_1.createSpawnErrorDiagnostic)(document, 'shfmt', fullCommand, err);
            if (errorDiagnostic) {
                diagnosticCollection.set(document.uri, [errorDiagnostic]);
                (0, logger_1.log)(`Created diagnostic for shfmt formatting error at line 0`);
            }
            reject(err);
        });
        shfmt.stdin.write(content);
        shfmt.stdin.end();
        token?.onCancellationRequested(() => {
            (0, logger_1.log)(`Killing shfmt process for: ${fileName}`);
            shfmt.kill();
        });
    });
}
/**
 * 格式化文档范围
 * 注意：Shell 脚本的格式化需要完整的上下文（if/fi、do/done 等配对），
 * 因此即使只选中部分文本，也需要对整个文档进行格式化。
 * VSCode 会自动裁剪 TextEdit，只应用选区内的变更。
 *
 * @param document 文档对象
 * @param range 选中的范围（未使用，因为需要完整上下文）
 * @param options 格式化选项
 * @param token 取消令牌
 * @returns TextEdit 数组
 */
async function formatDocumentRange(document, range, options, token) {
    const fileName = path.basename(document.fileName);
    (0, logger_1.log)(`Range formatting triggered for: ${fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`);
    (0, logger_1.log)('Note: Shell script formatting requires full document context, will format entire document');
    // 直接调用 formatDocument，由 VSCode 自动裁剪选区内的变更
    return formatDocument(document, options, token);
}
//# sourceMappingURL=documentFormatter.js.map