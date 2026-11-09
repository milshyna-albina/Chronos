const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initDB = require('./config/db');

const requestLogger = require('./middlewares/requestLogger');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({ status: 'Backend is running' });
});
app.use('/api/auth', authRoutes);

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server is running on: http://localhost:${PORT}`);
  });
}

start();