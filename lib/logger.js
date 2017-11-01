import winston from 'winston';
import config from 'config';

export default new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: config.get('logLevel'),
      handleExceptions: true,
      humanReadableUnhandledException: true,
      json: false,
      colorize: true,
      timestamp: () => new Date().toISOString()
    })
  ]
});
