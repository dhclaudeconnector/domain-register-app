const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

type LogLevel = keyof typeof LOG_LEVELS;

const currentLogLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
const isBrowser = typeof window !== 'undefined';

function getLogLevelValue(level: LogLevel): number {
  return LOG_LEVELS[level] ?? 1;
}

// Clean and mask sensitive data recursively
export function maskSensitiveData(obj: any): any {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  const masked = { ...obj };
  const sensitiveKeys = [
    'apiKey', 
    'token', 
    'dpdnsToken', 
    'cloudflareApiKey', 
    'api_key', 
    'X-Auth-Key', 
    'Authorization', 
    'password', 
    'secret'
  ];
  
  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some(s => s.toLowerCase() === key.toLowerCase())) {
      if (typeof masked[key] === 'string') {
        const val = masked[key];
        masked[key] = val.length > 8 ? `${val.substring(0, 4)}...${val.substring(val.length - 4)} [MASKED]` : '[MASKED]';
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  
  return masked;
}

function logToConsole(
  type: 'log' | 'warn' | 'error',
  caption: string,
  levelLabel: string,
  message: string,
  color: string,
  data?: any
) {
  const maskedData = data !== undefined ? maskSensitiveData(data) : '';
  if (isBrowser) {
    if (maskedData !== '') {
      console[type](
        `%c[${caption}] [${levelLabel}] %s`,
        `color: ${color}; font-weight: bold;`,
        message,
        maskedData
      );
    } else {
      console[type](
        `%c[${caption}] [${levelLabel}] %s`,
        `color: ${color}; font-weight: bold;`,
        message
      );
    }
  } else {
    if (maskedData !== '') {
      console[type](`[${caption}] [${levelLabel}] ${message}`, JSON.stringify(maskedData));
    } else {
      console[type](`[${caption}] [${levelLabel}] ${message}`);
    }
  }
}

export const logger = {
  debug(caption: string, message: string, data?: any) {
    if (getLogLevelValue(currentLogLevel) <= LOG_LEVELS.debug) {
      logToConsole('log', caption, 'DEBUG', message, '#7c828a', data);
    }
  },
  
  info(caption: string, message: string, data?: any) {
    if (getLogLevelValue(currentLogLevel) <= LOG_LEVELS.info) {
      logToConsole('log', caption, 'INFO', message, '#0052ff', data);
    }
  },

  warn(caption: string, message: string, data?: any) {
    if (getLogLevelValue(currentLogLevel) <= LOG_LEVELS.warn) {
      logToConsole('warn', caption, 'WARN', message, '#f59e0b', data);
    }
  },

  error(caption: string, message: string, error?: any) {
    if (getLogLevelValue(currentLogLevel) <= LOG_LEVELS.error) {
      logToConsole('error', caption, 'ERROR', message, '#cf202f', error);
    }
  }
};
