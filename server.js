'use strict'

const http = require('http'),
	fs = require('fs'),
	formidable = require('formidable'),
	MAP_OF_TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	L_MAP = MAP_OF_TOKEN.length,
	db = require('./databases/cats.js');
//	ch = require('./lib/cookie.js').include(db);

function error500(res) {
	res.statusCode = 500;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end('Произошла ошибка на стороне сервера :(');
}

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
function addDevice(i, req, reg) {
	let d = req.headers['user-agent'].match(/\((.*?)\)/);
	if (d) {
		d = d[0];
		if (reg) return d;
		let l = db[i].devices.length, j = 0;
		for(; j < l; j++) {
			if (db[i].devices[j] === d) break;
		}
		if (!l || j === l) {
			db[i].devices.splice(0, 0, d);
			fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => { if (err) error500(res); });
			return 1;
		} else return 0;
	}  return 0;
}

function generateCookie () {
	let key = 'cwGame-';
	for(let i = 0; i < 32; i++) {
		let index = Math.floor(Math.random() * L_MAP);
		key += MAP_OF_TOKEN[index];
	}
	const lastCat = db.info.totalCats;
	for(let i = 1; i <= lastCat; i++) if (db[i].cookie === key) return generateCookie();
	return key;
}

function parseCookie(req) {
	const cookie = {
		auth: undefined,
		alias: undefined,
	};
	if (!req.headers.cookie) return cookie;
	cookie.auth = req.headers.cookie.match(/auth=([\w\d\-]{39})/);
	cookie.alias = req.headers.cookie.match(/alias=.*/);
	if (cookie.auth) cookie.auth = cookie.auth[0].replace(/auth=/, '');
	if (cookie.alias) cookie.alias = cookie.alias[0].replace(/alias=/, '');
	return cookie;
}

//Установка куки при активации персонажа
function setCookie(rawData, res) {
	const {alias, password} = rawData;
	let lastCat = db.info.totalCats, i = 1;
	for (; i <= lastCat; i++) {
		if (password === db[i].password && alias === db[i].alias) break;
	}
	if (i !== ++lastCat) {
		res.statusCode = 200;
		res.setHeader('content-type', 'application/json;charset=utf-8');
		res.end(JSON.stringify({res: 1, token: db[i].cookie}));
	} else {
		res.statusCode = 200;
		res.setHeader('content-type', 'application/json;charset=utf-8');
		res.end(JSON.stringify({res: 0}));
	}
}

//Есть ли у клиента куки
//Отрицательное значение нужно для распознания попытки создания второго персонажа
//rawData должно быть всегда false, если оно не требуется в коде
function existingCookie(req, rawData) {
	const {auth, alias} = parseCookie(req);
	let i = 1, lastCat = db.info.totalCats;

	if (auth && alias) {
		for(; i <= lastCat; i++) {
			if (db[i].cookie === auth) break;
		}
		if (i !== ++lastCat) return i; //Существует
	}
	if (auth && !alias) {
		i = 1;
		for(; i <= lastCat; i++) {
			if (db[i].cookie === auth) break;
		}
		if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	}
	if (!auth && rawData) {
		i = 1;
		for(; i <= lastCat; i++) {
			if (db[i].alias === rawData.alias && db[i].password === rawData.password) break;
		}
		if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	}
	return 0; //Не существует
}

function createCharacter(rawData, req, res) {
	function sendCrJSON(id) {
               	res.statusCode = 200;
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
			else if (existingCookie(req, rawData) < 0) { //Создай проверку на то, что девайсы совпадают
				const c = existingCookie(req,rawData);
				didInfr('creatingTwoChar', -c);
	              		res.statusCode = 200;
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
					cookie: generateCookie(),
					dateOfReg: Date.now(),
					lastVisitOfSite: Date.now(),
					infractions: {},
					servInfractions: {},
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

function checkCookie(type, res, answ) {
	if (type === 'user') {
		res.statusCode = 200;
		res.setHeader('content-type', 'application/json;charset=utf-8');
		res.end(JSON.stringify(answ));
	} else if (type === 'admin') {
		//future code typeof db.info.admins => array
	}
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
		if (cmd === '/ac') setCookie(body, res);
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
	const c = existingCookie(req, false);
	console.log(c);
	if (c <= 0) {
		checkCookie('user', res, {res: 0}); //персонаж не активирован
	} else if (require === 'зфнс' || /загрузить файл на сервер/i.test(require)) {
		if (isAdmin(c)) getBufferFile(res, '/requires/load.html')
		else checkCookie('user', res, {res: 2}); //нет прав
	} else checkCookie('user', res, {res: 3}) //попробуйте что-нибудь другое
}

function didInfr(type, pn) {
	if (db[pn].infractions[type]) db[pn].infractions[type] += 1
	else db[pn].infractions[type] = 1;
	fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => { if (err) error500(res); });
}

function getBufferFile(res, path) {
	const answ = {
		res: undefined,
		data: undefined,
	};
	fs.readFile(__dirname + path, (err, data) => {
		if (err) {
			answ.res = 0;
			answ.data = '';
		} else {
			answ.res = 1;
			answ.data = data.toString('utf8');
			res.statusCode = 200;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end(JSON.stringify(answ));
		}
	});
}

http.createServer((req, res) => {
	let path = req.url.match(/\/{1}[\w\d\.\/]*/i);
	const c = existingCookie(req, false);

	if (path) { path = path[0] } else path = '/';
	if (/auth=undefined/.test(req.headers.cookie)) req.headers.cookie = '';
	req.headers.cookie = decodeURI(req.headers.cookie);

	if (req.method === 'GET') {
		console.log(req.url);
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
			case '/js/play.js':
				getStaticFile(res, '/js/play.js', 'application/javascript'); break;
			case '/play':
				if (c > 0) getStaticFile(res, '/play.html', 'text/html')
				else getStaticFile(res, '/requires/error_play.html', 'text/html');
				break;
			case '/creating':
				if (c > 0) { //Фиксируй последние визиты в бд
					checkCookie('user', res, {res: 0, alias: db[c].alias, password: db[c].password}); //нет
				} else if (c < 0) {
					checkCookie('user', res, {res: 2, catName: db[-c].catName}); //нет, предупреждение
					didInfr('creatingTwoChar', -c);
				} else if (c == 0) getBufferFile(res, '/requires/creating.html'); break; //да
			case '/load':
				getStaticFile(res, '/requires/load.html', 'text/html'); break;
			case '/activ':
				if (c <= 0) getBufferFile(res, '/requires/activ.html') //да
				else checkCookie('user', res, {res: 2, catName: db[c].catName}); break; //уже активировпн
			case '/img/players/0.svg':
				getStaticFile(res, '/img/players/0.svg', 'image/svg+xml'); break;
			case '/img/players/1.svg':
				getStaticFile(res, '/img/players/1.svg', 'image/svg+xml'); break;
			case '/img/players/2.svg':
				getStaticFile(res, '/img/players/2.svg', 'image/svg+xml'); break;
			case '/img/players/3.svg':
				getStaticFile(res, '/img/players/3.svg', 'image/svg+xml'); break;
			case '/img/players/4.svg':
				getStaticFile(res, '/img/players/4.svg', 'image/svg+xml'); break;
			case '/img/players/5.svg':
				getStaticFile(res, '/img/players/5.svg', 'image/svg+xml'); break;
			case '/img/players/6.svg':
				getStaticFile(res, '/img/players/6.svg', 'image/svg+xml'); break;
			case '/css/img/button.png':
				getStaticFile(res, '/css/img/button.png', 'image/png'); break;
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
        WebSocketServer = WebSocket.Server,
        wss = new WebSocketServer({port: 8181}),
//      fs = require('fs'),
        world = require('./databases/game.js'); //нужно сохранять периодически
//      db = require('./databases/cats.js'),
//      ch = require('./lib/cookie.js').include(db);

const clients = []; const cash = [];

function findClient(pn) {
        if (pn === undefined) return -1;
        let i = 0
        for(; i < clients.length; i++) {
                if (clients[i].pn === pn) break;
        }
        if (i !== clients.length) return i;
        return -1;
}

class Location {
        constructor(name, type, surface) {
                this.name = name;
                this.type = type; //например, лес или пустош
                this.weather = 'sun';
                this.fill = []; //котики, находящиеся на локации
                //object {
                //      chunk: [x, y],
                //      type: 'куст',
                //}
                this.landscape = [];
                this.surface = surface || '/textures/default.svg'; //текстура поля
        }
}

class World {
        constructor() { };
        static changeWeather(change, ...l) {
                for(let i = 0; i < l.length; i++) {
                        l[i].weather = change;
                }
        }
        static addLocation(name, type, surface) {
                world.push(new Location(name, type, surface));
                //обработать ошибку нормально
                fs.writeFile('./databases/game.js', 'module.exports = ' + JSON.stringify(world), (err) => { if (err) console.log(err); });
        }
        static findPlayer(pn) {
                if (pn === undefined) return -1;

                const tmpfp = findClient(pn) != -1 ? clients[findClient(pn)].loc : false,
                        place = tmpfp || db[pn].game.lastPlace[0];
                let i = null, p = null;

                if (world[place]) {
                        const w = world[place].fill;
                        let i = 0;
                        for(; i < w.length; i++) {
                                if (w[i].pn === pn) break;
                       }
                        p = (i !== w.length) ? w[i] : p;
                }
                //в возвращаемых значениях хранятся ссылки
                return {place: place, data: p};
        }
}
class Entity {
        constructor() {
                this.health = 100;
        }
}


//экземпляр класса должен быть создан до входа в игру,
//например, при регистрации
class Cat extends Entity {
        constructor() {
                super();
                this.lastPlace = [0, 56, 13]; //локация, чанкХ, чанкУ, рандомизируй
        }
}

function wsSend(type, data, socket) {
        if (type == 6) {
                for(let j = 0; j < clients.length; j++) {
                        if (clients[j].loc === data[0].place) clients[j].ws.send(JSON.stringify({
                                type: 6,
                                pn: data[0].data.pn,
                                msg: data[1],
                        }));
                }
        } else if (type == 5) {
                for(let j = 0; j < clients.length; j++) {
                        if (clients[j].loc === data[0].place) clients[j].ws.send(JSON.stringify({
                                type: 5,
                                pn: data[0].data.pn,
                                chunk: data[1],
                        }));
               }
        } else if (type == 4) {
                for(let j = 0; j < clients.length; j++) {
                  if (clients[j].loc === data.place) clients[j].ws.send(JSON.stringify({
                        type: 4,
                                cat: {
                                        pn: data.data.pn,
                                        name: data.data.name,
                                        chunk: data.data.chunk,
                                }
                  }));
            }
        } else if (type == 3) {
                socket.send(JSON.stringify({
                        type: 3,
                        loc: world[data.place],
                }));
        } else if (type == 2) {
                socket.send(JSON.stringify({
                        type: 2,
                       name: data.name,
                        chunk: data.chunk,
                }));
        }
}

wss.on('connection', (ws) => {
        let pn = undefined;

        ws.on('message', (m) => {
                const   msg = JSON.parse(m);

                if (msg.type == 102) {
			const freq = {
				headers: {
					cookie: decodeURI(m),
				}
			};
                        pn = existingCookie(freq, false);
                        let      g = World.findPlayer(pn);
                        if (!g.data) { //если он впервые заходит в игру, то этот скрипт запускается
                                const cat = {
                                                status: 'activ',
                                                pn: pn,
                                                name: db[pn].catName,
                                                //в БД 0 - локация, 1 - х, 2 - у, 3 - ориентация
                                                //в игре 0 - х, 1 - у, 2 - ориентация
                                                chunk: [db[pn].game.lastPlace[1], db[pn].game.lastPlace[2], db[pn].game.lastPlace[3]],
                                        };
                                world[g.place].fill.push(cat);
                                g = World.findPlayer(pn);
                        } else if (g.data.status === 'unactiv' || /sleep/.test(g.data.status)) {
                                g.data.status = 'activ';
                        }
                        clients.push({pn: pn, ws: ws, loc: g.place});
                        const socket = clients[findClient(pn)].ws;
                        if (socket.readyState === WebSocket.OPEN) {
                                wsSend(2, g.data, socket);
                                wsSend(3, g, socket);
                                wsSend(4, g);
                        }
                } else if (msg.type == 103) {
                        const g = World.findPlayer(pn);
                        setTimeout(() => { g.data.chunk = msg.value; }, msg.s);
                        wsSend(5, [g, msg.value]);
                } else if (msg.type = 104) {
                        const g = World.findPlayer(pn);
                        wsSend(6, [g, msg.value]);
                }
        });
        ws.on('close', () => {
                const s = findClient(pn),
                        g = World.findPlayer(pn);

                if (pn != -1 && g != -1) {
                        cash.push(g);
                        clients.splice(s, 1);
                        g.data.status = 'unactiv'; //отправить всем игрокам: статус изменился
                }
        });
});

setInterval(() => {
        for(let i = 0; i < world.length; i++) {
                for(let j = 0; j < world[i].fill.length; j++) {
                        db[world[i].fill[j].pn].game.lastPlace = [
                                i,
                                world[i].fill[j].chunk[0],
                                world[i].fill[j].chunk[1],
                                world[i].fill[j].chunk[2]
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

