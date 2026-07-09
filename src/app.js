//to bind the cors into the error middleware
const express = require('express');
const path = require('path');
const routes = require('./routes');
const errorMiddleware = require('./shared/middleware/middlewareError');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serves the developer dashboard static HTML CSS JS files
app.use(express.static(path.join(__dirname,'public')));

// Binds HTTP API routes prefix
app.use('/api', routes);
// Intercepts and parses route errors
app.use(errorMiddleware);

module.exports = app;