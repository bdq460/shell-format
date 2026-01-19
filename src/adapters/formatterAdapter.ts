/**
 * 适配器：将格式化结果转换为 VSCode TextEdit
 */

import * as vscode from "vscode";
import { FormatResult } from "../tools/shell/types";

/**
 * 格式化适配器
 * 将格式化结果转换为 VSCode TextEdit
 */
export class FormatterAdapter {
    /**
     * 转换格式化结果为 TextEdit 数组
     * @param result 工具结果
     * @param document 文档对象
     * @returns TextEdit 数组
     */
    static convert(
        result: FormatResult,
        document: vscode.TextDocument,
    ): vscode.TextEdit[] {
        // 有工具执行错误时，无法格式化，返回空数组
        // 诊断信息由 DiagnosticAdapter 处理
        if (result.executeErrors && result.executeErrors.length > 0) {
            return [];
        }

        // 无格式化内容
        if (!result.formattedContent) {
            return [];
        }

        // 内容未变化
        if (result.formattedContent === document.getText()) {
            return [];
        }

        // 返回完整文档替换
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
        );

        return [vscode.TextEdit.replace(fullRange, result.formattedContent)];
    }
}
