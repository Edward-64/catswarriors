'use strict'
const fs = require('fs');

class CreatingWorld extends require('events').EventEmitter {
	constructor(db, world) {
		super();
		this.db = db;
		this.world = world;
	}
	getLocsName() {
		const stack = [this.world.info.totalLocs];
		for(let i = 1; i <= this.world.info.totalLocs; i++) stack.push(this.world.locs[i].public.name);
		return stack;
	}
	addLocation(res, data, dir, editDBs) {
		let	{disa, name, objs, paths, texs} = data, len,
			disallow = [], landscape = [], canRun = false;
		res.setHeader('content-type', 'application/json; charset=utf-8');
		if (!name) { res.end(JSON.stringify({res: 0, msg: 'вы не ввели название локации'})); return; }

		for(let i = 20; i < 141; i++) {
			if (!disa[i].length) continue;
			for(let j = 0; j < 31; j++) {
				if (!disa[i][j]) continue;
				disallow.push([i, j]);
			}
		}

		paths.pop(); objs.pop();

		paths = paths.filter(x => { if (x) return x });
		objs = objs.filter(x => { if (x) return x });

		len = objs.length;
		if (len) {
			for(let j = 0; j < len; j++) {
				fs.readFile(dir + objs[j].url, 'utf8', (err, data) => {
					if (err) {
						res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
						console.log(err); return;
					}
					let	width = data.match(/width="\d+"/i)[0].match(/\d+/)[0] * objs[j].s,
						height = data.match(/height="\d+"/i)[0].match(/\d+/)[0] * objs[j].s,
						l = objs[j].colors.length, n = objs[j].url.match(/\d+/)[0];
					if (objs[j].noserve) {
						landscape.push({chunk: objs[j].chunk, height: height, width: width,
						texture: objs[j].noserve});
						if (j + 1 == len) canRun = true;
					} else {
						let i = 0;
						for(; i < l; i++) if (objs[j].d[i] != objs[j].colors[i]) break;
						if (i == l) {
							landscape.push({chunk: objs[j].chunk, height: height, width: width,
							texture: objs[j].url});
							if (j + 1 == len) canRun = true;
						} else {
							for(i = 0; i < l; i++) {
								data = data.replace(new RegExp(objs[j].d[i], 'ig'), objs[j].colors[i]);
							}
							const m = ++this.world.info.lastDetails[n];
							fs.writeFile(dir + `/img/details/${n}/${m}.svg`, data, (err) => {
								if (err) {
									res.end(JSON.stringify({res: 0, msg: 'произошла ошибка на стороне сервера'}));
									console.log(err); return;
								}
								landscape.push({chunk: objs[j].chunk, height: height, width: width,
								texture: `/img/details/${n}/${m}.svg`});
								if (j + 1 == len) canRun = true;
							});
						}
					}
				});
			}
		} else canRun = true;
		const controlCanRun = setInterval(() => {
			if (canRun) {
				this.world.locs[++this.world.info.totalLocs] = {
					public: {
						name,
						weather: 'sun',
						fill: [],
						landscape,
						surface: texs || '/img/textures/0.svg',
					},
					paths,
					disallow,
				}
				res.end(JSON.stringify({ res: 1, data: this.world.locs[this.world.info.totalLocs] }));
				clearInterval(controlCanRun); editDBs.save('world');
			}
		}, 1000);
	}
	getNamesExDetails(dir) {
		fs.readdir(dir + `/img/details/`, (err, dirs) => {
			if (err) return this.emit('finishGetNamesExDetails', `ошибка при чтении директории default-объектов: ${err}`);
			dirs = dirs.filter((x) => { if (!/svg/.test(x)) return x; });
			let l = dirs.length, namesDetails = [];
			for(let i = 0; i < l; i++) {
				fs.readdir(dir + `/img/details/${dirs[i]}`, (err, files) => {
					if (err) return this.emit('finishGetNamesExDetails', `ошибка при чтении директории существующих объектов: ${err}`);
					if (files.length) namesDetails = namesDetails.concat(files.map(x => `/img/details/${dirs[i]}/` + x));
					if (i + 1 == l) return this.emit('finishGetNamesExDetails', null, namesDetails);
				});
			}
		});
	}
	getNamesDetails(dir) {
		fs.readdir(dir + `/img/details/`, (err, dirs) => {
			if (err) return this.emit('finishGetNamesDetails', `ошибка при чтении директории: ${err}`);
			dirs = dirs.filter((x) => { if (/svg/.test(x)) return x; });
			let namesDetails = [], l = dirs.length;
			for(let i = 0; i < l; i++) {
				fs.readFile(dir + `/img/details/` + dirs[i], 'utf8', (err, data) => {
					if (err) return this.emit('finishGetNamesDetails', `ошибка при чтении файла: ${err}`);
					let d = data.match(/#[\dABCDEF]{6}/ig);
					if (!d) return this.emit('finishGetNamesDetails', 'ошибка при вычислении всевозможных палитр');
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
	static include(db, world) {
		return new CreatingWorld(db, world);
	}
}

module.exports = CreatingWorld;
