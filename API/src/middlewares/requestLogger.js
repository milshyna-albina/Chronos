const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const date = new Date().toLocaleString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const time = `${date} UTC`;

    const status = res.statusCode;
    const color = status >= 500
      ? '\x1b[31m'
      : status >= 400
        ? '\x1b[33m'
        : '\x1b[32m';
    const resetColor = '\x1b[0m'

    const duration = Date.now() - start;

    console.log(
      `[${time}] ${req.method} ${req.originalUrl}` +
      ` ${color}Status: ${status}${resetColor} (${duration}ms)`
    );
  });
  next();
};

module.exports = requestLogger;