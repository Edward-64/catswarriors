const fs = require('fs'),
	db = JSON.parse(fs.readFileSync(__dirname + '/cats.js', 'utf8')),
	other = JSON.parse(fs.readFileSync(__dirname + '/other.js', 'utf8')),
	world = JSON.parse(fs.readFileSync(__dirname + '/world.js', 'utf8'));

class EditDBs {
	save(type) {
		if (type == 'db') fs.writeFile(__dirname + '/cats.js', JSON.stringify(db), (err) => {
			if (err) console.log(err)
		});
		if (type == 'world') fs.writeFile(__dirname + '/world.js', JSON.stringify(world), (err) => {
			if (err) console.log(err)
		});
		if (type == 'other') fs.writeFile(__dirname + '/other.js', JSON.stringify(other), (err) => {
			if (err) console.log(err)
		});
	}
	saveSync(type) {
		if (type == 'db') fs.writeFileSync(__dirname + '/cats.js', JSON.stringify(db));
		if (type == 'world') fs.writeFileSync(__dirname + '/world.js', JSON.stringify(world));
		if (type == 'other') fs.writeFileSync(__dirname + '/other.js', JSON.stringify(other));
	}
}

module.exports = { db, world, other, editDBs: new EditDBs() }


