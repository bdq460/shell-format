/**
 * 通用进程执行器
 * 纯粹的进程执行逻辑，与业务和 VSCode 无关
 */

import { spawn } from 'child_process';
import { ExecutorOptions, ExecutionResult, Logger } from './types';

/**
 * 通用进程执行器
 * 执行外部命令并返回结果
 */
export async function execute(
    options: ExecutorOptions,
    logger?: Logger
): Promise<ExecutionResult> {
    const { command, args, input, token } = options;

    logger?.info(`Executing: ${command} ${args.join(' ')}`);

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
            logger?.info(`Execution completed with code: ${code}`);
            resolve({
                exitCode: code,
                stdout: Buffer.concat(stdout).toString(),
                stderr: Buffer.concat(stderr).toString()
            });
        });

        process.on('error', (err) => {
            logger?.error(`Execution error: ${err.message}`);
            reject(err);
        });

        process.stdin.write(input);
        process.stdin.end();

        token?.onCancellationRequested(() => {
            logger?.info('Killing process due to cancellation');
            process.kill();
        });
    });
}
