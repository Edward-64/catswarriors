'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	{db, locs, other, talks, editDBs} = require('./databases/launch.js'),
	validator = require('./lib/validators.js'),
	ch = require('./lib/cookie.js').include(db, validator),
	cw = require('./lib/creating_world.js').include(db, locs, validator, editDBs),
	ca = require('./lib/control_activs.js').include(talks),
	queens = {
		['племя Теней']: [[2, 9]],
		['племя Ветра']: [[5, 10]],
		['Речное племя']: [[4, 1]],
		['Грозовое племя']: [[3, 8]],
		['одиночка']: [[6, 11]],
		['домашний котик']: [[6, 11]],
	},
	ADMINS = [1];


/*editDBs.changeEveryCat((cat, pn) => {
	try {

		return {}; //if need to save, data:cat
	} catch (err) {
		return {error:true};
	}
}); */

setInterval(() => {
	++other.time;
}, 1000);

function clearCache(func) {
	const timeout = 900000;
	if (func) {
		const l = {
			talks: Object.keys(talks.cache),
			db: Object.keys(db.cache),
			locs: Object.keys(locs.cache),
			done: 0
		},
		changeDone = function(n) {
			l.done = l.done | n;
		};
		if (l.talks == 0) changeDone(1);
		if (l.locs == 0) changeDone(4);
		if (l.db == 0) changeDone(2);
		for (let p in talks.cache) {
			if (!talks.cache.hasOwnProperty(p)) continue;
			editDBs.setTalk(p, 'info.js', talks.cache[p], p >= l.talks ? () => changeDone(1) : null);
			delete talks.cache[p];
		}
		for (let p in locs.cache) {
			if (!locs.cache.hasOwnProperty(p)) continue;
			editDBs.setLoc(p, locs.cache[p], p >= l.locs ? () => changeDone(4) : null);
			delete locs.cache[p];
		}
		for (let p in db.cache) {
			if (!db.cache.hasOwnProperty(p)) continue;
			editDBs.setCat(p, db.cache[p], p >= l.db ? () => changeDone(2) : null);
			delete db.cache[p];
		}
		editDBs.save('talks', () => changeDone(8));
		editDBs.save('other', () => changeDone(16));
		editDBs.save('locs', () => changeDone(32));
		editDBs.save('db', () => changeDone(64));

		const t = setInterval(() => {
			//console.log(l.done);
			if (l.done == 127) {
				clearInterval(t);
				func();
			}
		}, 1000);
	} else {
		for (let p in talks.cache) {
			if (!talks.cache.hasOwnProperty(p)) continue;
			if (Date.now() - talks.cache[p].lastActiv > timeout &&
			    Date.now() - talks.cache[p].lastUpdate > timeout) {
				editDBs.setTalk(p, 'info.js', talks.cache[p]);
				delete talks.cache[p];
			}
		}
		for (let p in locs.cache) {
			if (!locs.cache.hasOwnProperty(p)) continue;
			if (Date.now() - locs.cache[p].lastUpdate > timeout) {
				editDBs.setLoc(p, locs.cache[p]);
				delete locs.cache[p];
			}
		}
		for (let p in db.cache) {
			if (!db.cache.hasOwnProperty(p)) continue;
			if (Date.now() - db.cache[p].game.last > timeout &&
			    Date.now() - db.cache[p].lastVisitOfSite > timeout &&
			    Date.now() - db.cache[p].lastUpdate > timeout) {
				editDBs.setCat(p, db.cache[p]);
				delete db.cache[p];
			}
		}
		editDBs.save('talks');
		editDBs.save('other');
		editDBs.save('locs');
		editDBs.save('db');
	}
}

setInterval(clearCache, 3600000);

process.on('SIGTERM', () => {
	clearCache(() => process.exit());
});

const cacheControl = require('./cnfg/cache_control.js');

function createCharacter(rawData, req, res) {
	try {
		if (!rawData) { sendJSON(res, { cr: 0, res: 'некорректные данные'} ); return; }
		let	regCatName = rawData.catName.match(/[а-яА-Яё]+/g),
			regAlias = rawData.alias.match(/[a-zA-Zа-яА-Яё\d]+/g),
			regPass = rawData.password.match(/[\wа-яА-Яё\-\d]+/);

	      if (regCatName && regCatName.length == 2) regCatName = regCatName.join(' ');
	      if (regCatName && regCatName.length == 1) regCatName = regCatName[0];
	      if (regPass) regPass = regPass[0];
	      if (regAlias) regAlias = regAlias.join(' ');

		let a = rawData.catName.length < 2 || rawData.catName.length > 32,
		    b = rawData.alias.length < 2 || rawData.alias.length > 32 || rawData.password.length < 6 || rawData.password.length > 32,
		    c = regCatName !== rawData.catName || regAlias !== rawData.alias || regPass !== rawData.password;

		if (!(regCatName && regAlias && regPass) || a || b || c) {
			sendJSON(res, { cr: 0, res: 'некорректные данные'} );
			return;
		}

		for(let i = 1; i <= db.totalCats; i++) {
			if (db.cats[i].password === rawData.password) {
				sendJSON(res, { res: 'придумайте другой пароль', cr: 0 });
				return;
			}
		}

		//Создай проверку на то, что девайсы && ip совпадают
		c = ch.existingCookie(req.headers.cookie, rawData);
		if (c < 0) {
			didInfr('creatingTwoChar', -c);
		      sendJSON(res, { cr: 0, res: `<span class="lower-text">У Вас уже есть персонаж по имени ${db[-c].catName}. ` +
				`Создание сразу двух и более персонажей запрещено. Чтобы создать нового персонажа, нужно удалить старого.</span>` });
			return;
		}

		const cNewCat = ch.generateCookie(),
			pnNewCat = ++db.totalCats;
		let	clan = Math.floor(Math.random() * 6),
			die = 120 + Math.floor(Math.random() * 31);
		if (Math.floor(Math.random() * 10) == 7) die = 150 + Math.floor(Math.random() * 51);
		die = other.time + die * 60 * 60 * 60;
		switch (clan) {
			case 0: clan = 'Грозовое племя'; break;
			case 1: clan = 'Речное племя'; break;
			case 2: clan = 'племя Теней'; break;
			case 3: clan = 'племя Ветра'; break;
			case 4: clan = 'одиночка'; break;
			case 5: clan = 'домашний котик'; break;
		}

		fs.mkdir(__dirname + `/databases/etc/${pnNewCat}`, (err) => {
			if (err) { validator.log(err); sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'}); return; }
			fs.writeFile(__dirname + `/databases/etc/${pnNewCat}/knowledge.js`, JSON.stringify({knownPlayers: {}}), (err) => {
				if (err) { validator.log(err); sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'}); return; }

				db.cats[pnNewCat] = {
					password: rawData.password,
					alias: rawData.alias,
					cookie: cNewCat
				}

				const newCat = {
					catName: rawData.catName[0].toUpperCase() + rawData.catName.substring(1).toLowerCase(),
					role: 'user', //кандидат на бинарное представление прав
					alias: rawData.alias,
					password: rawData.password,
					devices: [],
					cookie: cNewCat,
					dateOfReg: Date.now(),
					lastVisitOfSite: Date.now(),
					infractions: {},
					game: {
						public: {
							gender: Number.parseInt(rawData.gender),
							health: 100,
							action: 0,
							speed: 50,
							lastPlace: [20, 0, 0, 1],
							birth: other.time,
						},
						die,
						lastActiv: Date.now() - 15 * 60001,
						block: 0,
						isWaitingRelation: [],
						cantSendRelation: [],
						iteractions: [],
						clan,
					},
					tmp: { dontChooseCharacter: true, haventGotParents: true },
					talks: [{id:1,userLastActiv:1596154620623,lastActiv:1596154620624}]
				}

				ch.setCookie({alias: rawData.alias, password: rawData.password}, res, true);
				db.cache[pnNewCat] = newCat;

				const newTalk = ++talks.totalTalks,
					theTalk = {
						img: '/img/talk/2.svg',
						color: '#c6dce4',
						type: 1,
						name: 'Диалог с технической поддержкой',
						members: ADMINS.concat(pnNewCat),
						admins: ADMINS,
						activ: 0,
						lastActiv: Date.now() - 3000
					};
				fs.mkdir(__dirname + `/databases/talks/${newTalk}`, err => {
				if (err) return sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'});
				fs.writeFile(__dirname + `/databases/talks/${newTalk}/info.js`, JSON.stringify(theTalk), err => {
				if (err) return sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'});
					for (let i = 0; i < theTalk.members.length; i++) {
						editDBs.getCat(theTalk.members[i], (err, data) => {
							if (err) return;
							data.talks.push({id: newTalk, userLastActiv: Date.now(), lastActiv: Date.now()});
							if (!db.cache[theTalk.members[i]]) editDBs.setCat(theTalk.members[i], data);
						}, true);
					}
				});
				});
				editDBs.getTalk(1, 'info.js', (err, data) => {
					if (err) return sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'});
					data.members.push(pnNewCat);
				});
				editDBs.setCat(pnNewCat, newCat, err => {
					if (err) return sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'});
					sendJSON(res, { res: 'Персонаж создан! Нажмите сюда, чтобы активировать его', cr: 1});
				});
			});
		});
	} catch(err) {
		validator.log('при создании персонажа: ' + err + '\n\n отправленные данные: ' + JSON.stringify(rawData));
	}
}

function createOC(fromUser, res, pn) {
	const cch = require('./lib/cch.js');
	let	inh, cchh;

	editDBs.getDB('cch.js', (err, data) => {
		if (err) sendJSON(res, { res: 0 });
		else {
			cchh = data;
			editDBs.getDB('inherited.js', (err, data) => {
				if (err) sendJSON(res, { res: 0 });
				else {
					inh = data; console.log(inh ? 'данные о наследовании успешно полчены' : '!!!нет данных о наследовании');
					if (validator.cch(fromUser, Object.assign({}, inh), cchh, pn)) {
						cch.createCharacter(pn, fromUser); console.log('createCharacter отправлен');
						cch.once('finishCreateCharacter', (err, path) => {
							if (err) sendJSON(res, { res: 0 });
							else {
								console.log('событие finishCreateCharacter произошло');
								const forCache = err => {
									if (err) {sendJSON(res, { res: 0 }); return;}
									db.cache[pn].game.public.skin = path;
									delete db.cache[pn].tmp.dontChooseCharacter;
									console.log(db.cache[pn]);
									editDBs.setCat(pn, db.cache[pn]);
									sendJSON(res, { res: 1 });
								}
								if (db.cache[pn]) forCache()
								else editDBs.getCat(pn, forCache);
							}
						});
						for (let p in inh.colors) {
							if (!inh.colors.hasOwnProperty(p)) continue;
							if (p == fromUser[0]) inh.colors[p] += 0.25
							else inh.colors[p] -= 0.25;
							if (inh.colors[p] <= 0) delete inh.colors[p];
							if (inh.colors[p] > 1) inh.colors[p] = 1;
						}
						for (let p in inh.patterns) {
							if (!inh.patterns.hasOwnProperty(p)) continue;
							if (p == fromUser[2]) inh.patterns[p] += 0.25
							else inh.patterns[p] -= 0.25;
							if (inh.patterns[p] <= 0) delete inh.patterns[p];
							if (inh.patterns[p] > 1) inh.patterns[p] = 1;
						}
						editDBs.setDB('inherited.js', inh, null, pn);
					} else sendJSON(res, { res: 0, msg: 'не пройдена валидация наследования' });
				}
			}, pn);
		}
	});
}

function download(req, res, contentLength, path) {
	/*
	Перепиши эту функцию без использования formidable

	let data = '';
	req.on('data', chunk => data += chunk);
	req.on('end', () => {
		fs.appendFile(__dirname + '/название сохраняемого файла', data, (err) => { console.log(`${err}`)});
		getStaticFile(res, '/requires/load.html', 'text/html');
	});
	*/
	if (contentLength > 1048576) {
		res.statusCode = 400;
		res.setHeader('content-type', 'text/plain; charset=utf-8');
		return res.end('Слишком тяжелый файл (более 1-го Мбайта)');
	}
	let form = new formidable.IncomingForm();
	form.parse(req, (err, fields, files) => {
		if(err) return error500(res, 'Произошла ошибка на стороне сервера. Error in download, part of formidable.');
		if(files.photo.size > 1048576) {
			res.statusCode = 400;
			res.setHeader('content-type', 'text/plain; charset=utf-8')
			return res.end('Слишком тяжелый файл (более 1-го Мбайта)');
		}
		fs.readFile(files.photo.path, (err, data) => {
			if(err) error500(res, 'Произошла ошибка на стороне сервера. Error in download, part of server.')
			else fs.writeFile(__dirname + fields.path + files.photo.name, data, (err) => {
				if (err) error500(res)
				else getStaticFile(res, '/index.html', null, 'text/html');
			});
		});
	});
}

function getJSON(req, res, contentLength, cmd, pn) {
	let body = '';
	if (contentLength > 1048576) {
		res.statusCode = 400;
		res.setHeader('content-type', 'application/json; charset=utf-8');
		res.end({ res: 3, answ: 'Слишком тяжелый запрос (более одного Мбайта)'});
	}
	req.on('data', (chunk) => {
		body += chunk;
		if (body > 1048576) {
			res.statusCode = 400;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end({res: 3, answ: 'Слишком тяжелый запрос (более одного Мбайта)'});
		}
	});
	req.on('end', () => {
		try {
			body = JSON.parse(body);
			switch (cmd) {
				case '/ac': ch.setCookie(body, res); break;
				case '/cc': createCharacter(body, req, res); break;
				case '/ar': parseAnotherRequest(body.require, res, req, pn); break;
				case '/crnewloc': cw.addLocation(res, body); break;
				case '/edtloc': cw.editLocation(res, body); break;
				case '/scch': createOC(body, res, pn); break;
				case '/issie': body.pn = pn; validator.log(JSON.stringify(body)); break;
			}
		} catch(err) {
			validator.log(err);
		}
	});
}

function parseAnotherRequest(require, res, req, pn) {
	const p = db.cache[pn] ? db.cache[pn].role : null;
	if (require === 'зфнс') {
		if (pn > 0) {
			if (/admin/.test(p)) getStaticFile(res, '/requires/load.html', [-200, -200])
			else afterCheckCookie(res, {res: 2}); //нет прав
		} else afterCheckCookie(res, {res: 0}); //персонаж не активирован
	} else if (require === 'q' || /творить мир/.test(require)) {
		if (/creater/.test(p)) getStaticFile(res, '/requires/cw.html', [-300, -280, '/js/cw.js'])
		else getStaticFile(res, '/requires/cw_no_creater.html', [200, 0, 'js/cw_no_creater.js']);
	} else if (/эксп[еи]{1}р[еи]{1}мент.*(окрас|персонаж).*/.test(require)) {
		getStaticFile(res, '/requires/creating_character.html', [200, 0, '/js/cch.js']);
	} else afterCheckCookie(res, {res: 3}) //попробуйте что-нибудь другое
}

function didInfr(type, pn) {
	function forCache(err) {
		if (err) return;
		if (db.cache[pn].infractions[type]) db.cache[pn].infractions[type] += 1
		else db.cache[pn].infractions[type] = 1;
	}
	if (db.cache[pn]) forCache()
	else editDBs.getCat(pn, forCache);
}

const server = http.createServer((req, res) => {
try {
	let path = req.url.match(/\/{1}[\w\d\.\/_]*/i), n = null;

	//req.connection.remoteAddress || req.headers['x-forwarded-for'];

	if (path) {
		path = path[0];
		if (path.startsWith('/img/')) {
			n = path.match(/\d+/g);
			if (n && n.length < 3) path = path.replace(/\d+.*/, '');
			else n = null;
		} else if (path.startsWith('/r/')) {
			n = path.match(/[\w\d\.\_]+/g);
			if (n && n.length > 1) path = `/r/${n[1]}`
			else n = null;
		}
	} else path = '/';

	const c = ch.existingCookie(req.headers.cookie || '');
	let	p = null;
	if (c == 0 || db.cache[c]) forStartServer(null)
	else editDBs.getCat(Math.abs(c), forStartServer);

function forStartServer(err) {
	if (err) return error500(res, 'Ошибка аутентификации');
	if (c > 0) {
		p = db.cache[c].role;
		db.cache[c].lastVisitOfSite = Date.now();
	}

	const ccache = cacheControl(req, res, path);

	if (req.method === 'GET') {
		switch(path) {
			case '/':
				if (c == 0) getStaticFile(res, '/index_first_look.html', null, 'text/html')
				else getStaticFile(res, '/index.html', null, 'text/html'); break;
			case '/favicon.ico':
				getStaticFile(res, '/favicon.ico', null, 'image/vnd.microsoft.icon'); break;
			case '/css/style.css':
				if (ccache) break; getStaticFile(res, '/css/style.css', null, 'text/css'); break;
			case '/css/styleGame.css':
				if (ccache) break; getStaticFile(res, '/css/style_game.css', null, 'text/css'); break;
			case '/js/handlerRequires.js':
				if (ccache) break; getStaticFile(res, '/js/handler_requires.js', null, 'application/javascript'); break;
			case '/js/play.js':
				if (ccache) break; getStaticFile(res, '/js/play.js', null, 'application/javascript');  break;
			case '/js/cch.js':
				if (ccache) break; getStaticFile(res, '/js/cch.js', null, 'application/javascript'); break;
			case '/js/cch_inh.js':
				if (ccache) break; getStaticFile(res, '/js/cch_inh.js', null, 'application/javascript'); break;
			case '/js/cw.js':
				if (ccache) break;
				if (/creater/.test(p)) getStaticFile(res, '/js/cw.js', null, 'application/javascript')
				else error404(res); break;
			case '/js/talk.js':
				if (ccache) break; getStaticFile(res, '/js/talk.js', null, 'application/javascript'); break;
			case '/js/cw_no_creater.js':
				if (ccache) break; getStaticFile(res, '/js/cw_no_creater.js', null, 'application/javascript'); break;
			case '/js/md.js':
				if (ccache) break; getStaticFile(res, '/js/md.js', null, 'application/javascript'); break;
			case '/r/getloc':
				if (n && n[2]) editDBs.getLoc(n[2], (err, data) => {
					if (err) return sendJSON(res, { res: 0, msg: 'ошибка сервера' });
					sendJSON(res, { res: 1, msg: {
						paths: data.paths,
						disallow: data.disallow,
						landscape: data.public.landscape,
						texture: data.public.surface,
						name: data.public.name
					}});
				}); break;
			case '/r/getskin':
				if (n && n[2]) editDBs.getCat(n[2], (err, data) => {
					if (err) return sendJSON(res, { res: 0, msg: 'ошибка сервера' });
					sendJSON(res, { res: 1, msg: data.game.public.skin });
				}, true); break;
			case '/play':
				if (c > 0) {
					if (db.cache[c].tmp.dontChooseCharacter) {
						if (db.cache[c].tmp.haventGotParents) {
							const clan = db.cache[c].game.clan,
								parents = queens[clan][Math.floor(Math.random() * queens[clan].length)] || queens[clan][0];
							let	mInh, fInh, inh = {patterns:{},colors:{}};
							db.cache[c].game.parents = parents;
							editDBs.getDB('knowledge.js', (err, data) => {
								if (err) return;
								data.knownPlayers[parents[0]] = {
									['2']: { item: 'Эта кошка для меня ', value: 'мама' }
								}
								data.knownPlayers[parents[1]] = {
									['2']: { item: 'Этот кот для меня ', value: 'отец' }
								}
								editDBs.setDB('knowledge.js', data, null, c);
							}, c);
							editDBs.getDB('knowledge.js', (err, data) => {
								if (err) return;
								data.knownPlayers[c] = {
										['0']: { item: 'Это ', value: db.cache[c].catName },
										['2']: { item: (db.cache[c].game.public.gender ? 'Он' : 'Она') + ' мой ', value: 'котенок' }
									}
								editDBs.setDB('knowledge.js', data, null, parents[0]);
							}, parents[0]);
							editDBs.getDB('knowledge.js', (err, data) => {
								if (err) return;
								data.knownPlayers[c] = {
										['0']: { item: 'Это ', value: db.cache[c].catName },
										['2']: { item: (db.cache[c].game.public.gender ? 'Он' : 'Она') +  ' мой ', value: 'котенок' }
									}
								editDBs.setDB('knowledge.js', data, null, parents[1]);
							}, parents[1]);
							editDBs.getDB('inherited.js', (err, data) => {
								if (err) return; mInh = data;
								editDBs.getDB('inherited.js', (err, data) => {
									if (err) return; fInh = data;
									editDBs.getDB('cch.js', (err, cch) => {
										if (err) return;
										inh.white = mInh.white || fInh.white;
										for (let i = 0; i <= cch.lastColor; i++) {
											if (!(mInh.colors[i] || fInh.colors[i])) continue;
											inh.colors[i] = ((mInh.colors[i] || 0) + (fInh.colors[i] || 0)) / 2;
										}
										for (let i = 0; i <= cch.lastPattern; i++) {
											if (!(mInh.patterns[i] || fInh.patterns[i])) continue;
											inh.patterns[i] = ((mInh.patterns[i] || 0) + (fInh.patterns[i] || 0)) / 2;
										}
										editDBs.setDB('inherited.js', inh, err => {
											if (!err) {
												delete db.cache[c].tmp.haventGotParents;
												editDBs.setCat(c, db.cache[c]);
											}
										}, c);
									});
								}, parents[1]);
							}, parents[0]);
						}
						getStaticFile(res, '/requires/cch_inh.html', null, 'text/html');
					} else {
					//	res.setHeader('set-cookie', [`timeauth=${db.cache[c].cookie};max-age=60;SameSite=lax`,
					///					     `timealias=${encodeURI(db.cache[c].alias)};max-age=60;SameSite=lax`]);
						getStaticFile(res, '/play.html', null, 'text/html');
					}
				}
				else getStaticFile(res, '/requires/error_play.html', null, 'text/html');
				break;
			case '/creating':
				if (c > 0) {
					afterCheckCookie(res, {res: 0}); //нет
				} else if (c < 0) {
					afterCheckCookie(res, {res: 2, catName: db.cache[-c].catName}); //нет, предупреждение
					didInfr('creatingTwoChar', -c);
				} else getStaticFile(res, '/requires/creating.html', 'json'); break; //да
			case '/load':
				if (/admin/.test(p)) getStaticFile(res, '/requires/load.html', null, 'text/html')
				else {
					validator.log(`${c} пытался отправить GET /load (загрузка файлов на сервер)`);
					error404(res);
				} break;
			case '/activ':
				if (c <= 0) getStaticFile(res, '/requires/activ.html', 'json') //да
				else afterCheckCookie(res, {res: 2, catName: db.cache[c].catName}); break; //уже активировaн
			case '/talks':
				if (c > 0) getStaticFile(res, '/requires/talks.html', 'json')
				else sendJSON(res, { res: 0 }); break;
			case '/markdown':
				getStaticFile(res, '/requires/md.html', 'json'); break;
			case '/getocw':
				cw.getNamesExDetails();
				cw.once('finishGetNamesExDetails', (err, e) => {
					if (err) return sendJSON(res, {res: 0});
					cw.getNamesDetails();
					cw.once('finishGetNamesDetails', (err, f) => {
						if (err) return sendJSON(res, {res: 0});
						const sendedData = {
							objsExNames: e,
							objsNames: f,
							texsNames: locs.texs,
						}
						if (/creater/.test(p)) {
							sendedData.locsnames = cw.getLocsName();
							sendJSON(res, {res: 1, data: sendedData});
						} else sendJSON(res, {res: 1, data: sendedData});
					});
				}); break;
			case '/getacch':
				editDBs.getDB('cch.js', (err, data) => {
					if (err) { sendJSON(res, { res: 0 }); validator.log(err); }
					else sendJSON(res, { res: 1, data });
				}); break;
			case '/getinh':
				if (c > 0) {
					editDBs.getDB('inherited.js', (err, data) => {
						if (err) { sendJSON(res, { res: 0 }); validator.log(err); }
						else sendJSON(res, { res: 1, data });
					}, c);
				} break;
			case '/img/':
				if (ccache) break; getStaticFile(res, `/img/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/cch/':
				if (ccache) break; getStaticFile(res, `/img/cch/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/cch/patt/':
				if (ccache) break; getStaticFile(res, `/img/cch/patt/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/cch/wht/':
				if (ccache) break; getStaticFile(res, `/img/cch/wht/${n}.svg`, null, 'image/svg+xml'); break;;
			case '/img/talk/':
				if (ccache) break; getStaticFile(res, `/img/talk/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/textures/':
				if (ccache) break; getStaticFile(res, `/img/textures/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/details/':
				if (ccache) break;
				if (!n) { error404(res); break; }
				if (n.length == 1) getStaticFile(res, `/img/details/${n[0]}.svg`, null, 'image/svg+xml')
				else if (n.length == 2) getStaticFile(res, `/img/details/${n[0]}/${n[1]}.svg`, null, 'image/svg+xml'); break;
			case '/img/players/':
				if (ccache) break;
				if (n) getStaticFile(res, `/img/players/${n[0]}.svg`, null, 'image/svg+xml')
				else error404(res); break;
			case '/css/img/button.png':
				if (ccache) break; getStaticFile(res, '/css/img/button.png', null, 'image/png'); break;
			case '/img/indev.svg':
				if (ccache) break; getStaticFile(res, '/img/indev.svg', null, 'image/svg+xml'); break;
			case '/img/preloader.svg':
				if (ccache) break; getStaticFile(res, '/img/preloader.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowarrow.svg':
				if (ccache) break; getStaticFile(res, '/css/img/lowarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowlightarrow.svg':
				if (ccache) break; getStaticFile(res, '/css/img/lowlightarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/arrow.svg':
				if (ccache) break; getStaticFile(res, '/css/img/arrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lightarrow.svg':
				if (ccache) break; getStaticFile(res, '/css/img/lightarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowMsg.png':
				if (ccache) break; getStaticFile(res, '/css/img/lowMsg.png', null, 'image/png'); break;
			case '/css/img/line.png':
				if (ccache) break; getStaticFile(res, '/css/img/line.png', null, 'image/png'); break;
			case '/css/img/verticalLine.png':
				if (ccache) break; getStaticFile(res, '/css/img/vertical_line.png', null, 'image/png'); break;
			case '/css/img/head.jpg':
				if (ccache) break; getStaticFile(res, '/css/img/head.jpg', null, 'image/jpg'); break;
			case '/dac':
				ch.deleteCookie(res); break;
			case '/getcookie':
				if (c > 0) sendJSON(res, {res: 1, cookie: db.cache[c].cookie, alias: db.cache[c].alias})
				else sendJSON(res, {res: 0}); break;
			default: error404(res); break;
		}
	}
	if (req.method === 'POST') {
		const contentLength = req.headers['content-length'];
			switch (path) {
				case '/dlf':
					if (/admin/.test(p)) download(req, res, contentLength)
					else validator.log(`${c} пытался отправить POST ${path}`); break;
				case '/cc':
					if (c == 0) getJSON(req, res, contentLength, path)
					else validator.log(`${c} пытался отправить POST ${path}`); break;
				case '/ac':
					if (c <= 0) getJSON(req, res, contentLength, path)
					else validator.log(`${c} пытался отправить POST ${path}`); break;
				case '/ar':
					getJSON(req, res, contentLength, path, c); break;
				case '/crnewloc':
					if (/creater/.test(p)) getJSON(req, res, contentLength, path)
					else validator.log(`${c} пытался отправить POST ${path}`); break;
				case '/edtloc':
					if (/creater/.test(p)) getJSON(req, res, contentLength, path)
					else validator.log(`${c} пытался отправить POST ${path}`); break;
				case '/issie':
					if (c > 0) {
						if (db.cache[c].tmp.issies) ++db.cache[c].tmp.issies
						else db.cache[c].tmp.issies = 1;
						if (db.cache[c].tmp.issies > 5) sendJSON(res, {res: 0, msg: 'нельзя отправить более пяти сообщений о проблеме'});
						else {
							sendJSON(res, {res: 1});
							getJSON(req, res, contentLength, path, c);
						}
					} break;
				case '/scch':
					if (c > 0 && db.cache[c].tmp.dontChooseCharacter) getJSON(req, res, contentLength, path, c); break;
		}
	}
}
} catch (err) {
	validator.log('внутри .server()' + err);
}}).listen(process.env.PORT || 80, () => console.log('Server is running on', process.env.PORT || 80));

const WebSocket = require('ws'),
	wss = new WebSocket.Server({ server }),
	clients = [], talkClients = [],
	colorsOfTalks = ['#a5bdba','#795d7c','#4d4178','#ffe7d9','#f7c4c6','#6b7c8f','#f4c7aa','#df9a91','#686a97',
                      '#e4eaef','#c6dce4','#81b5bb','#348694','#294d52','#44a2a7','#9fad3c','#817a2e','#5d5505',
                      '#63361b','#8f5936','#e1bd6e'];

setInterval(() => {
	clients.forEach((x, i) => {
		if (db.cache[x.pn] && Date.now() - db.cache[x.pn].game.last > 15 * 60000) {
			 wsSend(14, 'inloc', [x.loc, {pn: x.pn, s: 'doze'}]);
		}
	});
}, 60000);

wss.on('connection', (ws, req) => {
	let	pn = null, cat = [null, null], control = null;


/*	let	lastPong = Date.now();
	const pingpong = setInterval(() => {
		ws.ping(null, false, () => {
			if (Date.now() - lastPong > 10000) {
				ws.close(); close();
				clearInterval(pingpong);
			}
			console.log('sended ping ', Date.now() - lastPong);
		});
	}, 3000)

	ws.on('pong', () => {
		lastPong = Date.now();
		console.log('got pong');
	}); */

	switch (req.headers['sec-websocket-protocol']) {
	case 'play': {
	ws.on('message', m => {
		try {
	      	let {type, msg} = JSON.parse(m);
			if (pn)
				if (db.cache[pn]) cat[0].last = Date.now();
				else {
					editDBs.getSyncCat(pn);
					cat[0] = db.cache[pn].game;
					cat[1] = db.cache[pn].game.public;
				}
			switch (type) {
				case 102: {
					pn = ch.existingCookie(msg);
					if (pn <= 0) {ws.close(); return;}

					const c = clients.findIndex(i => i.pn == pn);
					if (!db.cache[pn]) editDBs.getSyncCat(pn);
					if (c != -1) { clients[c].ws.close(4000); clients.splice(c, 1); }
					clients.push({pn: pn, ws: ws, loc: db.cache[pn].game.public.lastPlace[3]});

					cat[0] = db.cache[pn].game;
					cat[1] = db.cache[pn].game.public;
					cat[0].last = Date.now();

					if (!locs.cache[cat[1].lastPlace[3]]) editDBs.getSyncLoc(cat[1].lastPlace[3]);
					if (!locs.cache[cat[1].lastPlace[3]].public.fill.some(x => pn == x))
						locs.cache[cat[1].lastPlace[3]].public.fill.push(pn);
					editDBs.getDB('knowledge.js', (err, data) => {
					if (err) wsSend(7, 'one', `Ошибка!`, ws)
						else {
							wsSend(2, 'one', {pn, known: data.knownPlayers,
										itr: db.cache[pn].game.iteractions,
										name: db.cache[pn].catName,
										clan: db.cache[pn].game.clan}, ws);
							wsSend(3, 'one', {loc: serveLocBeforeSend(cat[1].lastPlace[3])}, ws);
							wsSend(4, 'inloc', [cat[1].lastPlace[3], serveBeforeSend(pn)]);
							wsSend(14, 'inloc', [cat[1].lastPlace[3], {pn, s: 'go'}]);
						}
					}, pn); break;
				}
				case 103: {
					if (!validator.msg(pn, cat, 103, msg)) {ws.close();break;}
					if (cat[0].block & (1 | 2)) {
						if (msg.value[0] - cat[1].lastPlace[0] > 0) cat[1].lastPlace[2] = 1
						else cat[1].lastPlace[2] = 0;
						wsSend(13, 'inloc', [cat[1].lastPlace[3], {pn, o: cat[1].lastPlace[2]}]);
						break;
					}

					clearInterval(control);

					msg.value[1] = msg.value[1] < 0 ? 0 : msg.value[1];
					msg.value[1] = msg.value[1] > 30 ? 30 : msg.value[1];

					const disX = msg.value[0] - cat[1].lastPlace[0], disY = msg.value[1] - cat[1].lastPlace[1],
						dis = Math.round(Math.sqrt(Math.pow(disX, 2) + Math.pow(disY, 2))) * cat[1].speed,
						stepX = disX / 5, stepY = disY / 5;
					if (!locs.cache[cat[1].lastPlace[3]]) editDBs.getSyncLoc(cat[1].lastPlace[3]);
					let	moving, orient = cat[1].lastPlace[2], p = locs.cache[cat[1].lastPlace[3]];

					if (!dis) break;

					for(let j = 0; j < p.paths.length; j++)
						if (p.paths[j][msg.value[0]] >> msg.value[1] & 1) moving = p.paths[j].to;

					msg.value[0] = msg.value[0] < 10 ? 10 : msg.value[0];
					msg.value[0] = msg.value[0] > 150 ? 150 : msg.value[0];

					if (disX > 0) cat[1].lastPlace[2] = 1
					else if (disX < 0) cat[1].lastPlace[2] = 0;

					wsSend(5, 'inloc', [cat[1].lastPlace[3], {pn: pn, s: {dis: dis, oldchunk: cat[1].lastPlace,
						 newchunk: [msg.value[0], msg.value[1], cat[1].lastPlace[2]]}}]);

					let i_total = 0, i_step = dis/5;
					control = setInterval(() => {
						try {
						i_total += i_step;
						if (i_total >= dis) {
							clearInterval(control);
							if (moving) {
								p = locs.cache[cat[1].lastPlace[3]].public.fill;
								p.some((i, j) => {
									if (pn == i) {
										p.splice(j, 1);
										return;
									}
								});
								wsSend(8, 'inloc', [cat[1].lastPlace[3], pn]);
								cat[1].lastPlace = moving.map(a => a);
								editDBs.getLoc(cat[1].lastPlace[3], err => {
									if (err) return;
									locs.cache[cat[1].lastPlace[3]].public.fill.push(pn);

									p = clients.findIndex(i => i.pn == pn);
									if (p != -1) clients[p].loc = cat[1].lastPlace[3];
									wsSend(4, 'inloc', [cat[1].lastPlace[3], serveBeforeSend(pn)]);
									wsSend(3, 'one', {del: true, loc: serveLocBeforeSend(cat[1].lastPlace[3])}, ws);
								});
							}
						} else {
							if (p.disallow[cat[1].lastPlace[0] + stepX] >>
							    msg.value[cat[1].lastPlace[1] + stepY] & 1) console.log('нет');
							cat[1].lastPlace[0] += stepX;
							cat[1].lastPlace[1] += stepY;
						}
						} catch (err) {
							validator.log('105 in play: ' + err);
						}
					}, i_step); break;
				} case 104: {
					if (!validator.msg(pn, cat, 104, msg)) {ws.close(); break;}
					if (!msg.value || !msg.value.replace(/\s/g, '')) break;
					const cmd = command(msg.value, pn);
					if (cmd) return wsSend(7, 'one', cmd, ws);
					msg.value = msg.value.match(/[^\s]{0,30}/g).join(' ');
					msg.value = msg.value.length > 200 ? msg.value.slice(0, 200) + ' ...' : msg.value;
					wsSend(6, 'inloc', [ cat[1].lastPlace[3], { msg: msg.value, pn, }]);
					break;
				} case 108: {
					if (!validator.msg(pn, cat, 108, msg)) {ws.close(); break;}
					if (cat[0].block & 2) break;
					switch (msg.i) {
						case 1:
							cat[0].block = cat[0].block | 1; cat[1].action = msg.i;
							wsSend(10, 'inloc', [cat[1].lastPlace[3], {pn, i: msg.i}]); break;
						case 2:
							if (cat[0].block & 1) {
								cat[0].block = cat[0].block ^ 1; cat[1].action = msg.i;
								wsSend(10, 'inloc', [cat[1].lastPlace[3], {pn, i: msg.i}]);
							} break;
						case -1: {
							if (db.cache[msg.pn]) db.cache[msg.pn].lastUpdate = Date.now()
							else editDBs.getSyncCat(msg.pn);

							if (Date.now() - db.cache[msg.pn].game.last > 18 * 60000)
								wsSend(12, 'one', {add: {pn: msg.pn}, msg: `%catname спит. Не беспокой ${db.cache[msg.pn].game.public.gender ? 'его' : 'её'}.`}, ws)
							else {
								if (cat[0].cantSendRelation.some(x => x == msg.pn)) {
									wsSend(12, 'one', {add: {pn: msg.pn}, msg: `%catname пока что не ответил${db.cache[msg.pn].game.public.gender ? '' : 'a'}` +
									` на прошлое действие`}, ws); break;
								}
								cat[0].isWaitingRelation.push(msg.pn);
								cat[0].cantSendRelation.push(msg.pn);
								db.cache[msg.pn].game.iteractions.push({pn, action: 1});

								const c = clients.findIndex(i => i.pn == msg.pn);
								if (clients[c]) wsSend(10, 'one', {pn, i: msg.i}, clients[c].ws);
							}
						}
					} break;
				} case 106: {
					if (!validator.msg(pn, cat, 106, msg)) {ws.close(); break;}
					cat[0].iteractions.pop();

					if (db.cache[msg.to]) db.cache[msg.to].lastUpdate = Date.now()
					else editDBs.getSyncCat(msg.to);

					if (db.cache[msg.to].game.isWaitingRelation.some((x, i) => {
						if (x == pn) {
							db.cache[msg.to].game.isWaitingRelation.splice(i, 1);
							return true;
						}
					})) {
						const c = clients.findIndex(i => i.pn == msg.to);
						db.cache[msg.to].game.cantSendRelation.splice(db.cache[msg.to].game.cantSendRelation.indexOf(pn), 1);

						if (Date.now() - db.cache[msg.to].game.last > 18 * 60000 || c == -1) {
							wsSend(12, 'one', {add: {pn: msg.to}, msg: `%catname спит, поэтому не услышал${db.cache[msg.to].game.public.gender ? '' : 'a'}` +
							` от тебя ответа. Не беспокой ${db.cache[msg.to].game.public.gender ? 'его' : 'её'}.`}, ws);
							break;
						} if (db.cache[msg.to].game.public.lastPlace[3] != cat[1].lastPlace[3]) {
							wsSend(12, 'one', {add: {pn: msg.to}, msg: '%catname не рядом с тобой.'}, ws); break;
						}

						if (!msg.about) {
							wsSend(12, 'one', {add: {pn}, msg: '%catname не хочет рассказывать о себе'}, clients[c].ws); break;
						}
						const sendedData = {};
						msg.about = Object.keys(msg.about).reduce((a, x) => {
							if (msg.about[x].value) { a[x] = msg.about[x]; return a; }
							return a;
						}, {});
						if (Object.keys(msg.about).length == 0){
							wsSend(12, 'one', {add: {pn}, msg: '%catname не хочет рассказывать о себе'},
							clients[с].ws); break;
						}
						Object.keys(msg.about).forEach(x => {
							sendedData[msg.about[x].i] = {};
							const k = sendedData[msg.about[x].i];
							switch (msg.about[x].i) {
								case 0:
									k.item = 'Это '; k.value = msg.about[x].value; break;
								case 1:
									k.item = 'Племя или группа: '; k.value = msg.about[x].value; break;
							}
						});
						wsSend(11, 'one', {pn, sendedData}, clients[c].ws);
					} break;
				} case 109:
					if (!validator.msg(pn, cat, 109, msg)) {ws.close(); break;}
					editDBs.getDB('knowledge.js', (err, data) => {
						if (err) return wsSend(7, 'one', `Ошибка!`, ws);
						if (Object.keys(data.knownPlayers).length > 100) return wsSend(7, 'one', 'Вы не можете помнить больше ста котиков');
						if (!data.knownPlayers[msg.pn]) data.knownPlayers[msg.pn] = {};
						for (let p in msg.data) {
							if (!msg.data.hasOwnProperty(p)) continue;
							data.knownPlayers[msg.pn][p] = msg.data[p];
						}
						editDBs.setDB('knowledge.js', data, err => {
							if (err) wsSend(7, 'one', `Ошибка`, ws);
						}, pn);
					}, pn); break;
				  case 105:
					if (!cat[1]) {ws.close(); break;}
					wsSend(14, 'inloc', [cat[1].lastPlace[3], {pn, s: 'go'}]); break;
			}
		} catch (err) {
			validator.log(err);
		}
	});
	ws.on('close', reason => {
		if (reason == 4000) return;
		if (!pn || !cat[0] || !cat[1]) return;
		cat[0].last -= 15 * 60000;
		wsSend(14, 'inloc', [cat[1].lastPlace[3], {pn, s: 'doze'}]);
		cat[0].block = cat[0].block & 1;
		clients.splice(clients.findIndex(i => i.pn == pn), 1);
		console.log('Сокет закрылся');
	}); break;
	} case 'talks': {
		ws.on('message', m => {
			try {
		      let {type, msg} = JSON.parse(m);
			if (pn) {
				if (db.cache[pn]) db.cache[pn].lastVisitOfSite = Date.now();
				else editDBs.getSyncCat(pn);
			}
//			console.log(type, msg);
			switch (type) {
				case 102:
					pn = ch.existingCookie(msg); //console.log(pn);
					if (pn <= 0) {ws.close(); return;}
					talkClients.push({pn, ws});
					wsSend(2, 'one', true, ws); break;
				case 103: {
					editDBs.getDB('knowledge.js', (err, known) => {
						if (err) return wsSend(7, 'one', 'Ошибка!', ws);
						known = known.knownPlayers;
						db.cache[pn].talks.sort((a, b) => a.lastActiv < b.lastActiv);
						//console.log(db.cache[pn].talks);
						const t = [];
							//console.log('from ', msg[0], ' to ', msg[1]);
						for (let i = msg[0]; i < msg[1]; i++) {
							if (!db.cache[pn].talks[i]) break;
							const r = editDBs.getSyncTalk(db.cache[pn].talks[i].id, 'info.js', true);
							r.id = db.cache[pn].talks[i].id;
							r.userLastActiv = db.cache[pn].talks[i].userLastActiv;
							t.push(r);
						}
						if (msg[0]) wsSend(11, 'one', {t, max: db.cache[pn].talks.length}, ws)
						else wsSend(3, 'one', {t, known, pn, max: db.cache[pn].talks.length}, ws);
					}, pn); break;
				}
				case 104: {
					editDBs.getTalk(msg[2], 'info.js', (err, data) => {
					if (err) return wsSend(7, 'one', 'Ошибка!', ws);
					if (!data.members.some(a => a == pn)) return wsSend(7, 'one', 'Нет доступа', ws);
					fs.readdir(__dirname + `/databases/talks/${msg[2]}`, (err, dirs) => {
						if (err) return wsSend(7, 'one', 'Ошибка!', ws);
						dirs.splice(dirs.indexOf('info.js'), 1);
						if (dirs.length == 0) return wsSend(4, 'one', null, ws);
						const t = []; let r;
						dirs = dirs.map(x => +x);
						dirs.sort(); dirs.reverse();
						editDBs.getTalk(msg[2], 'info.js', (err, data) => {
						for (let i = msg[0]; i < msg[1]; i++) {
							if (dirs[i] == undefined) break;
							r = editDBs.getSyncTalk(msg[2], dirs[i]);
							r.id = +dirs[i]; if (data.read && data.read[1] < r.id) r.read = data.read;
							t.push(r);
						}
						if (dirs.length > 2000) deleteTalks(dirs.slice(-500));
						wsSend(4, 'one', t, ws);
						});
					});
					}, true); break;
				}
				case 105: {
					editDBs.getTalk(msg.id, 'info.js', (err, data) => {
						if (err) return wsSend(7, 'one', 'Ошибка!', ws);
						msg.sender = pn;
						if (data.members.some(i => i == pn)) {
							if (data.type == 0 && !data.admins.some(i => i == pn)) return wsSend(7, 'one', 'Нет доступа', ws);
							editDBs.setTalk(msg.id, Date.now(), msg, (err, id) => {
								if (err) return wsSend(7, 'one', 'Ошибка!', ws);

								ca.hTalk(msg.id); if (!talks.cache[msg.id].read) talks.cache[msg.id].read = [pn, id - 10];

								const t = db.cache[pn].talks[db.cache[pn].talks.findIndex(a => a.id == msg.id)];
								if (t) t.userLastActiv = Date.now();
								talks.cache[msg.id].lastActiv = Date.now();

								const sendAsync = function(err, cat, catPn, nocached) {
									if (err) return;
									const p = cat.talks[cat.talks.findIndex(j => j.id == msg.id)];
									p.lastActiv = Date.now();
									if (nocached) editDBs.setCat(catPn, cat);
									const c = talkClients.findIndex(j => j.pn == catPn);
									if (c != -1) {
										const r = Object.assign({}, msg);
										r.msgId = id; r.read = true;
										wsSend(5, 'some', r, getWsOf(talkClients[c].pn));
									}
								}
								const s = talks.cache[msg.id].activ < 10;
								for (let i = 0; i < data.members.length; i++ ) {
									if (db.cache[data.members[i]])
										sendAsync(null, db.cache[data.members[i]], data.members[i])
									else {
										editDBs.getCat(data.members[i], (err, cat) => {
											sendAsync(err, cat, data.members[i], s);
										}, s);
									}
								}
							});
						} else return wsSend(7, 'one', 'Нет доступа', ws);
					}); break;
				}
				case 106: {
					editDBs.getDB('knowledge.js', (err, known) => {
						if (err) return wsSend(7, 'one', 'Ошибка!', ws);
						known = Object.keys(known.knownPlayers).map(i => +i);
						for (let i = 0; i < msg.members.length; i++) {
							if (!known.some(j => j == msg.members[i])) {
								validator.log('Несоотвествие данных, отправитель ' + pn + ': \n\n' +
								JSON.stringify(known, msg.members));
								return wsSend(7, 'one', 'Ошибка! Несоответствие данных.', ws);
							}
						}
						msg.members.push(pn);
						const newTalk = ++talks.totalTalks,
							theTalk = {
								img: msg.members.length > 3 ? '/img/talk/5.svg' : '/img/talk/2.svg',
								color: colorsOfTalks[Math.floor(Math.random() * colorsOfTalks.length)],
								type: msg.log,
								name: `Безымянный ${msg.log ? 'диалог' : 'монолог'} №${newTalk}`,
								members: msg.members,
								admins: [pn],
								activ: 0,
								lastActiv: Date.now() - 3000
							};
						fs.mkdir(__dirname + `/databases/talks/${newTalk}`, err => {
							if (err) return wsSend(7, 'one', 'Ошибка!', ws);
							fs.writeFile(__dirname + `/databases/talks/${newTalk}/info.js`, JSON.stringify(theTalk), err => {
								if (err) return wsSend(7, 'one', 'Ошибка!', ws);
								talks.cache[newTalk] = theTalk;
								talks.cache[newTalk].lastUpdate = Date.now();
								theTalk.id = newTalk;
								for (let i = 0; i < msg.members.length; i++) {
									editDBs.getCat(msg.members[i], (err, data) => {
										if (err) return;
										data.talks.push({id: newTalk, userLastActiv: Date.now(), lastActiv: Date.now()});
										const c = talkClients.findIndex(j => j.pn == msg.members[i]);
										if (c != -1) wsSend(6, 'some', theTalk, getWsOf(talkClients[c].pn));
										if (!db.cache[msg.members[i]]) editDBs.setCat(msg.members[i], data);
									}, true);
								}
							});
						});
					}, pn); break;
				}
				case 107: {
					const t = db.cache[pn].talks[db.cache[pn].talks.findIndex(a => a.id == msg.id)];
					if (t) {
						t.userLastActiv = Date.now();
						editDBs.getTalk(msg.id, 'info.js', (err, data) => {
							if (!data.read || data.read[0] == pn || err) return;
							const c = talkClients.findIndex(j => j.pn == data.read[0]);
							if (c != -1) wsSend(8, 'some', [msg.id,data.read[1]], getWsOf(talkClients[c].pn));
							delete data.read;
							editDBs.setTalk(msg.id, 'info.js', data);
						});
					}
					break;
				}
				case 108:
					editDBs.getTalk(msg.id, 'info.js', (err, data) => {
						if (err) return;
						for (let i = 0; i < data.members.length; i++) {
							const c = talkClients.findIndex(j => j.pn == data.members[i]);
							if (c != -1) wsSend(9, 'some', [msg.id, pn, msg.alias], getWsOf(talkClients[c].pn));
						}
					}, talks.cache[msg.id] ? talks.cache[msg.id].activ < 10 : true); break;
				case 109:
					editDBs.getTalk(msg.id, 'info.js', (err, data) => {
						if (err) return wsSend(7, 'one', 'Ошибка!', ws);
						if (!msg.name.replace(/\s+/g,'')) delete msg.name;
						for (let p in msg) {
							if (!msg.hasOwnProperty(p) || p == 'id') continue;
							data[p] = msg[p];
						}
						editDBs.setTalk(msg.id, 'info.js', data, err => {
							if (err) wsSend(7, 'one', 'Ошибка!', ws)
							else wsSend(10, 'one', 'Изменено', ws);
							//отправить всем участникам что данные изменились
						});
					});
			}
			} catch (err) {
				validator.log(err);
			}
		});
		ws.on('close', () => {
			const c = talkClients.findIndex(a => a.ws == ws);
			if (c != -1) talkClients.splice(c, 1);
		});
	}
	}
});

function findClient(pn) {
      if (!pn || pn <= 0) return -2;
      let i = 0;
      for(; i < clients.length; i++) {
      	if (clients[i].pn == pn) return i;
      }
      return -1;
}

function command(text, pn) {
	try {
	if (/admin/.test(db.cache[pn].role)) {
	switch (text) {
		case '$номер локации': return db.cache[pn].game.public.lastPlace[3];
	}}} catch (err) {
		validator.log(`command(text, pn):\nerr: ${err}\ntext: ${text}\npn: ${pn}`);
	}
}

function getWsOf(pn, type) {
	const all = [];
	switch (type) {
		default:
			talkClients.forEach(a => {
				if (a.pn == pn) all.push(a.ws);
			});
	}
	return all;
}

function deleteTalks(id, arr) {
	function c(i) {
		fs.unlink(__dirname + `/databases/talks/${id}/${i}`, err => {
			if (err) validator.log(`id: ${id}, arr: ${arr}\n${err}`);
		});
	}
	if (typeof arr == 'object') arr.forEach(c)
	else c(arr);
}

function wsSend(type, range, data, ws) {
	switch (range) {
		case 'one':
			if (ws.readyState === WebSocket.OPEN) {
				 ws.send(JSON.stringify({
					type: type,
					data: data,
				}));
			} break;
		case 'some':
			for (let i = 0; i < ws.length; i++) {
				if (ws[i].readyState === WebSocket.OPEN) {
					ws[i].send(JSON.stringify({
						type: type,
						data: data,
					}));
				}
			} break;
		case 'inloc':
			if (locs.cache[data[0]]) locs.cache[data[0]].lastUpdate = Date.now();
            	for(let j = 0; j < clients.length; j++) {
            		if (clients[j].loc == data[0] && clients[j].ws.readyState === WebSocket.OPEN) {
					clients[j].ws.send(JSON.stringify({
                        		type: type,
						data: data[1],
                  		}));
			}} break;
		case 'all': break;
	}
}

function serveMoons(pn, string) {
	const moon_or_moons = (m) => {
		let string = 'лун';
		m = m % 100;
		if (m > 10 && m < 20) return string;
		m = m % 10;
		switch (m) {
			case 0:; case 5:; case 6:;
			case 7:; case 8:; case 9: break;
			case 1: { string = 'луна'; break; }
			case 2:; case 3:; case 4: { string = 'луны'; break;}
		}
		return string;
	}
	if (!db.cache[pn]) editDBs.getSyncCat(pn);
	const moons = (other.time - db.cache[pn].game.public.birth) / 60 / 60 / 60;
	if (string) {
		const floorMoons = Math.floor(moons),
			rus = moon_or_moons(floorMoons),
			pie = moons - floorMoons;
		if (floorMoons == 0) return 'меньше одной луны'
		else if (pie == 0) return `${floorMoons} ${rus === 'луна' ? 'полная' : 'полных'} ${rus}`
		else if (pie <= 1/4) return `четверть ${floorMoons + 1}-ой луны`
		else if (pie <= 1/3) return `треть ${floorMoons + 1}-ой луны`
		else if (pie <= 1/1.5) return `половина ${floorMoons + 1}-ой луны`
		else return `почти ${floorMoons + 1} ${rus}`;
	}
	return moons;
}

function serveBeforeSend(pn, update) {
	let t, m = serveMoons(pn), size = 0.2;

	if (!db.cache[pn]) editDBs.getSyncCat(pn);
	if (Date.now() - db.cache[pn].game.last < 15 * 60000) t = 'go'
	else if (Date.now() - db.cache[pn].game.last < 18 * 60000) t = 'doze'
	else t = 'sleep';

	if (m <= 12) size += m / 12 * 0.4
	else size += 0.4 + (m - 12) / 188 * 0.1;

	if (update) return {status: t, moons: serveMoons(pn, true), size};
	return Object.assign({},
		 db.cache[pn].game.public,
		 {pn, status: t, moons: serveMoons(pn, true),size});
}

function serveLocBeforeSend(loc) {
	if (!locs.cache[loc]) editDBs.getSyncLoc(loc);
	const q = locs.cache[loc].public.fill.map((x, i) => serveBeforeSend(x)),
		w = Object.assign({}, locs.cache[loc].public);
	w.fill = q;
	return w;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function sendJSON(res, answ) {
	res.setHeader('content-type', 'application/json;charset=utf-8');
	res.end(JSON.stringify(answ));
}

function afterCheckCookie(res, answ) {
	res.setHeader('content-type', 'application/json;charset=utf-8');
	res.end(JSON.stringify(answ));
}

function error500(res, text = 'Произошла ошибка на стороне сервера :(', code = 500) {
	res.statusCode = code;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end(text);
}

function error404(res) {
	res.statusCode = 404;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end('Не найдено');
}


function getStaticFile(res, path, json, contentType) {
	if (json) {
		res.setHeader('content-type', 'application/json; charset=utf-8');
		fs.access(__dirname + path, fs.constants.F_OK, err => {
			if (err) {
				res.statusCode = 404;
				return res.end(JSON.stringify({ res: 0 }));
			}
			fs.readFile(__dirname + path, 'utf8', (err, data) => {
				if (err) {
					res.end(JSON.stringify({ res: 0 }));
					validator.log('getStaticFile: ' + err);
				} else res.end(JSON.stringify({ res: 1, data: data, add: json }));
			});
		});
	} else {
		fs.access(__dirname + path, fs.constants.F_OK, err => {
			if (err) return error404(res);
			fs.readFile(__dirname + path, (err, data) => {
				if (err) {
					error500(res, 'Произошла ошибка на стороне сервера.');
					validator.log('getStaticFile: ' + err);
				} else {
					res.setHeader('content-type', contentType + ';charset=utf-8');
					res.end(data);
				}
			});
		});
	}
}
/*
function addDevice(pn, req) {
	if (!db.cats[pn]) return;
	let d = req.headers['user-agent'].match(/\((.*?)\)/);
	if (d) {
		d = d[0];
		let l = db.cats[pn].devices.length, j = 0;
		for(; j < l; j++) {
			if (db.cats[pn].devices[j] === d) break;
		}
		if (j == l) {
			db.cats[pn].devices.push(d);
			editDBs.save('db');
			return 1;
		}
	}
}
*/
