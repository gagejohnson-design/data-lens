function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  const message =
    status < 500 || process.env.NODE_ENV !== 'production'
      ? err.message || 'Internal server error'
      : 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
