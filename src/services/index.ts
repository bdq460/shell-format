/**
 * 服务层
 * 管理工具实例和配置，为业务层提供配置好的工具接口
 * 业务层调用时只需传递 file 参数
 */

import { SettingInfo } from '../config';
import { CancellationToken } from '../tools/executor/types';
import { ShellcheckTool } from '../tools/shell/shellcheck';
import { ShfmtTool } from '../tools/shell/shfmt';
import { ToolResult } from '../tools/types';
import { Logger } from '../utils/log';

/**
 * Shell 格式化服务
 * 封装配置好的 shfmt 工具实例
 */
class ShfmtService {
    private tool: ShfmtTool;
    private indent: number | undefined;
    private logger?: Logger;

    constructor(commandPath: string, indent: number | undefined, logger?: Logger) {
        this.tool = new ShfmtTool(commandPath);
        this.indent = indent;
        this.logger = logger;
    }

    /**
     * 格式化文件
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async format(fileName: string, token?: CancellationToken): Promise<ToolResult> {
        return this.tool.format(fileName, {
            indent: this.indent,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            token,
            logger: this.logger
        });
    }

    /**
     * 检查文件格式
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async check(fileName: string, token?: CancellationToken): Promise<ToolResult> {
        return this.tool.check(fileName, {
            indent: this.indent,
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            token,
            logger: this.logger
        });
    }
}

/**
 * Shell 诊断服务
 * 封装配置好的 shellcheck 工具实例
 */
class ShellcheckService {
    private tool: ShellcheckTool;
    private logger?: Logger;

    constructor(commandPath: string, logger?: Logger) {
        this.tool = new ShellcheckTool(commandPath);
        this.logger = logger;
    }

    /**
     * 检查文件
     * @param fileName 文件路径
     * @param token 取消令牌
     */
    async check(fileName: string, token?: CancellationToken): Promise<ToolResult> {
        return this.tool.check({
            file: fileName,
            commandArgs: ['-f', 'gcc'],
            token,
            logger: this.logger
        });
    }
}

/**
 * 获取 shfmt 服务
 */
export function getShfmtService(logger: Logger): ShfmtService {
    return new ShfmtService(SettingInfo.getShfmtPath(), SettingInfo.getRealTabSize(), logger);;
}

/**
 * 获取 shellcheck 服务
 */
export function getShellcheckService(logger: Logger): ShellcheckService {
    return new ShellcheckService(SettingInfo.getShellcheckPath(), logger);
}

// 导出类型
export type { ShellcheckService, ShfmtService };
