"use strict";
/**
 * 修复命令模块
 * 提供"修复所有问题"命令的实现
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
exports.registerFixAllCommand = registerFixAllCommand;
const vscode = __importStar(require("vscode"));
const documentFormatter_1 = require("../formatters/documentFormatter");
const extensionInfo_1 = require("../utils/extensionInfo");
/**
 * 注册修复所有问题命令
 */
function registerFixAllCommand() {
    return vscode.commands.registerCommand(extensionInfo_1.PackageInfo.commandFixAllProblems, async (uri) => {
        let document;
        if (uri) {
            // 从问题面板的修复命令调用
            document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
        }
        else if (vscode.window.activeTextEditor) {
            // 从命令面板调用
            document = vscode.window.activeTextEditor.document;
        }
        if (document) {
            const edits = await (0, documentFormatter_1.formatDocument)(document);
            if (edits && edits.length > 0) {
                const edit = new vscode.WorkspaceEdit();
                for (const textEdit of edits) {
                    edit.replace(document.uri, textEdit.range, textEdit.newText);
                }
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage('Shell script formatted successfully');
            }
            else if (edits && edits.length === 0) {
                vscode.window.showWarningMessage('Shell script has formatting issues. Please check the Problems panel.');
            }
        }
    });
}
//# sourceMappingURL=fixCommand.js.map