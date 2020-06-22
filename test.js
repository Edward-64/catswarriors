const xml = require('xml2js'),
	parserSVG = new xml.Parser(),
	builderSVG = new xml.Builder(),
	fs = require('fs');

fs.readFile(__dirname + '/test.svg', 'utf8', (err, data) => {
	parserSVG.parseString(data, (err, res) => {
		if (err) console.log(err)
		else {
//			console.log(res);
//			console.log(res.svg.metadata);
			console.log(JSON.stringify(res));
//			console.log(builderSVG.buildObject(res));
		}
	});
});
