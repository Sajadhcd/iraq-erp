const h = require('helmet');
const c = require('compression');
console.log('helmet type:', typeof h, 'default:', typeof h.default);
console.log('compression type:', typeof c, 'default:', typeof c.default);
