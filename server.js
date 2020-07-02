'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	{db, locs, other, editDBs} = require('./databases/launch.js'),
	validator = require('./lib/validators.js'),
	ch = require('./lib/cookie.js').include(db, validator),
	cw = require('./lib/creating_world.js').include(db, locs, validator, editDBs),
	queens = {
		['племя Теней']: [[2, 1]],
		['племя Ветра']: [[5, 1]],
		['Речное племя']: [[4, 1]],
		['Грозовое племя']: [[3, 1]],
		['одиночка']: [[6, 1]],
		['домашний котик']: [[6, 1]],
	};
/*
editDBs.changeEveryCat(cat => {
	try {
		delete cat.lastUpdate;
		return [null, cat];
	} catch (err) {
		return [err];
	}
});
*/
setInterval(() => {
	++other.time;
}, 1000);


setInterval(() => {
	editDBs.save('other');
}, 1800000);

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
			sendCrJSON({ cr: 0, res: 'некорректные данные'} );
			return;
		}

		for(let i = 1; i <= db.totalCats; i++) {
			if (db.cats[i].passwords === rawData.password) {
				sendCrJSON({ res: 'придумайте другой пароль', cr: 0 });
				return;
			}
		}

		//Создай проверку на то, что девайсы && ip совпадают
		c = ch.existingCookie(req.headers.cookie, rawData);
		if (c < 0) {
			didInfr('creatingTwoChar', -c);
		      sendCrJSON({ cr: 0, res: `<span class="lower-text">У Вас уже есть персонаж по имени ${db[-c].catName}. ` +
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
					tmp: { dontChooseCharacter: true, haventGotParents: true }
				}

				ch.setCookie({alias: rawData.alias, password: rawData.password}, res, true);
				db.cache[pnNewCat] = newCat;
				editDBs.save('db'); //удалить потом
				editDBs.setCat(pnNewCat, newCat, err => {
					if (err) { sendJSON(res, {cr: 0, res: 'неожиданная ошибка сервера...'}); return; }
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
					inh = data;
					if (validator.cch(fromUser, Object.assign({}, inh), cchh, pn)) {
						cch.createCharacter(pn, fromUser)
						cch.once('finishCreateCharacter', (err, path) => {
							if (err) sendJSON(res, { res: 0 });
							else {
								const forCache = err => {
									if (err) {sendJSON(res, { res: 0 }); return;}
									db.cache[pn].game.public.skin = path;
									delete db.cache[pn].tmp.dontChooseCharacter;
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
					} else sendJSON(res, { res: 0 });
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
		res.end('Слишком тяжелый файл (более 1-го Мбайта)');
	}
	let form = new formidable.IncomingForm();
	form.parse(req, (err, fields, files) => {
		if(err) error500(res, 'Произошла ошибка на стороне сервера. Error in download, part of formidable.');
		if(files.photo.size > 1048576) {
			res.statusCode = 400;
			res.setHeader('content-type', 'text/plain; charset=utf-8')
			res.end('Слишком тяжелый файл (более 1-го Мбайта)');
		}
		fs.readFile(files.photo.path, (err, data) => {
			if(err) error500(res, 'Произошла ошибка на стороне сервера. Error in download, part of server.')
			else fs.writeFile(__dirname + fields.path + files.photo.name, data, (err) => { if (err) error500(res) });
		});
		getStaticFile(res, '/index.html', null, 'text/html');
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
				case '/crnewloc': cw.addLocation(res, body, __dirname); break;
				case '/scch': createOC(body, res, pn); break;
				case '/addpath': cw.addPath(res, body); break;
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
		if (/creater/.test(p)) getStaticFile(res, '/requires/cw.html', [-350, -280, '/js/cw.js'])
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

	if (req.method === 'GET') {
		switch(path) {
			case '/':
				getStaticFile(res, '/index.html', null, 'text/html'); break;
			case '/favicon.ico':
				getStaticFile(res, '/favicon.ico', null, 'image/vnd.microsoft.icon'); break;
			case '/css/style.css':
				getStaticFile(res, '/css/style.css', null, 'text/css'); break;
			case '/css/styleGame.css':
				getStaticFile(res, '/css/style_game.css', null, 'text/css'); break;
			case '/js/handlerRequires.js':
				getStaticFile(res, '/js/handler_requires.js', null, 'application/javascript'); break;
			case '/js/play.js':
				getStaticFile(res, '/js/play.js', null, 'application/javascript'); break;
			case '/js/cch.js':
				getStaticFile(res, '/js/cch.js', null, 'application/javascript'); break;
			case '/js/cch_inh.js':
				getStaticFile(res, '/js/cch_inh.js', null, 'application/javascript'); break;
			case '/js/cw.js':
				getStaticFile(res, '/js/cw.js', null, 'application/javascript'); break;
			case '/js/cw_no_creater.js':
				getStaticFile(res, '/js/cw_no_creater.js', null, 'application/javascript'); break;
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
						res.setHeader('set-cookie', [`timeauth=${db.cache[c].cookie};max-age=20`,
										     `timealias=${encodeURI(db.cache[c].alias)};max-age=20`]);
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
			case '/getocw':
				let objsExNames;
				cw.getNamesExDetails(__dirname);
				cw.once('finishGetNamesExDetails', (err, e) => {
					if (err) return sendJSON(res, {res: 0});
					objsExNames = e;
					cw.getNamesDetails(__dirname);
					cw.once('finishGetNamesDetails', (err, f) => {
						if (err) return sendJSON(res, {res: 0});
						const sendedData = {
							objsExNames,
							objsNames: f,
							texsNames: locs.texs,
						}
						if (/creater/.test(p)) {
							sendedData.locsnames = cw.getLocsName();
							sendJSON(res, {res: 1, data: sendedData});
						} else sendJSON(res, {res: 1, data: sendedData});
					});
				});
				break;
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
			case '/img/cch/':
				getStaticFile(res, `/img/cch/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/cch/patt/':
				getStaticFile(res, `/img/cch/patt/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/cch/wht/':
				getStaticFile(res, `/img/cch/wht/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/textures/':
				getStaticFile(res, `/img/textures/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/details/':
				if (!n) { error404(res); break; }
				if (n.length == 1) getStaticFile(res, `/img/details/${n[0]}.svg`, null, 'image/svg+xml')
				else if (n.length == 2) getStaticFile(res, `/img/details/${n[0]}/${n[1]}.svg`, null, 'image/svg+xml'); break;
			case '/img/players/':
				if (n) getStaticFile(res, `/img/players/${n[0]}.svg`, null, 'image/svg+xml')
				else error404(res); break;
			case '/css/img/button.png':
				getStaticFile(res, '/css/img/button.png', null, 'image/png'); break;
			case '/img/indev.svg':
				getStaticFile(res, '/img/indev.svg', null, 'image/svg+xml'); break;
			case '/img/preloader.svg':
				getStaticFile(res, '/img/preloader.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowarrow.svg':
				getStaticFile(res, '/css/img/lowarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowlightarrow.svg':
				getStaticFile(res, '/css/img/lowlightarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/arrow.svg':
				getStaticFile(res, '/css/img/arrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lightarrow.svg':
				getStaticFile(res, '/css/img/lightarrow.svg', null, 'image/svg+xml'); break;
			case '/css/img/lowMsg.png':
				getStaticFile(res, '/css/img/lowMsg.png', null, 'image/png'); break;
			case '/css/img/line.png':
				getStaticFile(res, '/css/img/line.png', null, 'image/png'); break;
			case '/css/img/verticalLine.png':
				getStaticFile(res, '/css/img/vertical_line.png', null, 'image/png'); break;
			case '/css/img/head.jpg':
				getStaticFile(res, '/css/img/head.jpg', null, 'image/jpg'); break;
			case '/dac':
				ch.deleteCookie(res); break;
			default: error404(res); break;
		}
	}
	if (req.method === 'POST') {
		const contentLength = req.headers['content-length'];
			switch (path) {
				case '/dlf':
					if (/admin/.test(p)) download(req, res, contentLength)
					else validator.log('${c} пытался отправить POST ${path}'); break;
				case '/cc':
					if (c == 0) getJSON(req, res, contentLength, path)
					else validator.log('${c} пытался отправить POST ${path}'); break;
				case '/ac':
					if (c <= 0) getJSON(req, res, contentLength, path)
					else validator.log('${c} пытался отправить POST ${path}'); break;
				case '/ar':
					getJSON(req, res, contentLength, path, c); break;
				case '/crnewloc':
					if (/creater/.test(p)) getJSON(req, res, contentLength, path)
					else validator.log('${c} пытался отправить POST ${path}'); break;
				case '/addpath':
					if (/creater/.test(p)) getJSON(req, res, contentLength, path)
					else validator.log('${c} пытался отправить POST ${path}'); break;
				case '/scch':
					if (c > 0 && db.cache[c].tmp.dontChooseCharacter) getJSON(req, res, contentLength, path, c); break;
		}
	}
}
} catch (err) {
	validator.log('внутри .server()' + err);
}}).listen(process.env.PORT || 8080, () => console.log('Server is running'));

const WebSocket = require('ws'),
	wss = new WebSocket.Server({ server }),
	clients = [];

wss.on('connection', (ws) => {
	let	pn = null, c = null, cat = [null, null], control = null;

	ws.on('message', (m) => {
		try {
	      	let {type, msg} = JSON.parse(m);
			switch (type) {
				case 102: {
					pn = ch.existingCookie(decodeURI(msg.token));
					c = findClient(pn);
					if (c == -2) {ws.close(); break;}
					if (!db.cache[pn]) editDBs.getSyncCat(pn);
					if (c == -1) clients.push({pn: pn, ws: ws, loc: db.cache[pn].game.public.lastPlace[3]});
					if (c >= 0) clients[c].ws = ws;

					cat[0] = db.cache[pn].game;
					cat[1] = db.cache[pn].game.public;
					cat[0].last = Date.now();

					if (!locs.cache[cat[1].lastPlace[3]]) editDBs.getSyncLoc(cat[1].lastPlace[3]);
					if (!locs.cache[cat[1].lastPlace[3]].public.fill.some(x => pn == x))
								locs.cache[cat[1].lastPlace[3]].public.fill.push(pn);
					wsSend(2, 'one', {pn, itr: db.cache[pn].game.iteractions, name: db.cache[pn].catName, clan: db.cache[pn].game.clan}, ws);
					wsSend(3, 'one', {loc: serveLocBeforeSend(cat[1].lastPlace[3])}, ws);
					wsSend(4, 'inloc', [cat[1].lastPlace[3], serveBeforeSend(pn)]);break;
				} case 103: {
					if (!validator.msg(pn, cat, 103, msg)) {ws.close();break;}
					if (cat[0].block & (1 | 2)) {
						if (msg.value[0] - cat[1].lastPlace[0] > 0) cat[1].lastPlace[2] = 1
						else cat[1].lastPlace[2] = 0;
						wsSend(13, 'inloc', [cat[1].lastPlace[3], {pn, o: cat[1].lastPlace[2]}]);
						break;
					}

					clearTimeout(control);

					const disX = msg.value[0] - cat[1].lastPlace[0], disY = msg.value[1] - cat[1].lastPlace[1],
						dis = Math.round(Math.sqrt(Math.pow(disX, 2) + Math.pow(disY, 2))) * cat[1].speed,
						stepX = disX / 5, stepY = disY / 5;
					let	moving = null, orient = cat[1].lastPlace[2], p = locs.cache[cat[1].lastPlace[3]].paths;

					if (!dis) break;

	           			for(let j = 0; j < p.length; j++) {
	           				if (p[j].minChunk[0] <= msg.value[0] && p[j].maxChunk[0] >= msg.value[0] &&
	           				p[j].minChunk[1] <= msg.value[1] && p[j].maxChunk[1] >= msg.value[1]) {
							moving = p[j].to.map(i => i);
	                                    break;
	           				}
	           			}

					msg.value[0] = msg.value[0] < 20 ? 20 : msg.value[0];
					msg.value[0] = msg.value[0] > 140 ? 140 : msg.value[0];
					msg.value[1] = msg.value[1] < 0 ? 0 : msg.value[1];
					msg.value[1] = msg.value[1] > 30 ? 30 : msg.value[1];

					if (disX > 0) cat[1].lastPlace[2] = 1
					else if (disX < 0) cat[1].lastPlace[2] = 0;

					wsSend(5, 'inloc', [cat[1].lastPlace[3], {pn: pn, s: {dis: dis, oldchunk: cat[1].lastPlace,
						 newchunk: [msg.value[0], msg.value[1], cat[1].lastPlace[2]]}}]);

					//это нормально, что контроль в глобальной области и постоянно переписывается?
					for(let i = 0; i < dis; i += dis/5) {
						control = setTimeout(() => {
							cat[1].lastPlace[0] += stepX;
							cat[1].lastPlace[1] += stepY;
							if (i + dis/5 >= dis && moving) {
								p = locs.cache[cat[1].lastPlace[3]].public.fill;
								p.some((i, j) => {
									if (pn == i) {
										p.splice(j, 1);
										return;
									}
								});
								wsSend(8, 'inloc', [cat[1].lastPlace[3], pn]);
								cat[1].lastPlace = moving;
								p = findClient(pn);
								if (p >= 0) {
									clients[p].loc = cat[1].lastPlace[3];
									if (!locs.cache[cat[1].lastPlace[3]]) editDBs.getSyncLoc(cat[1].lastPlace[3]);
									locs.cache[cat[1].lastPlace[3]].public.fill.push(pn);
									wsSend(4, 'inloc', [cat[1].lastPlace[3], serveBeforeSend(pn)]);
									wsSend(3, 'one', {del: true, loc: serveLocBeforeSend(cat[1].lastPlace[3])}, ws);
								} else ws.close();
							}

						}, i);
					} break;
				} case 104: {
					if (!validator.msg(pn, cat, 104, msg)) {ws.close(); break;}
					if (!msg.value || !msg.value.replace(/\s/g, '')) break;
					msg.value = msg.value.match(/[^\s]{0,30}/g).join(' ');
					msg.value = msg.value.length > 200 ? msg.value.slice(0, 200) + ' ...' : msg.value;
					wsSend(6, 'inloc', [ cat[1].lastPlace[3], { msg: msg.value, pn, }]);
					break;
				} case 107: {
					if (!validator.msg(pn, cat, 107, msg)) {ws.close(); break;}
					editDBs.getDB('knowledge.js', (err, data) => {
						if (err) wsSend(7, 'one', `Ошибка!`, ws)
						else wsSend(9, 'one', data.knownPlayers, ws);
					}, pn); break;
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
						case -1:
							if (cat[0].cantSendRelation.some(x => x == msg.pn)) {
								wsSend(12, 'one', {add: {pn: msg.pn}, msg: `%catname пока что не ответил${db.cache[msg.pn].game.public.gender ? '' : 'a'}` +
								` на прошлое действие`}, ws); break;
							}
							cat[0].isWaitingRelation.push(msg.pn);
							cat[0].cantSendRelation.push(msg.pn);
							db.cache[msg.pn].game.iteractions.push({pn, action: 1});
							wsSend(10, 'one', {pn, i: msg.i}, clients[findClient(msg.pn)].ws);
					} break;
				} case 106: {
					if (!validator.msg(pn, cat, 106, msg)) {ws.close(); break;}
					cat[0].iteractions.pop();
					if (db.cache[msg.to].game.isWaitingRelation.some((x, i) => {
						if (x == pn) {
							db.cache[msg.to].game.isWaitingRelation.splice(i, 1);
							return true;
						}
					})) {
						db.cache[msg.to].game.cantSendRelation.splice(db.cache[msg.to].game.cantSendRelation.indexOf(pn), 1);
						if (!msg.about) { wsSend(12, 'one', {add: {pn}, msg: '%catname не хочет рассказывать о себе'}, clients[findClient(msg.to)].ws); break; }
						const sendedData = {};
						msg.about = Object.keys(msg.about).reduce((a, x) => {
							if (msg.about[x].value) { a[x] = msg.about[x]; return a; }
							return a;
						}, {});
						if (Object.keys(msg.about).length == 0){
							wsSend(12, 'one', {add: {pn}, msg: '%catname не хочет рассказывать о себе'},
							clients[findClient(msg.to)].ws); break;
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
						wsSend(11, 'one', {pn, sendedData}, clients[findClient(msg.to)].ws);
					} break;
				} case 109: {
					if (!validator.msg(pn, cat, 109, msg)) {ws.close(); break;}
					editDBs.getDB('knowledge.js', (err, data) => {
						if (err) { wsSend(7, 'one', `Ошибка!`, ws); return; }
						if (Object.keys(data.knownPlayers).length > 100) { wsSend(7, 'one', 'Вы не можете помнить больше ста котиков'); return; }
						for (let p in msg.data) {
							if (!msg.data.hasOwnProperty(p)) continue;
							data.knownPlayers[msg.pn][p] = msg.data[p];
						}
						editDBs.setDB('knowledge.js', data, err => {
							if (err) wsSend(7, 'one', `Ошибка`, ws);
						}, pn);
					}, pn);
				}
			}
		} catch (err) {
			validator.log(err);
		}
	});
	ws.on('close', () => {
		console.log('Сокет закрылся');
	});
});

function findClient(pn) {
      if (!pn || pn <= 0) return -2;
      let i = 0;
      for(; i < clients.length; i++) {
      	if (clients[i].pn == pn) return i;
      }
      return -1;
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
		case 'inloc':
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
	let t, m = serveMoons(pn), size = 0.3;

	if (!db.cache[pn]) editDBs.getSyncCat(pn);
	if (Date.now() - db.cache[pn].game.last < 15 * 60000) t = 'go'
	else if (Date.now() - db.cache[pn].game.last < 20 * 60000) t = 'doze'
	else t = 'sleep';

	if (m <= 12) size += m / 12 * 0.5
	else size += 0.5 + (m - 12) / 188 * 0.2;

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
