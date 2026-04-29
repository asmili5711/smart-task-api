var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
require('./src/config/db');
const { connectRedis } = require("./src/config/redis");
connectRedis();


var indexRouter = require('./src/routes/index');
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const verifyToken = require("./src/middleware/authMiddleware");


var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);


// protected route
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user,
  });
});

const authorizeRoles = require("./src/middleware/roleMiddleware");

// Admin only route
app.get(
  "/api/admin",
  verifyToken,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  }
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404, 'Route not found'));
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
