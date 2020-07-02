const fs = require('fs'),
	db = JSON.parse(fs.readFileSync(__dirname + '/cats/info.js', 'utf8')),
	other = JSON.parse(fs.readFileSync(__dirname + '/other.js', 'utf8')),
	locs = JSON.parse(fs.readFileSync(__dirname + '/locs/info.js', 'utf8')),
	validator = require('./../lib/validators.js');

class EditDBs extends require('events').EventEmitter {
	constructor() {
		super();
	}
	save(type) {
		if (type == 'db') {
			const saving = Object.assign({}, db);
			saving.cache = {};
			fs.writeFile(__dirname + '/cats/info.js', JSON.stringify(saving), err => {
				if (err) validator.log(err)
			});
		}
		if (type == 'locs') {
			const saving = Object.assign({}, locs);
			saving.cache = {};
			fs.writeFile(__dirname + '/locs/info.js', JSON.stringify(saving), err => {
				if (err) validator.log(err)
			});
		}
		if (type == 'other') fs.writeFile(__dirname + '/other.js', JSON.stringify(other), err => {
			if (err) validator.log(err)
		});
	}
	saveSync(type) {
		if (type == 'db') fs.writeFileSync(__dirname + '/cats/info.js', JSON.stringify(db));
		if (type == 'locs') fs.writeFileSync(__dirname + '/locs/info.js', JSON.stringify(locs));
		if (type == 'other') fs.writeFileSync(__dirname + '/other.js', JSON.stringify(other));
	}
	getCat(pn, func, cache) {
		if (!func) func = err => err;
		fs.readFile(__dirname + `/cats/${pn}.js`, 'utf-8', (err, data) => {
			if (err) {
				validator.log(err);
				func(err, null);
			} else {
				data = JSON.parse(data);
				if (!cache) db.cache[pn] = data;
				func(err, data);
			}
		});
	}
	getSyncCat(pn, cache) {
		const data = JSON.parse(fs.readFileSync(__dirname + `/cats/${pn}.js`, 'utf-8'));
		if (!cache) db.cache[pn] = data;
		return data;
	}
	setCat(pn, data, func) {
		if (!func) func = err => err;
		fs.writeFile(__dirname + `/cats/${pn}.js`, JSON.stringify(data), err => {
			if (err) validator.log(err);
			func(err);
		});
	}

	changeEveryCat(func) {
		let error = '';
		for (let i = 1; i <= db.totalCats; i++) {
			if (error) {
				validator.log('Пройдено итераций: ', i, '\nОшибка: ' + error);
				this.emit('changeEveryCat', error); break;
			}
			this.getCat(i, (err, data) => {
				if (err) return error += err
				else {
					data = func(data);
					if (data[0]) return error += data[0];
					this.setCat(i, data[1], err => {
						if (err) error += err;
						if (i == db.totalCats) this.emit('changeEveryCat', error);
					});
				}
			});
		}
	}

	getLoc(n, func, cache) {
		if (!func) func = err => err;
		fs.readFile(__dirname + `/locs/${n}.js`, 'utf-8', (err, data) => {
			if (err) {
				validator.log(err);
				func(err, null);
			} else {
				data = JSON.parse(data);
				if (!cache) {
					locs.cache[n] = data;
					locs.cache[n].lastUpdate = Date.now();
				}
				func(err, data);
			}
		});
	}
	getSyncLoc(n, cache) {
		const data = JSON.parse(fs.readFileSync(__dirname + `/locs/${n}.js`, 'utf-8'));
		if (!cache) {
			locs.cache[n] = data;
			locs.cache[n].lastUpdate = Date.now();
		}
		return data;
	}
	setLoc(n, data, func) {
		if (!func) func = err => err;
		fs.writeFile(__dirname + `/locs/${n}.js`, JSON.stringify(data), err => {
			if (err) validator.log(err);
			func(err);
		});
	}

	getDB(path, func, pn) {
		fs.readFile(__dirname + (pn ? `/etc/${pn}/` : '/') + path, 'utf8', (err, data) => {
			try {
				if (err) validator.log('getDB(path, func) ' + err);
				func(err, JSON.parse(data));
			} catch (error) {
				validator.log('getDB(path, func) ' + error);
			}
		});
	}
	setDB(path, data, func, pn) {
		if (!func) func = err => err;
		fs.writeFile(__dirname + (pn ? `/etc/${pn}/` : '/') + path, JSON.stringify(data), err => {
			if (err) validator.log(err);
			func(err);
		});
	}

	getSyncDB(path, pn) {
		return JSON.parse(fs.readFileSync(__dirname + (pn ? `/etc/${pn}/` : '/') + path, 'utf8'));
	}
}

module.exports = { db, locs, other, editDBs: new EditDBs()}


