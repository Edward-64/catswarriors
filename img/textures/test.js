//let svg = require('./2.svg');
const fs = require('fs');

fs.readFile(__dirname + '/2.svg', (err, svg) => {
	console.log(svg.toString());
});
