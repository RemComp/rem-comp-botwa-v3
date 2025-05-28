const util = require('util');
const path = require('path');

class Logger {
    constructor() {
        this.LOG_TYPES = {
            INFO: 'info',
            ERROR: 'error', 
            WARN: 'warn'
        };
    }

    /**
     * Get caller location information
     * @returns {string} Formatted caller location
     */
    getCallerLocation() {
        const originalPrepareStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, stack) => stack;
        
        const stack = new Error().stack;
        Error.prepareStackTrace = originalPrepareStackTrace;
        
        // Skip current function and the log method that called it
        const callerFrame = stack[3] || stack[2] || stack[1];
        
        if (!callerFrame) {
            return 'unknown';
        }
        
        const fileName = callerFrame.getFileName() || 'unknown';
        const lineNumber = callerFrame.getLineNumber() || 0;
        const columnNumber = callerFrame.getColumnNumber() || 0;
        const functionName = callerFrame.getFunctionName() || 'anonymous';
        
        // Get just the filename without full path
        const baseName = path.basename(fileName);
        
        return `${baseName}:${lineNumber}:${columnNumber} (${functionName})`;
    }

    /**
     * Format arguments like console.log does
     * @param {...any} args - Arguments to format
     * @returns {string} Formatted message string
     */
    formatMessage(...args) {
        if (args.length === 0) return '';
        
        // If first argument is a string with format specifiers, use util.format
        if (typeof args[0] === 'string' && args[0].includes('%')) {
            return util.format(...args);
        }
        
        // Otherwise, join all arguments with spaces (like console.log)
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            } else if (arg === null) {
                return 'null';
            } else if (arg === undefined) {
                return 'undefined';
            } else if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return util.inspect(arg, { depth: 2, colors: false });
                }
            } else {
                return String(arg);
            }
        }).join(' ');
    }

    /**
     * Create log entry object
     * @param {string} type - Log type (info, error, warn)
     * @param {...any} args - Arguments to log
     * @returns {Object} Log entry object
     */
    createLogEntry(type, ...args) {
        return {
            type: type,
            date: new Date().toISOString(),
            callerLocation: this.getCallerLocation(),
            message: this.formatMessage(...args)
        };
    }

    /**
     * Info level logging
     * @param {...any} args - Arguments to log
     * @returns {Object} Log entry object
     */
    info(...args) {
        const logEntry = this.createLogEntry(this.LOG_TYPES.INFO, ...args);
        
        // Optional: Also output to console for immediate visibility
        console.log(`[${logEntry.type.toUpperCase()}] ${logEntry.date} ${logEntry.callerLocation}:`, logEntry.message);
        
        return logEntry;
    }

    /**
     * Error level logging
     * @param {...any} args - Arguments to log
     * @returns {Object} Log entry object
     */
    error(...args) {
        const logEntry = this.createLogEntry(this.LOG_TYPES.ERROR, ...args);
        
        // Optional: Also output to console for immediate visibility
        console.error(`[${logEntry.type.toUpperCase()}] ${logEntry.date} ${logEntry.callerLocation}:`, logEntry.message);
        
        return logEntry;
    }

    /**
     * Warning level logging
     * @param {...any} args - Arguments to log
     * @returns {Object} Log entry object
     */
    warn(...args) {
        const logEntry = this.createLogEntry(this.LOG_TYPES.WARN, ...args);
        
        // Optional: Also output to console for immediate visibility
        console.warn(`[${logEntry.type.toUpperCase()}] ${logEntry.date} ${logEntry.callerLocation}:`, logEntry.message);
        
        return logEntry;
    }
}

module.exports = Logger;