/**
 * 适配器：将工具结果转换为 VSCode Diagnostic
 */

import * as vscode from 'vscode';
import { ToolExecutionError } from '../tools/errors';
import { LinterIssue, SyntaxError, ToolResult } from '../tools/types';

/**
 * 诊断适配器
 * 将工具结果转换为 VSCode Diagnostic
 */
export class DiagnosticAdapter {
    /**
     * 转换工具结果为诊断数组
     * @param result 工具结果
     * @param document 文档对象
     * @param source 诊断源
     * @returns 诊断数组
     */
    static convert(
        result: ToolResult,
        document: vscode.TextDocument,
        source: string
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // 语法错误
        if (result.syntaxErrors) {
            for (const error of result.syntaxErrors) {
                diagnostics.push(this.createSyntaxError(error, source));
            }
        }

        // 格式问题
        if (result.formatIssues) {
            diagnostics.push(this.createFormatIssue(document, source));
        }

        // Linter 问题
        if (result.linterIssues) {
            for (const issue of result.linterIssues) {
                diagnostics.push(this.createLinterIssue(issue, source));
            }
        }

        return diagnostics;
    }

    /**
     * 创建工具执行错误诊断
     * @param document 文档对象
     * @param error 工具执行错误
     * @returns 诊断对象
     */
    static createToolExecutionError(
        document: vscode.TextDocument,
        error: ToolExecutionError
    ): vscode.Diagnostic {
        // 在文件第一行显示错误
        const lineRange = document.lineCount > 0 ? document.lineAt(0).range : new vscode.Range(0, 0, 0, 0);
        const fullMessage = `${error.message}\n\nCommand: ${error.command}`;

        const commandName = error.command.split(' ')[0];
        const diagnostic = new vscode.Diagnostic(
            lineRange,
            fullMessage,
            vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = `${commandName}-execution-error`;
        diagnostic.source = commandName;
        return diagnostic;
    }

    /**
     * 创建语法错误诊断
     */
    private static createSyntaxError(
        error: SyntaxError,
        source: string
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            error.line,
            error.column,
            error.line,
            error.column
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `Syntax error: ${error.message}`,
            vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = source;
        diagnostic.code = `${source}-syntax-error`;

        return diagnostic;
    }

    /**
     * 创建格式问题诊断
     */
    private static createFormatIssue(
        document: vscode.TextDocument,
        source: string
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            'Shell script has formatting issues',
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = source;
        diagnostic.code = `${source}-format-issue`;

        return diagnostic;
    }

    /**
     * 创建 Linter 问题诊断
     */
    private static createLinterIssue(
        issue: LinterIssue,
        source: string
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            issue.line,
            issue.column,
            issue.line,
            issue.column + 1
        );

        const severity = issue.type === 'error'
            ? vscode.DiagnosticSeverity.Error
            : issue.type === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(
            range,
            `${issue.code}: ${issue.message}`,
            severity
        );
        diagnostic.source = source;
        diagnostic.code = issue.code;

        return diagnostic;
    }
}
