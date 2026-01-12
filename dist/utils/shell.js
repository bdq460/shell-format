"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logShellCommandCloseOutput = logShellCommandCloseOutput;
exports.logShellCommandErrorOutput = logShellCommandErrorOutput;
const logger_1 = require("./logger");
function logShellCommandCloseOutput(fullCommand, stdout, stderr, code) {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    (0, logger_1.log)(`Command execute complete! command: ${fullCommand}\nreturnCode: ${code}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}`);
}
function logShellCommandErrorOutput(fullCommand, stdout, stderr, err) {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    (0, logger_1.log)(`Command execute error! command: ${fullCommand}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}, err: ${err}`);
}
//# sourceMappingURL=shell.js.map