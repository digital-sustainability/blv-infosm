const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const querystring = require('querystring');
const requests = require('request');
const BadRequestError = require('http-errors').BadRequestError;
const config = require('./config/config');

const app = express();

/**
 * MIDDLEWARE
 */

/**
 * Wrapper function propagetes err to error handling.
 * First (...args) so function is not evoked emediatly.
 * Only works for async functions.
 * https://expressjs.com/en/advanced/best-practice-performance.html
 */
const wrap = fn => (...args) => fn(...args).catch(args[2]);

// zip all requests
app.use(compression());
// open cors in development mode
app.use(cors({ origin: config.use_cors ? config.origin : '*' }));
app.use('/node_modules', express.static(__dirname + '/node_modules/'));
app.use(express.static(path.join(__dirname, 'dist')));

// error handling
app.use((err, req, res, next) => {
    if (err) {
        return res.status(500).json(err);
    }
})

/**
 * ROUTES
 */

// serve angular index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dist/index.html');
});

app.get('/sparql', wrap( async (req, res, next) => {
    if (!req.query.query || !req.query.url) {
        throw new BadRequestError('No Sparql Endpoint or SPARQL Query defined'); // sorted by next catch
    }
    const options = {
        url: req.query.url,
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'accept': 'application/sparql-results+json',
            'Accept-Encoding': 'gzip'
        },
        body: querystring.stringify({ 'query': req.query.query }),
        gzip: true
    };
    // Cache larger requests for 12 hours
    if (req.query.useCaching === 'true') {
        options.headers['Cache-Control'] = 'public, max-age=43200'
        options.headers['Vary'] = 'Accept'
    }
    await requests.post(options, (err, resp, body) => {
        if (err || !resp.statusCode === 200) {
            return res.status(500).json(err);
        }
        try {
            return res.json(JSON.parse(body).results.bindings);
        // in case body is empty or other errors
        } catch (err) {
            next(err)
        }
    });
}));

// download zip file
app.get('/geo-download', wrap( async (req, res, next) => {
    return res.download(__dirname + '/geo-data/geodaten.zip');
}))

// send all other requests back to index for client side routing
app.get('/*', (req, res) => {
    res.sendFile(__dirname + '/dist/index.html');
});

// set default port
app.listen(config.port, () => {
    console.log(`App listening on port ${config.port}`);
});