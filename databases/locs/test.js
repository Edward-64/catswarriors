const fs = require('fs');

fs.readFile(__dirname + '/1.js', 'utf8', (err, data) => {
	data = JSON.parse(data);
	data.area = [];
	data.area.length = 161;
	for (let i = 0; i <= 160; i++) {
		data.area[i] = [];
		data.area[i].length = 31;
	}
	fs.writeFile(__dirname + '/1.js', JSON.stringify(data), err => err);
});
