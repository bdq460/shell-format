/**
 * 通用进程执行器
 * 纯粹的进程执行逻辑，与业务和 VSCode 无关
 */

import { spawn } from "child_process";
import { logger } from "../../utils/log";
import { ToolExecutionError } from "../errors";
import { ExecutionResult, ExecutorOptions } from "./types";

/**
 * 通用进程执行器
 * 执行外部命令并返回结果
 */
export async function execute(
    command: string,
    options: ExecutorOptions,
): Promise<ExecutionResult> {
    const { args, token, stdin } = options;
    const fullCommand = `${command} ${args.join(" ")}`;

    return new Promise((resolve, reject) => {
        // 检查是否已请求取消
        if (token?.isCancellationRequested) {
            logger?.info(`Execute ${fullCommand} cancelled`);
            reject(new Error(`Execute ${fullCommand} cancelled`));
            return;
        }

        // 创建子进程
        const process = spawn(command, args);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        // 如果提供了stdin内容，写入进程的标准输入
        if (stdin) {
            process.stdin.write(stdin);
            process.stdin.end();
        }

        // 清理进程资源的函数
        const cleanup = () => {
            process.stdout.destroy();
            process.stderr.destroy();
            process.kill();
        };

        // 取消处理器：清理进程并拒绝Promise
        const cancelHandler = () => {
            logger?.info("Killing process due to cancellation");
            cleanup();
            reject(new Error(`Execute ${fullCommand} cancelled`));
        };

        // 订阅取消事件，返回Disposable对象或void
        const disposable = token?.onCancellationRequested(cancelHandler);

        // 确保在Promise完成后清理监听器，避免内存泄漏
        const unsubscribe = () => {
            if (disposable && typeof disposable.dispose === "function") {
                disposable.dispose();
            }
        };

        // 监听标准输出数据
        process.stdout.on("data", (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        // 监听标准错误数据
        process.stderr.on("data", (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        // 监听进程关闭事件
        process.on("close", (code) => {
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            logger?.info(
                `Execute ${fullCommand} completed with code: ${code}\nstdout: ${stdoutStr}\nstderr: ${stderrStr}`,
            );

            // 清理监听器, 避免内存泄漏
            unsubscribe();
            // 返回执行结果
            resolve({
                exitCode: code,
                stdout: stdoutStr,
                stderr: stderrStr,
            });
        });

        // 监听进程错误事件
        process.on("error", (err) => {
            logger?.error(`Execution ${fullCommand} error: ${err.message}`);
            // 清理监听器
            unsubscribe();
            reject(new ToolExecutionError(err as NodeJS.ErrnoException, fullCommand));
        });
    });
}
