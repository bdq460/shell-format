import { log } from './logger';

export function logShellCommandCloseOutput(fullCommand: string, stdout: Buffer[], stderr: Buffer[], code: number | null): void {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    log(`Command execute complete! command: ${fullCommand}\nreturnCode: ${code}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}`);
}

export function logShellCommandErrorOutput(fullCommand: string, stdout: Buffer[], stderr: Buffer[], err: NodeJS.ErrnoException): void {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    log(`Command execute error! command: ${fullCommand}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}, err: ${err}`);
}
