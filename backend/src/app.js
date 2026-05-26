const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const authRouter = require('./routers/auth');
const usersRouter = require('./routers/users');
const snapshotsRouter = require('./routers/snapshots');
const connectRouter = require('./routers/connect');
const auditRouter = require('./routers/audit');
const shareRouter = require('./routers/share');
const aiRouter = require('./routers/ai');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production'
    ? (() => { console.warn('CORS_ORIGIN is not set — all cross-origin requests will be blocked'); return false; })()
    : 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/connect', connectRouter);
app.use('/api/audit', auditRouter);
app.use('/api/share', shareRouter);
app.use('/api/ai', aiRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
