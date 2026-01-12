"use strict";
/**
 * 命令注册器
 * 统一注册所有命令
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllCommands = registerAllCommands;
const fixCommand_1 = require("./fixCommand");
const formatCommand_1 = require("./formatCommand");
/**
 * 注册所有命令
 */
function registerAllCommands() {
    return [
        (0, formatCommand_1.registerFormatCommand)(),
        (0, fixCommand_1.registerFixAllCommand)()
    ];
}
//# sourceMappingURL=index.js.map