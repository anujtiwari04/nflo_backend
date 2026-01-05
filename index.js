// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');  
const allRoutes = require('./routes/main');
const examRoutes = require('./routes/examRoutes');

const app = express();
app.use(express.json());

// Add your frontend URL here
const allowedOrigins = [
  'http://localhost:8080',  
  'http://localhost:5173', 
  'http://localhost:8081',  
  'http://192.168.1.11:8080'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

// Use the master router for all API routes
app.use('/api', allRoutes); // All routes will be prefixed with /api
app.use("/api/exam", examRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});