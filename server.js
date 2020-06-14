'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	{db, world, other, editDBs} = require('./databases/launch.js'),
	ch = require('./lib/cookie.js').include(db),
	cw = require('./lib/creating_world.js').include(db, world);

setInterval(() => {
	++other.time;
}, 1000);

setInterval(() => {
	editDBs.save('other');
	editDBs.save('cats');
}, 60000);

function createCharacter(rawData, req, res) {
	function sendCrJSON(answ) {
		res.setHeader('content-type', 'application/json;charset=utf-8');
		res.end(JSON.stringify(answ));
	}
	if (!rawData) { sendCrJSON({ cr: 0, res: 'некорректные данные'} ); return; }
	let lastCat = db.info.totalCats,
	regCatName = rawData.catName.match(/[а-яА-Яё]+/g),
	regAlias = rawData.alias.match(/[a-zA-Zа-яА-Яё\d]+/g),
	regPass = rawData.password.match(/[\wа-яА-Яё\-\d]+/);

      if (regCatName && regCatName.length == 2) regCatName = regCatName.join(' ');
      if (regCatName && regCatName.length == 1) regCatName = regCatName[0];
      if (regPass) regPass = regPass[0];
      if (regAlias) regAlias = regAlias.join(' ');

	const a = rawData.catName.length < 2 || rawData.catName.length > 32,
	b = rawData.alias.length < 2 || rawData.alias.length > 32 || rawData.password.length < 6 || rawData.password.length > 32,
	c = regCatName !== rawData.catName || regAlias !== rawData.alias || regPass !== rawData.password;

	if (!(regCatName && regAlias && regPass) || a || b || c) sendCrJSON({ cr: 0, res: 'некорректные данные'} )
	else {
		let i = 1;
		for(; i <= lastCat; i++) {
			if (db.cats[i].catName.toLowerCase() === rawData.catName.toLowerCase()) break;
       	}
		if (i <= lastCat) sendCrJSON({ cr: 0, res: 'персонаж с таким именем уже существует'} )
		else {
			i = 1;
			for(; i <= lastCat; i++) {
				if (db.cats[i].password === rawData.password) break;
			}
			if (i <= lastCat) sendCrJSON({ res: 'придумайте другой пароль', cr: 0 })
			else { //Создай проверку на то, что девайсы && ip совпадают
				const c = ch.existingCookie(req.headers.cookie, rawData);
				if (c < 0) {
					didInfr('creatingTwoChar', -c);
	      			sendCrJSON({ cr: 0, res: `<span class="lower-text">У Вас уже есть персонаж по имени ${db[-c].catName}. ` +
					`Создание сразу двух и более персонажей запрещено, поэтому, если продолжите попытки создания нового персонажа, ` +
					`${db[-c].catName} будет заблокирован и нового создать Вы не сможете. Чтобы создать нового персонажа, нужно удалить старого.</span>` });
				}
				else {
					const cNewCat = ch.generateCookie(),
						pnNewCat = ++db.info.totalCats;
					let	clan = Math.floor(Math.random() * 7);
					let	die = 120 + Math.floor(Math.random() * 31);
					if (Math.floor(Math.random() * 10) == 7) die = 150 + Math.floor(Math.random() * 51);
					die = other.time + die * 150 * 24 * 60;
					switch (clan) {
						case 0: clan = 'Грозовое племя'; break;
						case 1: clan = 'Речное племя'; break;
						case 2: clan = 'племя Теней'; break;
						case 3: clan = 'племя Ветра'; break;
						case 4: clan = 'одиночка'; break;
						case 5: clan = 'домашняя киска'; break;
						case 6: clan = 'Клан Падающей Воды'; break;
					}
					db.cats[pnNewCat] = {
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
								lastPlace: [20, 0, 0, 4],
								birth: other.time,
							},
							die,
							lastActiv: Date.now() - 15 * 60001,
							block: 0,
							isWaitingRelation: [],
							cantSendRelation: [],
							clan,
						}
					};
					editDBs.save('db');
					ch.setCookie({alias: rawData.alias, password: rawData.password}, res, true);
					fs.mkdir(__dirname + `/databases/hard/${pnNewCat}`, (err) => {
						if (err) console.log(err) //лог
						else {
							fs.writeFile(__dirname + `/databases/hard/${pnNewCat}/knowledge.js`, JSON.stringify({knownPlayers: {}}), (err) => {
								if (err) console.log(err) //log
								else sendCrJSON({ res: 'Персонаж создан! Нажмите сюда, чтобы активировать его', cr: 1});
							});
						}
					});
				}
			}
		}
	}
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

function getJSON(req, res, contentLength, cmd) {
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
		body = JSON.parse(body);
		switch (cmd) {
			case '/ac': ch.setCookie(body, res); break;
			case '/cc': createCharacter(body, req, res); break;
			case '/ar': parseAnotherRequest(body.require, res, req); break;
			case '/crnewloc': cw.addLocation(res, body, __dirname, editDBs); break;
		}
	});
}

function parseAnotherRequest(require, res, req) {
	const c = ch.existingCookie(req.headers.cookie),
		p = db.cats[c] ? db.cats[c].role : null;
	if (require === 'зфнс') {
		if (c > 0) {
			if (/admin/.test(p)) getStaticFile(res, '/requires/load.html', [-200, -200])
			else afterCheckCookie(res, {res: 2}); //нет прав
		} else afterCheckCookie(res, {res: 0}); //персонаж не активирован
	} else if (require === 'тм' || /творить мир/i.test(require)) {
		if (/creater/.test(p)) getStaticFile(res, '/requires/creating_world.html', [-350, -280])
		else getStaticFile(res, '/requires/creating_world_no_creater.html', [-350, -280]);
/*		if (c > 0) {
			if (/creater/.test(p)) getStaticFile(res, '/requires/creating_world.html', [-350, -280])
			else afterCheckCookie(res, {res: 2});
		} else afterCheckCookie(res, {res: 0}); */
	}  else afterCheckCookie(res, {res: 3}) //попробуйте что-нибудь другое
}

function didInfr(type, pn) {
	if (db.cats[pn].infractions[type]) db.cats[pn].infractions[type] += 1
	else db.cats[pn].infractions[type] = 1;
	editDBs.save('db');
}

const server = http.createServer((req, res) => {
	let path = req.url.match(/\/{1}[\w\d\.\/_]*/i), n = null;

	//req.connection.remoteAddress || req.headers['x-forwarded-for'];

	if (path) {
		path = path[0];
		if (path.startsWith('/img/')) {
			n = path.match(/\d+/g);
			if (n && n.length < 3) path = path.replace(/\d+.*/, '')
			else n = null;
		}
	} else path = '/';

	const c = ch.existingCookie(req.headers.cookie || ''),
		p = c > 0 ? db.cats[c].role : null;
	if (c > 0) db.cats[c].lastVisitOfSite = Date.now();

	if (req.method === 'GET') {
//		console.log(req.url);
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
			case '/play':
				if (c > 0) {
					res.setHeader('set-cookie', [`timeauth=${db.cats[c].cookie};max-age=10`,
									     `timealias=${encodeURI(db.cats[c].alias)};max-age=10`]);
					getStaticFile(res, '/play.html', null, 'text/html');
				}
				else getStaticFile(res, '/requires/error_play.html', null, 'text/html'); //возможно лучше через json
				break;
			case '/creating':
				if (c > 0) {
					afterCheckCookie(res, {res: 0}); //нет
				} else if (c < 0) {
					afterCheckCookie(res, {res: 2, catName: db.cats[-c].catName}); //нет, предупреждение
					didInfr('creatingTwoChar', -c);
				} else getStaticFile(res, '/requires/creating.html', 'json'); break; //да
			case '/load':
				if (/admin/.test(p)) getStaticFile(res, '/requires/load.html', null, 'text/html')
				else error404(res); break;
/*			case '/world':
				if (/creater/.test(p)) getStaticFile(res, '/requires/creating_world.html', null, 'text/html')
				else getStaticFile(res, '/requires/creating_world_no_creater.html', null, 'text/html'); break; */
			case '/activ':
				if (c <= 0) getStaticFile(res, '/requires/activ.html', 'json') //да
				else afterCheckCookie(res, {res: 2, catName: db.cats[c].catName}); break; //уже активировaн
			case '/getocw':
				let objsExNames;
				cw.getNamesExDetails(__dirname);
				cw.once('finishGetNamesExDetails', (err, e) => {
					if (err) return; //логинируй
					objsExNames = e;
					cw.getNamesDetails(__dirname);
					cw.once('finishGetNamesDetails', (err, f) => {
						if (err) return; //логинируй
						if (/creater/.test(p)) {
							getStaticFile(res, '/requires/creating_world_after.html', {
								locsnames: cw.getLocsName(),
								objsExNames,
								objsNames: f,
								texsNames: world.info.texs,
							});
						} else {
							getStaticFile(res, '/requires/creating_world_after_no_creater.html', {
								objsExNames,
								objsNames: f,
								texsNames: world.info.texs,
							});
						}
					});
				});
				break;
			case '/img/textures/':
				getStaticFile(res, `/img/textures/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/details/':
				if (!n) break;
				if (n.length == 1) getStaticFile(res, `/img/details/${n[0]}.svg`, null, 'image/svg+xml')
				else if (n.length == 2) getStaticFile(res, `/img/details/${n[0]}/${n[1]}.svg`, null, 'image/svg+xml'); break;
			//на сервере фактический адрес должен быть /img/players/[pn игрока]/0.svg...1.svg...2.svg и т.д.
			//на всякий случай проверь c > 0
			case '/img/players/': //!!!
				getStaticFile(res, `/img/players/${n}.svg`, null, 'image/svg+xml'); break;
			case '/css/img/button.png':
				getStaticFile(res, '/css/img/button.png', null, 'image/png'); break;
			case '/img/indev.svg':
				getStaticFile(res, '/img/indev.svg', null, 'image/svg+xml'); break;
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
					if (/admin/.test(p)) download(req, res, contentLength); break;
				case '/cc':
					if (c == 0) getJSON(req, res, contentLength, path); break;
				case '/ac':
					if (c <= 0) getJSON(req, res, contentLength, path); break;
				case '/ar':
					getJSON(req, res, contentLength, path); break;
				case '/crnewloc':
					if (/creater/.test(p)) getJSON(req, res, contentLength, path); break;
		}
	}
}).listen(process.env.PORT || 8080, () => console.log('Server is running'));

const WebSocket = require('ws'),
	wss = new WebSocket.Server({ server }),
	clients = [];

wss.on('connection', (ws) => {
	const timeofc = Date.now();
	let	pn = null, c = null, cat = [null, null], control = null;

	ws.on('message', (m) => {
		try {
	      	let {type, msg} = JSON.parse(m);
			switch (type) {
				case 102: {
					pn = ch.existingCookie(decodeURI(msg.token));
					c = findClient(pn);
					if (c == -2) {ws.close(); break;}
					if (c == -1) clients.push({pn: pn, ws: ws, loc: db.cats[pn].game.public.lastPlace[3]});
					if (c >= 0) clients[c].ws = ws;

					cat[0] = db.cats[pn].game;
					cat[1] = db.cats[pn].game.public;
					cat[0].last = Date.now();

					if (!world.locs[cat[1].lastPlace[3]].public.fill.some((x, i) => {
						if (pn == x.pn) {
							world.locs[cat[1].lastPlace[3]].public.fill[i] = serveBeforeSend(pn);
							return true;
						}
					})) world.locs[cat[1].lastPlace[3]].public.fill.push(serveBeforeSend(pn));

					wsSend(2, 'one', {pn, itr: db.cats[pn].game.iteractions, name: db.cats[pn].catName, clan: db.cats[pn].game.clan}, ws);
					wsSend(3, 'one', {loc: world.locs[cat[1].lastPlace[3]].public}, ws);
					wsSend(4, 'inloc', [cat[1].lastPlace[3], serveBeforeSend(pn)]);
					break;
				} case 103: {
					if (!validaterMsg(pn, cat, 103, msg)) {ws.close(); break;}
					if (pn <= 0 || !cat[0] || !cat[1]) {ws.close(); break;}
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
					let	moving = null, orient = cat[1].lastPlace[2], p = world.locs[cat[1].lastPlace[3]].paths;

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
								p = world.locs[cat[1].lastPlace[3]].public.fill;
								p.some((i, j) => {
									if (pn == i.pn) {
										p.splice(j, 1);
										return;
									}
								});
								wsSend(8, 'inloc', [cat[1].lastPlace[3], pn]);
								cat[1].lastPlace = moving;
								p = findClient(pn);
								if (p >= 0) {
									clients[p].loc = cat[1].lastPlace[3];
									p = serveBeforeSend(pn);
									world.locs[cat[1].lastPlace[3]].public.fill.push(p);
									wsSend(4, 'inloc', [cat[1].lastPlace[3], p]);
									wsSend(3, 'one', {chunk: cat[1].lastPlace, del: true, loc: world.locs[cat[1].lastPlace[3]].public}, ws);
								} else ws.close();
							}

						}, i);
					} break;
				} case 104: {
					if (!validaterMsg(pn, cat, 104, msg)) {ws.close(); break;}
					if (!msg.value || !msg.value.replace(/\s/g, '')) break;
					msg.value = msg.value.match(/[^\s]{0,30}/g).join(' ');
					msg.value = msg.value.length > 200 ? msg.value.slice(0, 200) + ' ...' : msg.value;

					wsSend(6, 'inloc', [ cat[1].lastPlace[3], { msg: msg.value, pn, }]);
					break;
				} case 107: {
					if (!validaterMsg(pn, cat, 107, msg)) {ws.close(); break;}
					fs.readFile(__dirname + `/databases/hard/${pn}/knowledge.js`, 'utf8', (err, data) => {
						if (err) wsSend(7, 'one', `ошибка при чтении /db/knowledge игрока ${pn} code 107`, ws)
						else wsSend(9, 'one', JSON.parse(data).knownPlayers, ws);
					}); break;
				} case 108: {
					console.log(world.locs[3].public.fill[0]);
					if (!validaterMsg(pn, cat, 108, msg)) {ws.close(); break;}
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
								wsSend(12, 'one', {add: {pn: msg.pn}, msg: `%catname пока что не ответил${db.cats[msg.pn].game.public.gender ? '' : 'a'}` +
								` на прошлое действие`}, ws); break;
							}
							cat[0].isWaitingRelation.push(msg.pn);
							cat[0].cantSendRelation.push(msg.pn);
							db.cats[msg.pn].game.iteractions.push({pn, action: 1});
							wsSend(10, 'one', {pn, i: msg.i}, clients[findClient(msg.pn)].ws);
					} break;
				} case 106: {
					if (pn <= 0 || !cat[1] || !cat[0]) {ws.close(); break;}
					cat[0].iteractions.pop();
					if (db.cats[msg.to].game.isWaitingRelation.some((x, i) => {
						if (x == pn) {
							db.cats[msg.to].game.isWaitingRelation.splice(i, 1);
							return true;
						}
					})) {
						db.cats[msg.to].game.cantSendRelation.splice(db.cats[msg.to].game.cantSendRelation.indexOf(pn), 1);
						if (!msg.about) { wsSend(12, 'one', {add: {pn}, msg: '%catname не хочет рассказывать о себе'},clients[findClient(msg.to)].ws); break; }
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
					if (pn <= 0 || !cat[1] || !cat[0]) {ws.close(); break;}
					fs.readFile(__dirname + `/databases/hard/${pn}/knowledge.js`, 'utf8', (err, data) => {
						if (err) wsSend(7, 'one', `ошибка при чтении /db/knowledge игрока ${pn} code 109`, ws)
						else {
							data = JSON.parse(data);
							if (Object.keys(data.knownPlayers).length > 100) { wsSend(7, 'one', 'Вы не можете помнить больше ста котиков'); return; }
							data.knownPlayers[msg.pn] = msg.data;
							fs.writeFile(__dirname + `/databases/hard/${pn}/knowledge.js`, JSON.stringify(data), (err) => {
								if (err) wsSend(7, 'one', `ошибка при записи /db/knowledge игрока ${pn} code 109`, ws);
							});
						}
					});
				}
			}
		} catch (err) {
			console.log(err);
			//log
		}
	});
	ws.on('close', () => {
		try {
			const timeofclose = (Date.now() - timeofc), minute = ` или ${Math.round(timeofclose / 60000)} минут`;
			console.log(`Сокет закрылся через ${Math.round(timeofclose / 1000)} секунд${(timeofclose / 6000) > 2 ? minute : ''}`);
		} catch (err) {
			console.log(err); //log
		}
	});
});

/*
Object.keys(db.cats).forEach(x => {
	db.cats[x].game.public.birth = other.time;
	console.log(db.cats[x].game, (db.cats[x].game.die - db.cats[x].game.public.birth) /60/60/24);
});
editDBs.save('db');
*/


function findClient(pn) {
      if (!pn || pn <= 0) return -2;
      let i = 0;
      for(; i < clients.length; i++) {
      	if (clients[i].pn == pn) return i;
      }
      return -1;
}

function validaterMsg(pn, cat, type, msg) {
	try {
		if (pn <= 0 || !cat[0] || !cat[1]) throw new Error(`Ошибка авторизации: ${pn} || ${!!cat[0]} || ${!!cat[1]}`);
		const q = Object.keys(msg);
		switch (type) {
			case 103:
				if (q.length > 1)
					throw new Error(`Лишние свойства в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (!q.length)
					throw new Error(`Отсутствует свойств в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (q[0] != 'value')
					throw new Error(`Отсутствует свойство value в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (typeof msg.value[0] !== 'number' || typeof msg.value[1] !== 'number')
					throw new Error(`Данные - не число в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				break;
			case 104:
				if (q.length > 1)
					throw new Error(`Лишние свойства в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (!q.length)
					throw new Error(`Отсутствует свойств в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (q[0] != 'value')
					throw new Error(`Отсутствует свойство value в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				if (typeof msg.value !== 'string')
					throw new Error(`Данные - не строка в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`);
				break;
//			case 105:
		}
		return true;
	} catch (err) {
		console.log(err);
		//логинируй
	}
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
	const moons = (other.time - db.cats[pn].game.public.birth) / 150 / 24 / 60;
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

	if (Date.now() - db.cats[pn].game.last < 15 * 60000) t = 'go'
	else if (Date.now() - db.cats[pn].game.last < 20 * 60000) t = 'doze'
	else t = 'sleep';

	if (m <= 12) size += m / 12 * 0.4
	else size += (m - 12) / 188 * 0.3;

	if (update) return {status: t, moons: serveMoons(pn, true), size};
	return Object.assign({},
			db.cats[pn].game.public,
			{pn, status: t, moons: serveMoons(pn, true),size});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
		fs.readFile(__dirname + path, 'utf8', (err, data) => {
			if (err) {
				res.end(JSON.stringify({ res: 0 }));
				//логинируй ошибку
			} else res.end(JSON.stringify({ res: 1, data: data, add: json }));
		});
	} else {
		fs.readFile(__dirname + path, (err, data) => {
			if (err) {
				error500(res, 'Произошла ошибка на стороне сервера или запрошен несуществующий ресурс. Error in getStaticFile.');
				//логинируй ошибку
			} else {
				res.setHeader('content-type', contentType + ';charset=utf-8');
				res.end(data);
			}
		});
	}
}

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
