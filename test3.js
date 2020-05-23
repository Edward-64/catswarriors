const db = require('./test2.js'),
	moduleTest = require('./test.js').include(db);

console.log(moduleTest.db);

db.new = 'newfield';

console.log(moduleTest.db);
