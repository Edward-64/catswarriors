'use strict'
const fs = require('fs');

class CreatingWorld extends require('events').EventEmitter {
	constructor(db, locs, validator, editDBs) {
		super();
		this.db = db;
		this.locs = locs;
		this.validator = validator;
		this.editDBs = editDBs;
	}
	getLocsName() {
		const stack = [this.locs.totalLocs];
		for(let i = 1; i <= this.locs.totalLocs; i++) stack.push(this.editDBs.getSyncLoc(i, true).public.name);
		return stack;
	}
	addLocation(res, data, dir) {
		try {
			let	{disa, name, objs, paths, texs} = data,
				len, landscape = [], canRun = false;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			if (!name) { res.end(JSON.stringify({res: 0, msg: 'вы не ввели название локации'})); return; }

			if (!disa[161]) disa = null
			else {
				disa = Object.assign({}, disa);
				delete disa[161];
				for (let i in disa) {
					if (disa.hasOwnProperty(i)) {
						if (disa[i]) continue
						else delete disa[i];
					}
				}
			}

			paths.pop(); objs.pop();

			paths = paths.filter(x => { if (x) return x });
			objs = objs.filter(x => { if (x) return x });

			function matchWH(data, s) {
				return [data.match(/width="\d+"/i)[0].match(/\d+/)[0] * s,
					  data.match(/height="\d+"/i)[0].match(/\d+/)[0] * s]
			}

			len = objs.length; canRun = len == 0 ? true : false;
			for (let j = 0; j < len; j++) {
				if (objs[j].url) {
					fs.readFile(dir + objs[j].url, 'utf8', (err, data) => {
						if (err) { res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'})); this.validator.log(err); return; }
						try {
							let   wh = matchWH(data, objs[j].s),
								l = objs[j].colors.length,
								n = objs[j].url.match(/\d+/)[0];

							let i = 0;
							for (; i < l; i++) if (objs[j].d[i] != objs[j].colors[i]) break;
							if (i == l) {
								landscape.push({chunk: objs[j].chunk, z: objs[j].z, height: wh[1], width: wh[0], texture: objs[j].url});
								objs[j].tmp = objs[j].url;
								if (j + 1 == len) canRun = true; return;
							}

							for (i = 0; i < j; i++) {
								if (objs[i].noserve) continue;
								if (objs[j].colors.length != objs[i].colors.length) continue;
								if (n != objs[i].url.match(/\d+/)[0]) continue;
								let t = 0;
								for (; t < l; t++) if (objs[i].colors[t] !== objs[j].colors[t]) break;
								if (t == l) {
									landscape.push({chunk: objs[j].chunk, z: objs[j].z, height: wh[1], width: wh[0], texture: objs[i].tmp});
									objs[j].tmp = objs[i].tmp;
									if (j + 1 == len) canRun = true; return;
								}
							}

							for(i = 0; i < l; i++) {
								data = data.replace(new RegExp(objs[j].d[i], 'ig'), objs[j].colors[i]);
							}
							const m = ++this.locs.lastDetails[n];
							fs.writeFileSync(dir + `/img/details/${n}/${m}.svg`, data);
							landscape.push({chunk: objs[j].chunk, height: wh[1], width: wh[0], texture: `/img/details/${n}/${m}.svg`});
							objs[j].tmp = `/img/details/${n}/${m}.svg`;
							if (j + 1 == len) canRun = true;
						} catch (err) {
							this.validator.log('lib/creating_world.js: ' + err);
							res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
						}
					});
				} else if (objs[j].noserve){
					fs.readFile(dir + objs[j].noserve, 'utf8', (err, data) => {
						if (err) { res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'})); this.validator.log(err); return; }
						try {
							const wh = matchWH(data, objs[j].s);
							landscape.push({chunk: objs[j].chunk, z: objs[j].z, height: wh[1], width: wh[0], texture: objs[j].noserve});
							if (j + 1 == len) canRun = true;
						} catch (err) {
							this.validator.log('lib/creating_world.js: ' + err);
							res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
						}
					});
				}
			}
			const controlCanRun = setInterval(() => {
				if (canRun) {
					const newLoc = {
						public: {
							name,
							weather: 'sun',
							fill: [],
							landscape,
							surface: texs || '/img/textures/0.svg',
						},
						paths,
						disa,
					}, nNewLoc = ++this.locs.totalLocs;
					this.locs.cache[nNewLoc] = newLoc;
					this.editDBs.save('locs'); this.editDBs.setLoc(nNewLoc, newLoc);
					res.end(JSON.stringify({ res: 1 }));
					clearInterval(controlCanRun);
				}
			}, 200);
		} catch (err) {
			this.validator.log('lib/creating_world.js: ' + err);
			res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
		}
	}
	addPath(res, p) {
		try {
			res.setHeader('content-type', 'application/json; charset=utf-8');
			this.editDBs.getLoc(p.n, (err, data) => {
				if (err) {
					this.validator.log('lib/creating_world.js: ' + err);
					return res.end(JSON.stringify({ res: 0, msg: 'неожиданная ошибка сервера' }));
				}
				data.paths.push(p.path);
				this.editDBs.setLoc(p.n, data, err => {
					if (err) {
						this.validator.log('lib/creating_world.js: ' + err);
						return res.end(JSON.stringify({ res: 0, msg: 'неожиданная ошибка сервера' }))
					}
					else res.end(JSON.stringify({ res: 1}));
				});
			}, true);
		} catch (err) {
			this.validator.log('lib/creating_world.js: ' + err);
			res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка сервера'}));
		}
	}
	getNamesExDetails(dir) {
		fs.readdir(dir + `/img/details/`, (err, dirs) => {
			if (err) {
				this.validator.log(`ошибка при чтении директории default-объектов: ${err}`);
				return this.emit('finishGetNamesExDetails', true);
			}
			dirs = dirs.filter((x) => { if (!/svg/.test(x)) return x; });
			let l = dirs.length, namesDetails = [];
			for(let i = 0; i < l; i++) {
				fs.readdir(dir + `/img/details/${dirs[i]}`, (err, files) => {
					if (err) {
						this.validator.log(`ошибка при чтении директории существующих объектов: ${err}`);
						return this.emit('finishGetNamesExDetails', true);
					}
					if (files.length) namesDetails = namesDetails.concat(files.map(x => `/img/details/${dirs[i]}/` + x));
					if (i + 1 == l) return this.emit('finishGetNamesExDetails', null, namesDetails);
				});
			}
		});
	}
	getNamesDetails(dir) {
		fs.readdir(dir + `/img/details/`, (err, dirs) => {
			if (err) {
				this.validator.log(`ошибка при чтении директории: ${err}`);
				return this.emit('finishGetNamesDetails', true);
			}
			dirs = dirs.filter((x) => { if (/svg/.test(x)) return x; });
			let namesDetails = [], l = dirs.length;
			for(let i = 0; i < l; i++) {
				fs.readFile(dir + `/img/details/` + dirs[i], 'utf8', (err, data) => {
					if (err) {
						this.validator.log(`ошибка при чтении файла: ${err}`);
						return this.emit('finishGetNamesDetails', true);
					}
					let d = data.match(/#[\dABCDEF]{6}/ig);
					if (!d) { this.validator.log('ошибка при вычислении всевозможных палитр'); return this.emit('finishGetNamesDetails', true); };
					d = d.filter((x, j) => {
						for (++j; j < d.length; j++) if (x == d[j]) return;
						return x;
					});
					namesDetails.push({ url: `/img/details/${dirs[i]}`, d });
					if (i + 1 == l) this.emit('finishGetNamesDetails', null, namesDetails);
				});
			}
		});
	}
	static include(db, locs, validator, editDBs) {
		return new CreatingWorld(db, locs, validator, editDBs);
	}
}

module.exports = CreatingWorld;
