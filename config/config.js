const prodConfig = {
    cors: false,
};

console.log(process.env);
module.exports = process.env.NODE_ENV === 'production' ? prodConfig : require('./devConfig');