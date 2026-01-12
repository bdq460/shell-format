"use strict";
/**
 * Code Actions 提供者
 * 提供快速修复和修复所有问题的功能
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
exports.ShellFormatCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
const extensionInfo_1 = require("../utils/extensionInfo");
/**
 * ShellFormat Code Action 提供者
 */
class ShellFormatCodeActionProvider {
    /**
     * 提供 Code Actions
     */
    provideCodeActions(document, _range, context, _token) {
        const actions = [];
        // 为每个诊断创建快速修复
        if (context.diagnostics) {
            for (const diagnostic of context.diagnostics) {
                if (diagnostic.source === extensionInfo_1.PackageInfo.diagnosticSource) {
                    const fixThisAction = new vscode.CodeAction(extensionInfo_1.PackageInfo.codeActionQuickFixTitle, vscode.CodeActionKind.QuickFix);
                    fixThisAction.diagnostics = [diagnostic];
                    fixThisAction.isPreferred = true;
                    fixThisAction.command = {
                        title: extensionInfo_1.PackageInfo.codeActionQuickFixTitle,
                        command: extensionInfo_1.PackageInfo.commandFixAllProblems,
                        arguments: [document.uri]
                    };
                    actions.push(fixThisAction);
                }
            }
        }
        // 修复所有问题的快速修复
        const fixAllAction = new vscode.CodeAction(extensionInfo_1.PackageInfo.codeActionFixAllTitle, vscode.CodeActionKind.SourceFixAll);
        fixAllAction.command = {
            title: extensionInfo_1.PackageInfo.codeActionFixAllTitle,
            command: extensionInfo_1.PackageInfo.commandFixAllProblems,
            arguments: [document.uri]
        };
        actions.push(fixAllAction);
        return actions;
    }
}
exports.ShellFormatCodeActionProvider = ShellFormatCodeActionProvider;
//# sourceMappingURL=codeActionProvider.js.map