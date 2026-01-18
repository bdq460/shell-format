/**
 * ShellcheckService - Shell 诊断服务
 *
 * 封装配置好的 shellcheck 工具实例
 */

import { CancellationToken } from "../tools/executor/types";
import { ShellcheckTool } from "../tools/shell/shellcheck";
import { ToolResult } from "../tools/types";

/**
 * Shell 诊断服务
 * 封装配置好的 shellcheck 工具实例
 */
export class ShellcheckService {
    private tool: ShellcheckTool;

    constructor(commandPath: string) {
        this.tool = new ShellcheckTool(commandPath);
    }

    /**
     * 检查文件
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async check(
        fileName: string,
        token?: CancellationToken,
    ): Promise<ToolResult> {
        return this.tool.check({
            file: fileName,
            commandArgs: ["-f", "gcc"],
            token,
        });
    }

    /**
     * 检查内容（用于未保存的文档）
     * @param content 文件内容
     * @param token 取消令牌
     */
    async checkContent(
        content: string,
        token?: CancellationToken,
    ): Promise<ToolResult> {
        return this.tool.check({
            file: "",
            commandArgs: ["-f", "gcc"],
            token,
            content,
        });
    }
}
