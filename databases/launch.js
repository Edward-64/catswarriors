const fs = require('fs'),
	db = JSON.parse(fs.readFileSync(__dirname + '/cats/info.js', 'utf8')),
	other = JSON.parse(fs.readFileSync(__dirname + '/other.js', 'utf8')),
	locs = JSON.parse(fs.readFileSync(__dirname + '/locs/info.js', 'utf8')),
	talks = JSON.parse(fs.readFileSync(__dirname + '/talks/info.js', 'utf8')),
	validator = require('./../lib/validators.js');

class EditDBs extends require('events').EventEmitter {
	constructor() {
		super();
	}
	save(type, func) {
		if (!func) func = err => err;
		if (type == 'db') {
			const saving = Object.assign({}, db);
			saving.cache = {};
			fs.writeFile(__dirname + '/cats/info.js', JSON.stringify(saving), err => {
				if (err) validator.log(err);
				func(err);
			});
		} else if (type == 'locs') {
			const saving = Object.assign({}, locs);
			saving.cache = {};
			fs.writeFile(__dirname + '/locs/info.js', JSON.stringify(saving), err => {
				if (err) validator.log(err);
				func(err);
			});
		} else if (type == 'talks') {
			const saving = Object.assign({}, talks);
			saving.cache = {};
			fs.writeFile(__dirname + '/talks/info.js', JSON.stringify(saving), err => {
				if (err) validator.log(err);
				func(err);
			});
		} else if (type == 'other') fs.writeFile(__dirname + '/other.js', JSON.stringify(other), err => {
			if (err) validator.log(err);
			func(err);
		});
	}
	saveSync(type) {
		if (type == 'db') fs.writeFileSync(__dirname + '/cats/info.js', JSON.stringify(db));
		if (type == 'locs') fs.writeFileSync(__dirname + '/locs/info.js', JSON.stringify(locs));
		if (type == 'other') fs.writeFileSync(__dirname + '/other.js', JSON.stringify(other));
		if (type == 'talks') fs.writeFileSync(__dirname + '/talks/info.js', JSON.stringify(other));
	}
	getTalk(id, time, func, cache) {
		if (!func) func = err => err;
		if (talks.cache[id] && time == 'info.js') return func(null, talks.cache[id]);
		fs.readFile(__dirname + `/talks/${id}/${time}`, 'utf-8', (err, data) => {
			try {
			if (err) { validator.log(err); return func(err); }
			data = JSON.parse(data);
			if (time == 'info.js' && !cache) {
				talks.cache[id] = data;
				talks.cache[id].lastUpdate = Date.now();
			}
			func(err, data);
			} catch (error) {
				validator.log(error);
			}
		});
	}
	getSyncTalk(id, time, cache) {
		try {
		if (talks.cache[id] && time == 'info.js') return talks.cache[id];
		const data = JSON.parse(fs.readFileSync(__dirname + `/talks/${id}/${time}`, 'utf-8'));
		if (time == 'info.js' && !cache) {
			talks.cache[id] = data;
			talks.cache[id].lastUpdate = Date.now();
		}
		return data;
		} catch (err) {
			validator.log(err);
		}
	}
	setTalk(id, time, data, func) {
		if (!func) func = err => err;
		const path = __dirname + `/talks/${id}/${time}`;
		fs.access(path, fs.constants.F_OK, err => {
			if (err || time == 'info.js')
			fs.writeFile(path, JSON.stringify(data), err => {
				try {
				if (err) validator.log(err);
				func(err, time);
				} catch (error) {
					validator.log(error);
				}
			})
			else this.setTalk(id, time + 1, data, func);
		});
	}
	getCat(pn, func, cache) {
		if (!func) func = err => err;
		if (db.cache[pn]) return func(null, db.cache[pn]);
		fs.readFile(__dirname + `/cats/${pn}.js`, 'utf-8', (err, data) => {
			try {
			if (err) {
				validator.log(err);
				func(err, null);
			} else {
				data = JSON.parse(data);
				if (!cache) {
					db.cache[pn] = data;
					db.cache[pn].lastUpdate = Date.now();
				}
				func(err, data);
			}
			} catch (error) {
				validator.log(error);
			}
		});
	}
	getSyncCat(pn, cache) {
		try {
		if (db.cache[pn]) return db.cache[pn];
		const data = JSON.parse(fs.readFileSync(__dirname + `/cats/${pn}.js`, 'utf-8'));
		if (!cache) {
			db.cache[pn] = data;
			db.cache[pn].lastUpdate = Date.now();
		}
		return data;
		} catch (err) {
			validator.log(err);
		}
	}
	setCat(pn, data, func) {
		if (!func) func = err => err;
		fs.writeFile(__dirname + `/cats/${pn}.js`, JSON.stringify(data), err => {
			try {
			if (err) validator.log(err);
			func(err);
			} catch (error) {
				validator.log(error);
			}
		});
	}

	changeEveryCat(func) {
		try {
		for (let i = 1; i <= db.totalCats; i++) {
			const result = func(this.getSyncCat(i, true), i);
			if (result.error) break;
			if (result.data) this.setCat(i, result.data);
		}
		} catch (err) {
			validator.log('changeEveryCat(func): ' + err);
		}
	}

	getLoc(n, func, cache) {
		if (!func) func = err => err;
		if (locs.cache[n]) return func(null, locs.cache[n]);
		fs.readFile(__dirname + `/locs/${n}.js`, 'utf-8', (err, data) => {
			try {
			if (err) {
				validator.log(err);
				func(err, null);
			} else {
				data = JSON.parse(data);
				if (!cache && !locs.cache[n]) {
					locs.cache[n] = data;
					locs.cache[n].lastUpdate = Date.now();
				}
				func(err, data);
			}
			} catch (error) {
				validator.log(error);
			}
		});
	}
	getSyncLoc(n, cache) {
		try {
		if (locs.cache[n]) return locs.cache[n];
		const data = JSON.parse(fs.readFileSync(__dirname + `/locs/${n}.js`, 'utf-8'));
		if (!cache) {
			locs.cache[n] = data;
			locs.cache[n].lastUpdate = Date.now();
		}
		return data;
		} catch (err) {
			validator.log(`getSyncLoc(n, cache): ` + err);
		}
	}
	setLoc(n, data, func) {
		if (!func) func = err => err;
		fs.writeFile(__dirname + `/locs/${n}.js`, JSON.stringify(data), err => {
			try {
			if (err) validator.log(err);
			func(err);
			} catch (error) {
				validator.log(error);
			}
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
			try {
			if (err) validator.log(err);
			func(err);
			} catch (error) {
				validator.log(error);
			}
		});
	}

	getSyncDB(path, pn) {
		return JSON.parse(fs.readFileSync(__dirname + (pn ? `/etc/${pn}/` : '/') + path, 'utf8'));
	}
}

module.exports = { db, locs, other, talks, editDBs: new EditDBs()}


