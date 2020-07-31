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
		const stack = {}; let loc;
		for(let i = 1; i <= this.locs.totalLocs; i++) {
			loc = this.editDBs.getSyncLoc(i, true);
			if (loc.deleted) continue;
			stack[i] = loc.public.name;
		}
		return stack;
	}
	addLocation(res, data) {
		try {
			let	{disa, name, objs, paths, texs, loc} = data,
				landscape = [], canRun = false;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			if (!name) return res.end(JSON.stringify({res: 0, msg: 'вы не ввели название локации'}));

			paths.pop(); objs.pop();
			paths = paths.filter(i => i);
			objs = objs.filter(i => i);

			function matchWH(data, s) {
				return [data.match(/width="\d+"/i)[0].match(/\d+/)[0] * s,
					  data.match(/height="\d+"/i)[0].match(/\d+/)[0] * s]
			}

			if (objs.length == 0) canRun = true;
			for (let j = 0; j < objs.length; j++) {
				if (objs[j].url) {
					fs.readFile(__dirname + '/..' + objs[j].url, 'utf8', (err, data) => {
						try {
						if (err) {
							res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
							return this.validator.log(err);
						}
						let   wh = matchWH(data, objs[j].s),
							n = objs[j].url.match(/\d+/)[0],
							i;

						for (i = 0; i < objs[j].colors.length; i++) if (objs[j].d[i] != objs[j].colors[i]) break;
						if (i == objs[j].colors.length) {
							landscape.push({
								chunk: objs[j].chunk,
								z: objs[j].z,
								height: wh[1],
								width: wh[0],
								texture: objs[j].url
							});
							objs[j].tmp = objs[j].url;
							if (j + 1 == objs.length) canRun = true;
							return;
						}

						for (i = 0; i < j; i++) {
							if (objs[i].noserve) continue;
							if (objs[j].colors.length != objs[i].colors.length) continue;
							if (n != objs[i].url.match(/\d+/)[0]) continue;
							let t = 0;
							for (; t < objs[j].colors.length; t++) if (objs[i].colors[t] != objs[j].colors[t]) break;
							if (t == objs[j].colors.length) {
								landscape.push({
									chunk: objs[j].chunk,
									z: objs[j].z,
									height: wh[1],
									width: wh[0],
									texture: objs[i].tmp
								});
								objs[j].tmp = objs[i].tmp;
								if (j + 1 == objs.length) canRun = true;
								return;
							}
						}

						for(i = 0; i < objs[j].colors.length; i++) {
							data = data.replace(new RegExp(objs[j].d[i], 'ig'), objs[j].colors[i]);
						}

						const m = ++this.locs.lastDetails[n];
						fs.writeFileSync(__dirname + `/../img/details/${n}/${m}.svg`, data);
						landscape.push({
							chunk: objs[j].chunk,
							height: wh[1],
							width: wh[0],
							texture: `/img/details/${n}/${m}.svg`
						});
						objs[j].tmp = `/img/details/${n}/${m}.svg`;
						if (j + 1 == objs.length) canRun = true;
						} catch (err) {
							this.validator.log('lib/creating_world.js: ' + err);
							res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
						}
					});
				} else if (objs[j].noserve){
					fs.readFile(__dirname + '/..' + objs[j].noserve, 'utf8', (err, data) => {
						try {
						if (err) {
							res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
							this.validator.log(err);
							return;
						}
						const wh = matchWH(data, objs[j].s);
						landscape.push({
							chunk: objs[j].chunk,
							z: objs[j].z,
							height: wh[1],
							width: wh[0],
							texture: objs[j].noserve
						});
						if (j + 1 == objs.length) canRun = true;
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
						disallow: disa,
					}, nNewLoc = ++this.locs.totalLocs;
					this.editDBs.save('locs');
					this.editDBs.setLoc(nNewLoc, newLoc);
					this.locs.cache[nNewLoc] = newLoc;
					res.end(JSON.stringify({ res: 1 }));
					clearInterval(controlCanRun);
				}
			}, 200);
		} catch (err) {
			this.validator.log('lib/creating_world.js: ' + err);
			res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
		}
	}

	editLocation(res, data) {
		try {
		res.setHeader('content-type', 'application/json; charset=utf-8');

		let	{disa, name, objs, paths, texs} = data,
			landscape = [], canRun = false;
		if (!name) return res.end(JSON.stringify({res: 0, msg: 'введите название локации'}));

		paths.pop(); objs.pop();
		paths = paths.filter(i => i);
		objs = objs.filter(i => i);

		function matchWH(data, s) {
			return [data.match(/width="\d+"/i)[0].match(/\d+/)[0] * s,
				  data.match(/height="\d+"/i)[0].match(/\d+/)[0] * s]
		}

		if (objs.length == 0) canRun = true;
		for (let j = 0; j < objs.length; j++) {
			if (objs[j].old) {
				landscape.push(objs[j]);
				if (j + 1 == objs.length) canRun = true;
			} else if (objs[j].url) {
				fs.readFile(__dirname + '/..' + objs[j].url, 'utf8', (err, data) => {
					try {
					if (err) {
						res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
						return this.validator.log(err);
					}
					let   wh = matchWH(data, objs[j].s),
						n = objs[j].url.match(/\d+/)[0],
						i;

					for (i = 0; i < objs[j].colors.length; i++) if (objs[j].d[i] != objs[j].colors[i]) break;
					if (i == objs[j].colors.length) {
						landscape.push({
							chunk: objs[j].chunk,
							z: objs[j].z,
							height: wh[1],
							width: wh[0],
							texture: objs[j].url
						});
						objs[j].tmp = objs[j].url;
						if (j + 1 == objs.length) canRun = true;
						return;
					}

					for (i = 0; i < j; i++) {
						if (objs[i].noserve || objs[j].old || !objs[i].colors) continue;
						if (objs[j].colors.length != objs[i].colors.length || n != objs[i].url.match(/\d+/)[0]) continue;
						let t = 0;
						for (; t < objs[j].colors.length; t++) if (objs[i].colors[t] != objs[j].colors[t]) break;
						if (t == objs[j].colors.length) {
							landscape.push({
								chunk: objs[j].chunk,
								z: objs[j].z,
								height: wh[1],
								width: wh[0],
								texture: objs[i].tmp
							});
							objs[j].tmp = objs[i].tmp;
							if (j + 1 == objs.length) canRun = true;
							return;
						}
					}

					for(i = 0; i < objs[j].colors.length; i++) {
						data = data.replace(new RegExp(objs[j].d[i], 'ig'), objs[j].colors[i]);
					}

					const m = ++this.locs.lastDetails[n];
					fs.writeFileSync(__dirname + `/../img/details/${n}/${m}.svg`, data);
					landscape.push({
						chunk: objs[j].chunk,
						height: wh[1],
						width: wh[0],
						texture: `/img/details/${n}/${m}.svg`
					});
					objs[j].tmp = `/img/details/${n}/${m}.svg`;
					if (j + 1 == objs.length) canRun = true;
					} catch (err) {
						this.validator.log('lib/creating_world.js: ' + err);
						res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
					}
				});
			} else if (objs[j].noserve){
				fs.readFile(__dirname + '/..' + objs[j].noserve, 'utf8', (err, data) => {
					try {
					if (err) {
						res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
						this.validator.log(err);
						return;
					}
					const wh = matchWH(data, objs[j].s);
					landscape.push({
						chunk: objs[j].chunk,
						z: objs[j].z,
						height: wh[1],
						width: wh[0],
						texture: objs[j].noserve
					});
					if (j + 1 == objs.length) canRun = true;
					} catch (err) {
						this.validator.log('lib/creating_world.js: ' + err);
						res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
					}
				});
			}
		}
		const controlCanRun = setInterval(() => {
			if (canRun) {
				this.editDBs.getLoc(data.loc, err => {
					if (err) return res.end(JSON.stringify({res: 0, msg: 'ошибка сервера'}));
					const l = this.locs.cache[data.loc];
					l.public.name = name;
					l.public.landscape = landscape;
					l.public.surface = texs;
					l.paths = paths;
					l.disallow = disa;
					res.end(JSON.stringify({ res: 1 }));
				});
				clearInterval(controlCanRun);
			}
		}, 200);
		} catch (err) {
			this.validator.log('lib/creating_world.js, editLocation(res, data): ' + err);
			res.end(JSON.stringify({res: 0, msg: 'неожиданная ошибка'}));
		}
	}
	getNamesExDetails() {
		fs.readdir(__dirname + `/../img/details/`, (err, dirs) => {
			if (err) {
				this.validator.log(`ошибка при чтении директории default-объектов: ${err}`);
				return this.emit('finishGetNamesExDetails', true);
			}
			dirs = dirs.filter(i => { if (!/svg/.test(i)) return i; });
			let namesDetails = [], done = 1;
			for(let i = 0; i < dirs.length; i++) {
				fs.readdir(__dirname + `/../img/details/${dirs[i]}`, (err, files) => {
					++done;
					if (err) {
						this.validator.log(`ошибка при чтении директории существующих объектов: ${err}`);
						return this.emit('finishGetNamesExDetails', true);
					}
					if (files.length) namesDetails = namesDetails.concat(files.map(x => `/img/details/${dirs[i]}/` + x));
					if (done == dirs.length) return this.emit('finishGetNamesExDetails', null, namesDetails);
				});
			}
		});
	}
	getNamesDetails() {
		fs.readdir(__dirname + `/../img/details/`, (err, dirs) => {
			if (err) {
				this.validator.log(`ошибка при чтении директории: ${err}`);
				return this.emit('finishGetNamesDetails', true);
			}
			dirs = dirs.filter(i => { if (/svg/.test(i)) return i; });
			let namesDetails = [], done = 1;
			for(let i = 0; i < dirs.length; i++) {
				fs.readFile(__dirname + `/../img/details/` + dirs[i], 'utf8', (err, data) => {
					++done;
					if (err) {
						this.validator.log(`ошибка при чтении файла: ${err}`);
						return this.emit('finishGetNamesDetails', true);
					}

					let d = data.match(/#[\dABCDEF]{6}/ig);
					if (!d) {
						this.validator.log('ошибка при вычислении всевозможных палитр');
						return this.emit('finishGetNamesDetails', true);
					};
					d = d.filter((i, j) => {
						for (++j; j < d.length; j++) if (i == d[j]) return;
						return i;
					});

					namesDetails.push({ url: `/img/details/${dirs[i]}`, d });
					if (done == dirs.length) this.emit('finishGetNamesDetails', null, namesDetails);
				});
			}
		});
	}
	static include(db, locs, validator, editDBs) {
		return new CreatingWorld(db, locs, validator, editDBs);
	}
}

module.exports = CreatingWorld;
