const readline = require('readline');

class CommandHandler {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        this.rl.on('line', (input) => {
            his.handleCommand(input.trim());
        });
    }

}

module.exports = CommandHandler;