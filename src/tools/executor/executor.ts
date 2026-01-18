/**
 * 通用进程执行器
 * 纯粹的进程执行逻辑，与业务和 VSCode 无关
 * 支持超时、取消和错误处理
 */

import { spawn } from "child_process";
import { logger } from "../../utils/log";
import { ToolExecutionError } from "../errors";
import { ExecutionResult, ExecutorOptions } from "./types";

/**
 * 通用进程执行器
 * 执行外部命令并返回结果
 * 特点：
 * - 支持超时控制（默认 30 秒）
 * - 支持取消令牌
 * - 完整的错误处理和资源清理
 */
export async function execute(
    command: string,
    options: ExecutorOptions,
): Promise<ExecutionResult> {
    const { args, token, stdin } = options;
    const timeout = (options as any).timeout ?? 30000; // 默认 30 秒超时
    const fullCommand = `${command} ${args.join(" ")}`;

    return new Promise((resolve, reject) => {
        // 检查是否已请求取消
        if (token?.isCancellationRequested) {
            logger?.info(`Execute ${fullCommand} cancelled before start`);
            reject(new Error(`Execute ${fullCommand} cancelled`));
            return;
        }

        // 创建子进程
        const process = spawn(command, args);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let timedOut = false;

        // 如果提供了stdin内容，写入进程的标准输入
        if (stdin) {
            process.stdin.write(stdin);
            process.stdin.end();
        }

        // 清理进程资源的函数
        const cleanup = () => {
            try {
                if (!process.killed) {
                    process.kill();
                }
                // 销毁流，避免内存泄漏
                process.stdout?.destroy();
                process.stderr?.destroy();
                process.stdin?.destroy();
            } catch (error) {
                logger?.debug(`Error during process cleanup: ${String(error)}`);
            }
        };

        // 超时处理器：在指定时间后杀死进程
        let timeoutHandle: NodeJS.Timeout | null = null;
        const setupTimeout = () => {
            if (timeout && timeout > 0) {
                timeoutHandle = setTimeout(() => {
                    timedOut = true;
                    logger?.warn(`Execute ${fullCommand} timed out after ${timeout}ms`);
                    cleanup();
                    reject(
                        new Error(
                            `Execute ${fullCommand} timed out after ${timeout}ms. Command execution exceeded the maximum allowed time.`,
                        ),
                    );
                }, timeout);
            }
        };

        // 清除超时
        const clearTimeoutHandler = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
        };

        // 取消处理器：清理进程并拒绝Promise
        const cancelHandler = () => {
            logger?.info("Killing process due to cancellation");
            clearTimeoutHandler();
            cleanup();
            reject(new Error(`Execute ${fullCommand} cancelled`));
        };

        // 订阅取消事件，返回Disposable对象或void
        const disposable = token?.onCancellationRequested(cancelHandler);

        // 确保在Promise完成后清理监听器，避免内存泄漏
        const unsubscribe = () => {
            clearTimeoutHandler();
            if (disposable && typeof disposable.dispose === "function") {
                disposable.dispose();
            }
        };

        // 设置超时
        setupTimeout();

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
            // 如果已经因超时拒绝了，则不再处理
            if (timedOut) {
                return;
            }

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
            // 如果已经因超时拒绝了，则不再处理
            if (timedOut) {
                return;
            }

            logger?.error(`Execution ${fullCommand} error: ${err.message}`);
            // 清理监听器
            unsubscribe();
            reject(new ToolExecutionError(err as NodeJS.ErrnoException, fullCommand));
        });
    });
}
