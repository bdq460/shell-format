/**
 * 适配器：将格式化结果转换为 VSCode TextEdit
 */

import * as vscode from "vscode";
import { ToolFormatResult } from "../tools/shell/types";
import { DiagnosticFactory } from "./diagnosticFactory";

/**
 * 格式化适配器
 * 将格式化结果转换为 VSCode TextEdit
 */
export class FormatterAdapter {
    /**
     * 转换格式化结果为 TextEdit 和 Diagnostic
     * 统一的设计：所有错误转换为诊断信息，成功时返回文本编辑
     * @param result 工具结果
     * @param document 文档对象
     * @param source 诊断源
     * @returns TextEdit 数组和诊断数组
     */
    static convertFormatResultToDiagnosticsAndTextEdits(
        result: ToolFormatResult,
        document: vscode.TextDocument,
        source: string,
    ): { textEdits: vscode.TextEdit[]; diagnostics: vscode.Diagnostic[] } {
        // 先处理诊断（统一通过工厂方法处理优先级）
        const diagnostics = DiagnosticFactory.convertToolResultToDiagnostics(
            result,
            document,
            source,
        );

        // 仅在无错误时才生成文本编辑
        const hasErrors = diagnostics.some(
            (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
        );

        let textEdits: vscode.TextEdit[] = [];
        if (
            !hasErrors &&
            result.formattedContent &&
            result.formattedContent !== document.getText()
        ) {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length),
            );
            textEdits = [vscode.TextEdit.replace(fullRange, result.formattedContent)];
        }

        return { textEdits, diagnostics };
    }
}
