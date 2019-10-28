const config = {
    use_cors: true,
    origin: ['http://piwik.fdn.iwi.unibe.ch/'],
    port: 5000
};

module.exports = process.env.NODE_ENV === 'production' ? config : require('./devConfig');