require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`DataLens API running on port ${PORT}`);
});
