const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require("./routes/auth.routes.js");
const chatRoutes = require("./routes/chat.routes.js");

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth' , authRoutes);
app.use('/api/chat' , chatRoutes);

module.exports = app;