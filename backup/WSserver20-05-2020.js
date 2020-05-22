const WebSocket = require('ws'),
	WebSocketServer = WebSocket.Server,
	wss = new WebSocketServer({port: 8181}),
	fs = require('fs'),
	world = require('./databases/game.js'), //нужно сохранять периодически
	db = require('./databases/cats.js'),
	ch = require('./lib/cookie.js').include(db);

const clients = [];

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
		//	chunk: [x, y],
		//	type: 'куст',
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
			place = tmpfp || db[pn].game.lastPlace[0],
			chunk = [db[pn].game.lastPlace[1], db[pn].game.lastPlace[2]];
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
		return {place: place, chunk: chunk, data: p};
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
	if (type === 'rnc') { //изменение координат
		for(let j = 0; j < clients.length; j++) {
			if (clients[j].loc === data[0].place) clients[j].ws.send(JSON.stringify({
				type: 'recrd',
				pn: data[0].data.pn,
				chunks: data[1],
			}));
		}
	} else if (type === 'newcat') { //зашел на локацию
		for(let j = 0; j < clients.length; j++) {
                  if (clients[j].loc === data.place) clients[j].ws.send(JSON.stringify({
                        type: 'newcat',
				cat: {
					pn: data.data.pn,
					name: data.data.name,
					chunks: data.data.chunk,
				}
                  }));
            }
	} else if (type === 'stateOfLoc') { //состояние локации (кто и что)
		socket.send(JSON.stringify({
			type: 'stLoc',
			loc: world[data.place],
		}));
	} else if (type === 'in') {
		socket.send(JSON.stringify({
			type: 'in',
			pn: data.pn,
			name: data.name,
			chunk: data.chunk,
		}));
	}
}

wss.on('connection', (ws) => {
	console.log('client connected!');
	let pn = undefined;

	ws.on('message', (m) => {
		const	msg = JSON.parse(m);

		if (msg.type === 'pn') { //от клиента пришло сообщение, что он зашел в игру
			pn = ch.existingCookie(decodeURI(m), false);
			let	 g = World.findPlayer(pn);

			console.log('this client is ', db[pn].catName);

			if (!g.data) { //если он впервые заходит в игру, то этот скрипт запускается
				const cat = {
						status: 'activ',
						pn: pn,
						name: db[pn].catName,
						chunk: g.chunk,
					};
				world[g.place].fill.push(cat);
				g = World.findPlayer(pn);
			} else if (g.data.status === 'unactiv' || /sleep/.test(g.data.status)) {
				g.data.status = 'activ';
			}

			console.log('near the location is: ', world[g.place].fill);

			clients.push({pn: pn, ws: ws, loc: g.place}); //добавляем в массив clients
			const socket = clients[findClient(pn)].ws;
			if (socket.readyState === WebSocket.OPEN) {
				wsSend('in', g.data, socket); //первый заход в игру
				wsSend('stateOfLoc', g, socket); //состояние локации (вид, кто на ней)
				wsSend('newcat', g); //сказать всем, что котик зашел на локацию
			}
		} else if (msg.type === 'newcrd') { //клиент перемещается
			const g = World.findPlayer(pn);
			g.data.chunk = msg.value;
			wsSend('rnc', [g, msg.value]);
		}
	});
	ws.on('close', () => {
		const s = findClient(pn),
			g = World.findPlayer(pn);

		if (pn != -1 && g != -1) {
			clients.splice(s, 1);
			g.data.status = 'unactiv'; //отправить всем игрокам: статус изменился
			console.log(db[pn].catName, 'has disconected\n');
		}
	});
});

setInterval(() => {
	for(let i = 0; i < world.length; i++) {
		for(let j = 0; j < world[i].fill.length; j++) {
			db[world[i].fill[j].pn].game.lastPlace = [i, world[i].fill[j].chunk[0], world[i].fill[j].chunk[1]];
		}
	}
	fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(db), (err) => {
		if (err) console.log(err); //тут тоже нужен нормальный обработчик ошибок
	});
	console.log('it`s happened');
}, 9000000);

