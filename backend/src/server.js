
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/routes');
const videoRoutes = require('./routes/videoRoutes');
const { ensureCollection } = require('./services/qdrantService');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/video', videoRoutes);



Promise.all([connectDB(), ensureCollection()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize backend services:', err);
    process.exit(1);
  });
