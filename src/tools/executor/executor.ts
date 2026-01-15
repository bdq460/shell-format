/**
 * 通用进程执行器
 * 纯粹的进程执行逻辑，与业务和 VSCode 无关
 */

import { spawn } from 'child_process';
import { ToolExecutionError } from '../errors';
import { ExecutionResult, ExecutorOptions } from './types';

/**
 * 通用进程执行器
 * 执行外部命令并返回结果
 */
export async function execute(
    command: string,
    options: ExecutorOptions,
): Promise<ExecutionResult> {
    const { args, token, logger } = options;
    const fullCommand = `${command} ${args.join(' ')}`;

    logger?.info(`Executing: ${fullCommand}`);

    return new Promise((resolve, reject) => {
        if (token?.isCancellationRequested) {
            logger?.info('Execution cancelled');
            reject(new Error('Execution cancelled'));
            return;
        }

        const process = spawn(command, args);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        process.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        process.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        process.on('close', (code) => {
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            logger?.info(`Execution completed with code: ${code}\nstdout: ${stdoutStr}\nstderr: ${stderrStr}`);

            // 记录 stdout 和 stderr（始终记录）
            // logger?.debug?.(`stdout: ${stdoutStr}`);
            // logger?.debug?.(`stderr: ${stderrStr}`);

            resolve({
                exitCode: code,
                stdout: stdoutStr,
                stderr: stderrStr
            });
        });

        process.on('error', (err) => {
            logger?.error(`Execution error: ${err.message}`);
            reject(new ToolExecutionError(
                err as NodeJS.ErrnoException,
                fullCommand
            ));
        });

        token?.onCancellationRequested(() => {
            logger?.info('Killing process due to cancellation');
            process.kill();
        });
    });
}
