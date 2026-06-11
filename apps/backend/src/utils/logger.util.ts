export function logger(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const log = {
  info: (message: string, data?: any) => logger('info', message, data),
  warn: (message: string, data?: any) => logger('warn', message, data),
  error: (message: string, data?: any) => logger('error', message, data),
};
