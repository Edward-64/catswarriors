'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	{db, world, editDBs} = require('./databases/launch.js'),
	ch = require('./lib/cookie.js').include(db),
	cw = require('./lib/creating_world.js').include(db, world);

function error500(res) {
	res.statusCode = 500;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end('Произошла ошибка на стороне сервера :(');
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
				error500(res);
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
					db.cats[pnNewCat] = {
						catName: rawData.catName[0].toUpperCase() + rawData.catName.substring(1).toLowerCase(),
						role: 'user',
						gender: rawData.gender,
						alias: rawData.alias,
						password: rawData.password,
						devices: [],
						cookie: cNewCat,
						dateOfReg: Date.now(),
						lastVisitOfSite: Date.now(),
						infractions: {},
						servInfractions: {},
						game: {
							public: {
								health: 100,
								moons: 1,
								speed: 50,
								size: 0.3,
								lastPlace: [20, 0, 0, 1],
								status: 'unactiv',
								last: Date.now() - 15 * 60001,
							}
						}
					};
					editDBs.save('db');
					ch.setCookie({alias: rawData.alias, password: rawData.password}, res, true);
					sendCrJSON({ res: 'Персонаж создан! Нажмите сюда, чтобы активировать его', cr: 1});
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
		if(err) error500(res);
		if(files.photo.size > 1048576) {
			res.statusCode = 400;
			res.setHeader('content-type', 'text/plain; charset=utf-8')
			res.end('Слишком тяжелый файл (более 1-го Мбайта)');
		}
		fs.readFile(files.photo.path, (err, data) => {
			if(err) error500(res)
			else fs.writeFile(__dirname + fields.path + files.photo.name, data, (err) => { if (err) error500(res) });
		});
		getStaticFile(res, '/index.html', null, 'text/html');
	});
}

function afterCheckCookie(res, answ) {
	res.setHeader('content-type', 'application/json;charset=utf-8');
	res.end(JSON.stringify(answ));
}

function getJSON(req, res, contentLength, cmd) {
	let body = '';
	if (contentLength > 1024) {
		res.statusCode = 400;
		res.setHeader('content-type', 'application/json; charset=utf-8');

		res.end({ res: 3, answ: 'Слишком тяжелый запрос (более одного Кбайта)'});
	}
	req.on('data', (chunk) => {
		body += chunk;
		if (body > 1024) {
			res.statusCode = 400;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end({res: 3, answ: 'Слишком тяжелый запрос (более одного Кбайта)'});
		}
	});
	req.on('end', () => {
		body = JSON.parse(body);
		if (cmd === '/ac') ch.setCookie(body, res);
		if (cmd === '/cc') createCharacter(body, req, res);
		if (cmd === '/ar') parseAnotherRequest(body.require, res, req);
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
		if (c > 0) {
			if (/creater/.test(p)) getStaticFile(res, '/requires/creating_world.html', [-350, -280])
			else afterCheckCookie(res, {res: 2});
		} else afterCheckCookie(res, {res: 0});
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
			n = path.match(/\d+/);
			if (n) {
				n = n[0];
				path = path.replace(/\d+.*/, '')
			}
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
			case '/js/outdata.js':
				getStaticFile(res, '/js/outdata.js', null, 'application/javascript'); break;
			case '/js/play.js':
				getStaticFile(res, '/js/play.js', null, 'application/javascript'); break;
			case '/play':
				if (c > 0) {
					res.setHeader('set-cookie', [`timeauth=${db.cats[c].cookie};max-age=60`,
										`timealias=${encodeURI(db.cats[c].alias)};max-age=60`]);
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
				} else if (c == 0) getStaticFile(res, '/requires/creating.html', 'json'); break; //да
			case '/load':
				if (/admin/.test(p)) getStaticFile(res, '/requires/load.html', null, 'text/html'); break;
			case '/world':
				if (/creater/.test(p)) getStaticFile(res, '/requires/creating_world.html', null, 'text/html'); break;
			case '/activ':
				if (c <= 0) getStaticFile(res, '/requires/activ.html', 'json') //да
				else afterCheckCookie(res, {res: 2, catName: db.cats[c].catName}); break; //уже активировaн
			case '/img/textures/':
				getStaticFile(res, `/img/textures/${n}.svg`, null, 'image/svg+xml'); break;
			case '/img/details/':
				getStaticFile(res, `/img/details/${n}.svg`, null, 'image/svg+xml'); break;
			//на сервере фактический адрес должен быть /img/players/[pn игрока]/0.svg...1.svg...2.svg и т.д.
			//на всякий случай проверь c > 0
			case '/img/players/': //!!!
				getStaticFile(res, `/img/players/${n}.svg`, null, 'image/svg+xml'); break;
			case '/css/img/button.png':
				getStaticFile(res, '/css/img/button.png', null, 'image/png'); break;
			case '/css/img/arrow.svg':
				getStaticFile(res, '/css/img/arrow.svg', null, 'image/svg+xml'); break;
			case '/img/indev.svg':
				getStaticFile(res, '/img/indev.svg', null, 'image/svg+xml'); break;
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
			default:
				res.statusCode = 404;
				res.setHeader('content-type', 'text/plain; charset=utf-8');
				res.end('Не найдено'); break;
		}
	}
	const contentLength = req.headers['content-length'];
	if (req.method = 'POST') {
		switch(path) {
			case '/dlf':
				if (/admin/.test(p)) download(req, res, contentLength);
				break;
			case '/cc':
				if (c == 0) getJSON(req, res, contentLength, path);
				break;
			case '/ac':
				if (c <= 0) getJSON(req, res, contentLength, path);
				break;
			case '/ar':
				getJSON(req, res, contentLength, path);
				break;
		}
	}
}).listen(process.env.PORT || 8080, () => console.log('Server is running'));

const WebSocket = require('ws'),
	wss = new WebSocket.Server({ server }),
	clients = [];

function findClient(pn) {
      if (!pn || pn <= 0) return -2;
      let i = 0;
      for(; i < clients.length; i++) {
      	if (clients[i].pn == pn) break;
      }
      if (i != clients.length) return i;
      return -1;
}

function validateMsg(type) {
	switch (type) {
		//
	}
}

function findInLoc(pn, loc) {
	const l = world.locs[loc].public.fill.length;
	let	i = 0;
	for(; i < l; i++) {
		if (world.locs[loc].public.fill[i].pn == pn) return i;
	}
	return -1;
}

function wsSend(type, range, data, ws) {
	switch (range) {
		case 'one':
			 ws.send(JSON.stringify({
				type: type,
				data: data,
			})); break;
		case 'inloc':
            	for(let j = 0; j < clients.length; j++) {
            		if (clients[j].loc == data[0]) clients[j].ws.send(JSON.stringify({
                        	type: type,
					data: data[1],
                  	}));
			} break;
		case 'all': break;
	}
}

wss.on('connection', (ws) => {
	const timeofc = Date.now();
	let	pn = null, c = null, sh = null, control = null;

	ws.on('message', (m) => {
      	let {type, msg} = JSON.parse(m);
		if (typeof type === 'string') type = Number.parseInt(type);

		switch (type) {
			case 102:
				pn = ch.existingCookie(decodeURI(msg.token));
				c = findClient(pn);
				if (c == -2) { ws.close(); break; } sh = db.cats[pn].game.public;
				if (c == -1) clients.push({pn: pn, ws: ws, loc: sh.lastPlace[3]});
				if (c >= 0) clients[c].ws = ws;
				sh.pn = pn; sh.name = db.cats[pn].catName;
				sh.status = 'activ'; sh.last = Date.now();
				if (findInLoc(pn, sh.lastPlace[3]) < 0) world.locs[sh.lastPlace[3]].public.fill.push(sh);
				wsSend(2, 'one', sh, ws); wsSend(3, 'one', {loc: world.locs[sh.lastPlace[3]].public}, ws); wsSend(4, 'inloc', [sh.lastPlace[3], sh]);
				break;
			case 103:
				if (pn <= 0 || !sh) {ws.close(); break; }
				clearTimeout(control);
				const disX = msg.value[0] - sh.lastPlace[0], disY = msg.value[1] - sh.lastPlace[1],
					dis = Math.round(Math.sqrt(Math.pow(disX, 2) + Math.pow(disY, 2))) * sh.speed,
					stepX = disX / 5, stepY = disY / 5;
				let	moving = null, orient = sh.lastPlace[2], p = world.locs[sh.lastPlace[3]].paths;

				if (!dis) break;

           			for(let j = 0; j < p.length; j++) {
           				if (p[j].minChunk[0] <= msg.value[0] && p[j].maxChunk[0] >= msg.value[0] &&
           				p[j].minChunk[1] <= msg.value[1] && p[j].maxChunk[1] >= msg.value[1]) {
						moving = p[j];
                                    break;
           				}
           			}

				msg.value[0] = msg.value[0] < 20 ? 20 : msg.value[0];
				msg.value[0] = msg.value[0] > 140 ? 140 : msg.value[0];
				msg.value[1] = msg.value[1] < 0 ? 0 : msg.value[1];
				msg.value[1] = msg.value[1] > 30 ? 30 : msg.value[1];

				wsSend(5, 'inloc', [sh.lastPlace[3], {pn: pn, s: {dis: dis, oldchunk: sh.lastPlace, newchunk: msg.value}}]);

				if (disX > 0) sh.lastPlace[2] = 1
				else if (disX < 0) sh.lastPlace[2] = 0;

				for(let i = 0; i < dis; i += dis/5) {
					control = setTimeout(() => {
						sh.lastPlace[0] += stepX;
						sh.lastPlace[1] += stepY;
						if (i + dis/5 >= dis && moving) {
							p = findInLoc(pn, sh.lastPlace[3]);
							if (p != -1) world.locs[sh.lastPlace[3]].public.fill.splice(p, 1);
							wsSend(8, 'inloc', [sh.lastPlace[3], pn]);
							sh.lastPlace = [moving.to[0], moving.to[1], moving.to[2], moving.to[3]];
							p = findClient(pn);
							if (p >= 0) {
								clients[p].loc = sh.lastPlace[3];
								wsSend(4, 'inloc', [sh.lastPlace[3], sh]);
								wsSend(3, 'one', {chunk: sh.lastPlace, del: true, loc: world.locs[sh.lastPlace[3]].public}, ws);
							} else {
								ws.close();
								console.log('при перемещении игрок не найден в массиве clients');
							}
							world.locs[sh.lastPlace[3]].public.fill.push(sh);
						}
					}, i);
				} break;
			case 104:
				if (pn <= 0) { ws.close(); break; }
				wsSend(6, 'inloc', [ sh.lastPlace[3], { msg: msg.value, pn: pn, }]);
		}
	});

	ws.on('close', () => {
		const timeofclose = (Date.now() - timeofc), minute = ` или ${Math.round(timeofclose / 60000)} минут`;
		console.log(`Сокет закрылся через ${Math.round(timeofclose / 1000)} секунд${(timeofclose / 6000) > 2 ? minute : ''}`);
	});
});

