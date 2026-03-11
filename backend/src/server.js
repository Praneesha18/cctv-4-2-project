require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);



connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});
