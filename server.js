'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	db = require('./databases/cats.js'),
	world = require('./databases/world.js'), //нужно сохранять периодически?
	ch = require('./lib/cookie.js').include(db);

function error500(res) {
	res.statusCode = 500;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end('Произошла ошибка на стороне сервера :(');
}

//если не нужен JSON
function getStaticFile(res, path, contentType, responseCode) {
	if(!responseCode) res.statusCode = 200;
	fs.readFile(__dirname + path, (err, data) => {
		if (err) {
			error500(res);
			//Логинируй ошибку
		} else {
			res.setHeader('content-type', contentType + ';charset=utf-8');
			res.end(data);
		}
	});
};

//reg - регистрация
function addDevice(pn, req, reg) {
	let d = req.headers['user-agent'].match(/\((.*?)\)/);
	if (d) {
		d = d[0];
		if (reg) return d;
		let l = db[pn].devices.length, j = 0;
		for(; j < l; j++) {
			if (db[pn].devices[j] === d) break;
		}
		if (!l || j === l) {
			db[pn].devices.push(d);
			fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => { if (err) error500(res); });
			return 1;
		} else return 0;
	}  return 0;
}

function createCharacter(rawData, req, res) {
	function sendCrJSON(id) {
		res.setHeader('content-type', 'application/json;charset=utf-8');
		res.end(JSON.stringify(resOfServ[id]));
	}
	let lastCat = db.info.totalCats,
	regCatName = rawData.catName.match(/[а-яА-Я]+/g),
	regAlias = rawData.alias.match(/[a-zA-Zа-яА-Я\d]+/g),
	regPass = rawData.password.match(/[\wа-яА-Я\-\d]+/),
	resOfServ = {
		res: { res: 'Персонаж не создан: некорректные данные', cr: 0 },
		nameExist: { res: 'Персонаж не создан: персонаж с таким именем уже существует', cr: 0 },
		passExist: { res: 'Персонаж не создан: придумайте другой пароль', cr: 0 },
	};

        if (regCatName && regCatName.length === 2) regCatName = regCatName[0] + ' ' + regCatName[1];
        if (regCatName && regCatName.length === 1) regCatName = regCatName[0];
        if (regPass) regPass = regPass[0];
        if (regAlias) regAlias = regAlias.join(' ');

	const a = rawData.catName.length < 2 || rawData.catName.length > 32,
	b = rawData.alias.length < 2 || rawData.alias.length > 32 || rawData.password.length < 6 || rawData.password.length > 32,
	c = regCatName !== rawData.catName || regAlias !== rawData.alias || regPass !== rawData.password;

	if (!(regCatName && regAlias && regPass) || a || b || c) sendCrJSON('res')
	else {
		let i = 1;
		for(; i <= lastCat; i++) {
			if (db[i].catName.toLowerCase() === rawData.catName.toLowerCase()) break;
       	}
		if (i !== lastCat + 1) sendCrJSON('nameExist')
		else {
			i = 1;
			for(; i <= lastCat; i++) {
				if (db[i].password === rawData.password) break;
			}
			if (i !== lastCat + 1) sendCrJSON('passExist')
			else if (ch.existingCookie(req.headers.cookie, rawData) < 0) { //Создай проверку на то, что девайсы совпадают
				const c = ch.existingCookie(req.headers.cookie, rawData);
				didInfr('creatingTwoChar', -c);
      				res.setHeader('content-type', 'application/json;charset=utf-8');
	      			res.end(JSON.stringify({res: `<span class='lower-text'>У Вас уже есть персонаж по имени ${db[-c].catName}.` +
				`Создание сразу двух и более персонажей запрещено, поэтому, если продолжите попытки создания нового персонажа,` +
				` ${db[-c].catName} будет заблокирован и нового создать Вы не сможете. Чтобы создать нового персонажа, нужно удалить старого.</span>`, cr: 0}));
			} else {
				const newCat = {
					catName: rawData.catName[0].toUpperCase() + rawData.catName.substring(1).toLowerCase(),
					gender: rawData.gender,
					alias: rawData.alias,
					password: rawData.password,
					devices: [addDevice(lastCat, req, true)],
					cookie: ch.generateCookie(),
					dateOfReg: Date.now(),
					lastVisitOfSite: Date.now(),
					infractions: {},
					servInfractions: {},
					game: {
						health: 100,
						moons: 0,
						speed: 50,
						lastPlace: [0, 30, 10, 1],
						status: 'unactiv',
					}
				}
				db[++lastCat] = newCat;
				++db.info.totalCats;
				fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => { if (err) error500(res); });
				resOfServ.compl = { res: 'Персонаж создан! Нажмите сюда, чтобы активировать его', cr: 1, token: db[lastCat].cookie }
				sendCrJSON('compl');
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
			if(err) error500(res);
			fs.writeFile(__dirname + fields.path + files.photo.name, data, (err) => { if (err) error500(res) });
		});
		getStaticFile(res, '/requires/load.html', 'text/html', 200);

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
		res.end({ res: 3, answ: 'Слишком тяжелый запрос (более 1-го Кбайта)'});
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

function isAdmin(pn) {
	let i = 0, admins = db.info.admins.length;
	for(; i < admins; i++) {
		if (pn === db.info.admins[i]) break;
        }
	if (i !== admins) return true
	else return false;
}

function parseAnotherRequest(require, res, req) {
	const c = ch.existingCookie(req.headers.cookie);

	if (require === 'зфнс') {
		if (c > 0) {
			if (isAdmin(c)) getBufferFile(res, '/requires/load.html', [-200, -200])
			else afterCheckCookie(res, {res: 2}); //нет прав
		} else afterCheckCookie(res, {res: 0}); //персонаж не активирован
	} else if (require === 'тм' || /творить мир/i.test(require)) {
		if (c > 0) {
			if (isAdmin(c)) getBufferFile(res, '/requires/creating_world.html', [-350, -280])
		} else afterCheckCookie(res, {res: 0});
	}  else afterCheckCookie(res, {res: 3}) //попробуйте что-нибудь другое
}

function didInfr(type, pn) {
	if (db[pn].infractions[type]) db[pn].infractions[type] += 1
	else db[pn].infractions[type] = 1;
	fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => { if (err) error500(res); });
}

function getBufferFile(res, path, add) {
	const answ = {
		res: undefined,
		data: undefined,
		add: add,
	};
	fs.readFile(__dirname + path, (err, data) => {
		if (err) {
			answ.res = 0;
			answ.data = '';
		} else {
			answ.res = 1;
			answ.data = data.toString('utf8');
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end(JSON.stringify(answ));
		}
	});
}

const server = http.createServer((req, res) => {
	let path = req.url.match(/\/{1}[\w\d\.\/_]*/i), n = undefined;
	if (path) {
		path = path[0];
		if (path.startsWith('/img/')) {
			n = path.match(/\d+/);
			if (n) {
				n = n[0];
				path = path.replace(/\d+.*/, '')
			} else path = '/';
		}
	} else path = '/';

	const c = ch.existingCookie(req.headers.cookie || '');
	if (c > 0) db[c].lastVisitOfSite = Date.now();

	if (req.method === 'GET') {
//		console.log(req.url);
		switch(path) {
			case '/':
				getStaticFile(res, '/index.html', 'text/html'); break;
//			case '/1':
//				getStaticFile(res, '/server.js', 'application/javascript'); break;
//			case '/2':
//				getStaticFile(res, '/WSserver.js', 'application/javascript'); break;
			case '/favicon.ico':
				getStaticFile(res, '/favicon.ico', 'image/vnd.microsoft.icon'); break;
			case '/css/style.css':
				getStaticFile(res, '/css/style.css', 'text/css'); break;
			case '/css/styleGame.css':
				getStaticFile(res, '/css/style_game.css', 'text/css'); break;
			case '/js/handlerRequires.js':
				getStaticFile(res, '/js/handler_requires.js', 'application/javascript'); break;
			case '/js/outdata.js':
				getStaticFile(res, '/js/outdata.js', 'application/javascript'); break;
			case '/js/play.js':
				getStaticFile(res, '/js/play.js', 'application/javascript'); break;
			case '/play':
				if (c > 0) getStaticFile(res, '/play.html', 'text/html')
				else getStaticFile(res, '/requires/error_play.html', 'text/html');
				break;
			case '/creating':
				if (c > 0) {
					afterCheckCookie(res, {res: 0, alias: db[c].alias, password: db[c].password}); //нет
				} else if (c < 0) {
					afterCheckCookie(res, {res: 2, catName: db[-c].catName}); //нет, предупреждение
					didInfr('creatingTwoChar', -c);
				} else if (c == 0) getBufferFile(res, '/requires/creating.html'); break; //да
			case '/load':
				if (isAdmin(c)) getStaticFile(res, '/requires/load.html', 'text/html')
				else {
					res.setHeader('content-type', 'text/plain;charset=utf-8');
					res.end('У вас недостаточно прав или персонаж не активирован');
				}; break;
			case '/world':
				if (isAdmin(c)) getStaticFile(res, '/requires/creating_world.html', 'text/html')
				else {
					res.setHeader('content-type', 'text/plain;charset=utf-8');
					res.end('У вас недостаточно прав или персонаж не активирован');
				}
				break;
			case '/activ':
				if (c <= 0) getBufferFile(res, '/requires/activ.html') //да
				else afterCheckCookie(res, {res: 2, catName: db[c].catName}); break; //уже активировпн
			case '/img/textures/':
				getStaticFile(res, `/img/textures/${n}.svg`, 'image/svg+xml'); break;
			case '/img/details/':
				getStaticFile(res, `/img/details/${n}.svg`, 'image/svg+xml'); break;
			//на сервере фактический адрес должен быть /img/players/[pn игрока]/0.svg...1.svg...2.svg и т.д.
			//на всякий случай проверь c > 0
			case '/img/players/': //!!!
				getStaticFile(res, `/img/players/${n}.svg`, 'image/svg+xml'); break;
			case '/css/img/button.png':
				getStaticFile(res, '/css/img/button.png', 'image/png'); break;
			case '/css/img/arrow.svg':
				getStaticFile(res, '/css/img/arrow.svg', 'image/svg+xml'); break;
			case '/css/img/lightarrow.svg':
				getStaticFile(res, '/css/img/lightarrow.svg', 'image/svg+xml'); break;
			case '/css/img/lowMsg.png':
				getStaticFile(res, '/css/img/lowMsg.png', 'image/png'); break;
			case '/css/img/line.png':
				getStaticFile(res, '/css/img/line.png', 'image/png'); break;
			case '/css/img/verticalLine.png':
				getStaticFile(res, '/css/img/vertical_line.png', 'image/png'); break;
			case '/css/img/head.jpg':
				getStaticFile(res, '/css/img/head.jpg', 'image/jpg'); break;
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
				if (isAdmin(c)) download(req, res, contentLength);
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
	clients = [],
	cash = {};

function findClient(pn) {
        if (pn === undefined) return -1;
        let i = 0
        for(; i < clients.length; i++) {
                if (clients[i].pn === pn) break;
        }
        if (i !== clients.length) return i;
        return -1;
}

function findPlayer(pn) {
	if (pn === undefined) return -1;

      const tmpfp = findClient(pn) != -1 ? '' + clients[findClient(pn)].loc : false,
            place = tmpfp || db[pn].game.lastPlace[0];
      let i = null, p = null;

      if (world.nosort[place].public) {
      	const w = world.nosort[place].public.fill;
            let i = 0;
            for(; i < w.length; i++) {
            	if (w[i].pn === pn) break;
            }
            p = (i !== w.length) ? w[i] : p;
	}
	//в возвращаемых значениях хранятся ссылки
      return {place: place, data: p};
}

function wsSend(type, data, socket) {
        if (type == 6) {
                for(let j = 0; j < clients.length; j++) {
                        if (clients[j].loc == data[0].place) clients[j].ws.send(JSON.stringify({
                                type: 6,
                                pn: data[0].data.pn,
                                msg: data[1],
                        }));
                }
        } else if (type == 5) {
                for(let j = 0; j < clients.length; j++) {
                        if (clients[j].loc == data[0].place) clients[j].ws.send(JSON.stringify({
                                type: 5,
                                pn: data[0].data.pn,
                                chunk: data[1],
                        }));
                }
        } else if (type == 4) {
                for(let j = 0; j < clients.length; j++) {
                  if (clients[j].loc == data.place) clients[j].ws.send(JSON.stringify({
                        type: 4,
				cat: data.data,
                  }));
            }
        } else if (type == 3) {
                socket.send(JSON.stringify({
                        type: 3,
                        loc: world.nosort[data.place].public,
                }));
        } else if (type == 7) {
		    socket.send(JSON.stringify({
				type: 7,
				chunk: data,
		    }));
        } else if (type == 8) {
                for(let j = 0; j < clients.length; j++) {
                        if (clients[j].loc == data.place) clients[j].ws.send(JSON.stringify({
                                type: 8,
                                pn: data.data.pn,
                        }));
		    }
	  } else if (type == 2) {
                socket.send(JSON.stringify({
                        type: 2,
                        pn: data.pn,
                        name: data.name,
                        chunk: data.chunk,
                }));
        }
}

wss.on('connection', (ws) => {
        let pn = undefined, g = undefined, control = undefined;

        ws.on('message', (m) => {
                const msg = JSON.parse(m);

                if (msg.type == 102) {
                        pn = ch.existingCookie(decodeURI(m), false);
                        g = findPlayer(pn);
                        if (!g.data) { //если он впервые заходит в игру, то этот скрипт запускается
                                const cat = {
                                                status: 'activ',
								health: db[pn].game.health,
								moons: db[pn].game.moons,
								speed: db[pn].game.speed,
                                                pn: pn,
                                                name: db[pn].catName,
                                                //в БД 0 - локация, 1 - х, 2 - у, 3 - ориентация
                                                //в игре 0 - х, 1 - у, 2 - ориентация
                                                chunk: [db[pn].game.lastPlace[1], db[pn].game.lastPlace[2], db[pn].game.lastPlace[3]],
                                        };
                                world.nosort[g.place].public.fill.push(cat);
                                g = findPlayer(pn);
                        } else if (g.data.status === 'unactiv' || /sleep/.test(g.data.status)) {
                                g.data.status = 'activ';
                        }

				const exc = findClient(pn);
                        if (exc == -1) clients.push({pn: pn, ws: ws, loc: g.place})
				else clients[exc].ws = ws;

                        const socket = clients[findClient(pn)].ws;
                        if (socket.readyState === WebSocket.OPEN) {
                                wsSend(2, g.data, socket);
                                wsSend(3, g, socket);
                                wsSend(4, g);
                        }
                } else if (msg.type == 103) {
                        clearTimeout(control);
                        g = findPlayer(pn);

                        wsSend(5, [g, msg.value]);

				const dis = Math.round(Math.sqrt(Math.pow(msg.value[0] - g.data.chunk[0], 2) +
						Math.pow(msg.value[1] - g.data.chunk[1], 2) + 0.6)) * g.data.speed;
				control = setTimeout(() => {
                              g.data.chunk = msg.value;
           				const p =  world.nosort[g.place].paths;
           				for(let j = 0; j < p.length; j++) {
           					if (p[j].minChunk[0] <= g.data.chunk[0] && p[j].maxChunk[0] >= g.data.chunk[0] &&
           					p[j].minChunk[1] <= g.data.chunk[1] && p[j].maxChunk[1] >= g.data.chunk[1]) {
							const fc = clients[findClient(pn)].ws;
                                          wsSend(7, p[j].toC, fc);
							wsSend(8, g);
							for(let i = 0; i < world.nosort[g.place].public.fill.length; i++) {
								if (world.nosort[g.place].public.fill[i].pn == g.data.pn) {
									world.nosort[g.place].public.fill.splice(i, 1);
									clients[findClient(pn)].loc = p[j].to;
									g.place = p[j].to;
									g.data.chunk[0] = p[j].toC[0];
									g.data.chunk[1] = p[j].toC[1];
									world.nosort[p[j].to].public.fill.push(g.data);
									break;
								}
							}
							wsSend(3, g, fc);
							wsSend(4, g);
                                          break;
           					}
           				}
                        }, dis);
                } else if (msg.type = 104) {
                        wsSend(6, [findPlayer(pn), msg.value]);
                }
        });
        ws.on('close', () => {
			g = findPlayer(pn);
			if (g != -1) cash[g.data.pn] = g;
        });
});

setInterval(() => {
        for(let i = 0; i < world.nosort.length; i++) {
                for(let j = 0; j < world.nosort[i].public.fill.length; j++) {
                        db[world.nosort[i].public.fill[j].pn].game.lastPlace = [
                                i,
                                world.nosort[i].public.fill[j].chunk[0],
                                world.nosort[i].public.fill[j].chunk[1],
                                world.nosort[i].public.fill[j].chunk[2],
                        ];
                }
        }
//      for(let i = 0; i < cash.length; i++) {
//              const pn = cash[i].pn;
//              здесь можно будет сохранять накопившиеся в cash данные
//              после парсинга нужно очистить cash
//      }
        fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => {
                if (err) console.log(err); //тут тоже нужен нормальный обработчик ошибок
        });
        console.log('it`s happened');
}, 1500000);

