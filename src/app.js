//to bind the cors into the error middleware
const express = require('express');
const path = require('path');
const routes = require('./routes');
const errorMiddleware = require('./shared/middleware/middlewareError');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serves the developer dashboard static HTML CSS JS files
app.use(express.static(path.join(__dirname,'public')));

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok'
    });
});

// Binds HTTP API routes prefix
app.use('/api', routes);
// Intercepts and parses route errors
app.use(errorMiddleware);

module.exports = app;
