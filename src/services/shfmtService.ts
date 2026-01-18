/**
 * ShfmtService - Shell 格式化服务
 *
 * 封装配置好的 shfmt 工具实例
 */

import { CancellationToken } from "../tools/executor/types";
import { ShfmtTool } from "../tools/shell/shfmt";
import { ToolResult } from "../tools/types";

/**
 * Shell 格式化服务
 * 封装配置好的 shfmt 工具实例
 */
export class ShfmtService {
    private tool: ShfmtTool;
    private indent: number | undefined;

    constructor(commandPath: string, indent: number | undefined) {
        this.tool = new ShfmtTool(commandPath);
        this.indent = indent;
    }

    /**
     * 格式化文件
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async format(
        fileName: string,
        token?: CancellationToken,
    ): Promise<ToolResult> {
        return this.tool.format(fileName, {
            indent: this.indent,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            token,
        });
    }

    /**
     * 检查文件格式
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async check(
        fileName: string,
        token?: CancellationToken,
    ): Promise<ToolResult> {
        return this.tool.check(fileName, {
            indent: this.indent,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            token,
        });
    }

    /**
     * 检查内容格式（用于未保存的文档）
     * @param content 文件内容
     * @param token 取消令牌
     */
    async checkContent(
        content: string,
        token?: CancellationToken,
    ): Promise<ToolResult> {
        return this.tool.check("", {
            indent: this.indent,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            token,
            content,
        });
    }
}
