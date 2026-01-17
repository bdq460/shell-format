/**
 * shellcheck 工具类
 */

import { CancellationToken, execute } from "../../executor";
import { ToolResult } from "../../types";
import { parseShellcheckOutput } from "./parser";

export interface ShellcheckOptions {
    /** 文件路径 */
    file: string;
    /** 命令执行参数 */
    commandArgs?: string[];
    /** 取消令牌 */
    token?: CancellationToken;
}

/**
 * shellcheck 工具类
 */
export class ShellcheckTool {
    private DefaultArges = ["-f", "gcc"];
    private commandPath: string;

    constructor(commandPath?: string) {
        this.commandPath = commandPath || "shellcheck";
    }

    /**
     * 检查 Shell 脚本
     */
    async check(options: ShellcheckOptions): Promise<ToolResult> {
        const args = (options.commandArgs || this.DefaultArges).concat(
            options.file,
        );
        const executeOptions = {
            args,
            token: options.token,
        };
        const result = await execute(this.commandPath, executeOptions);

        return parseShellcheckOutput(result);
    }
}
