const moment = require('moment');

class Logger {
    constructor(verbose = false) {
        this.verbose = verbose;
        this.logLevels = {
            ERROR: 'ERROR',
            WARN: 'WARN',
            INFO: 'INFO',
            DEBUG: 'DEBUG'
        };
    }

    formatMessage(level, message) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        return `[${timestamp}] [${level}] ${message}`;
    }

    error(message, error = null) {
        const logMessage = this.formatMessage(this.logLevels.ERROR, message);
        console.error(logMessage);
        if (error && this.verbose) {
            console.error(error);
        }
    }

    warn(message) {
        const logMessage = this.formatMessage(this.logLevels.WARN, message);
        console.warn(logMessage);
    }

    info(message) {
        const logMessage = this.formatMessage(this.logLevels.INFO, message);
        console.log(logMessage);
    }

    debug(message) {
        if (this.verbose) {
            const logMessage = this.formatMessage(this.logLevels.DEBUG, message);
            console.log(logMessage);
        }
    }

    success(message) {
        const logMessage = this.formatMessage('SUCCESS', message);
        console.log(`\x1b[32m${logMessage}\x1b[0m`); // Green color
    }

    setVerbose(verbose) {
        this.verbose = verbose;
    }
}

module.exports = Logger;
