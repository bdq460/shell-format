/**
 * 适配器：将格式化结果转换为 VSCode TextEdit
 */

import * as vscode from 'vscode';
import { ToolResult } from '../tools/types';

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
        result: ToolResult,
        document: vscode.TextDocument
    ): vscode.TextEdit[] {
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
            document.positionAt(document.getText().length)
        );

        return [vscode.TextEdit.replace(fullRange, result.formattedContent)];
    }
}
