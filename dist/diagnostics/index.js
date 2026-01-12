"use strict";
/**
 * 诊断管理器模块
 * 统一管理所有诊断功能
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
exports.initializeDiagnostics = initializeDiagnostics;
exports.diagnoseDocument = diagnoseDocument;
exports.diagnoseAllShellScripts = diagnoseAllShellScripts;
exports.disposeDiagnostics = disposeDiagnostics;
exports.getDiagnosticCollection = getDiagnosticCollection;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const extensionInfo_1 = require("../utils/extensionInfo");
const logger_1 = require("../utils/logger");
const shellcheck_1 = require("./shellcheck");
const shfmt_1 = require("./shfmt");
let diagnosticCollection;
/**
 * 初始化诊断管理器
 */
function initializeDiagnostics(diagCol) {
    diagnosticCollection = diagCol;
}
/**
 * 对文档进行诊断
 */
async function diagnoseDocument(document) {
    const fileName = path.basename(document.fileName);
    (0, logger_1.log)(`Starting diagnosis for: ${fileName}`);
    const onError = extensionInfo_1.ConfigManager.getOnErrorSetting();
    (0, logger_1.log)(`onError setting: ${onError}`);
    if (onError !== 'showProblem') {
        (0, logger_1.log)(`Skipping diagnosis (onError=${onError})`);
        diagnosticCollection.delete(document.uri);
        return;
    }
    diagnosticCollection.delete(document.uri);
    const allDiagnostics = [];
    // 步骤1: 使用 shellcheck 检查
    const shellcheckErrors = await (0, shellcheck_1.checkWithShellcheck)(document);
    allDiagnostics.push(...shellcheckErrors);
    // 步骤2: 使用 shfmt 检查
    const formatErrors = await (0, shfmt_1.checkFormat)(document);
    allDiagnostics.push(...formatErrors);
    if (allDiagnostics.length > 0) {
        diagnosticCollection.set(document.uri, allDiagnostics);
        (0, logger_1.log)(`Diagnostics created. found ${allDiagnostics.length} issues.`);
    }
    else {
        (0, logger_1.log)(`No issues found for: ${fileName}`);
    }
}
/**
 * 诊断所有打开的 Shell 脚本
 */
function diagnoseAllShellScripts() {
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === 'shellscript') {
            diagnoseDocument(document);
        }
    });
}
/**
 * 销毁诊断管理器
 */
function disposeDiagnostics() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
        (0, logger_1.log)('Diagnostic collection disposed');
    }
}
/**
 * 获取诊断集合
 */
function getDiagnosticCollection() {
    return diagnosticCollection;
}
//# sourceMappingURL=index.js.map