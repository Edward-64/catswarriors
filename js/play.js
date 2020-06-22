'use strict'
const HOST = location.origin.replace(/^http/, 'ws'),
	headloc = document.querySelector('#headloc');
let   x = Math.floor(headloc.clientWidth / 160),
	y = Math.floor(headloc.clientHeight / 30),
	ws = new WebSocket(HOST), PN = null;
const	details = document.getElementById('details'),
	cats = document.getElementById('cats'),
	CATS = {},
	app = {
		iteractions: [],
		known: JSON.parse(localStorage.getItem('knownPlayers')),
		nearloc: document.getElementById('nearloc'),
		info: document.getElementById('info'),
		next: document.forms.next,
		itActWin: document.getElementById('iteractions'),
		fillInfoAsCat(pn) {
			this.info.innerHTML = '';
			this.info.style.display = 'block';
			if (!this.known) {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: 107 }));
				}; this.info.style.display = 'none';
			} else if (pn == PN) {
				this.info.innerHTML = 'Это Вы';
			} else if (!this.known[pn]) {
				this.info.innerHTML = 'Это неизвестный для Вас котик';
			} else {
				Object.keys(this.known[pn]).forEach(x => {
					const div = document.createElement('div');
					div.innerHTML = this.known[pn][x].item + this.known[pn][x].value;
					this.info.appendChild(div);
				});
			}
		},
		fillIteraction(pn, requiredData, interfaces, funcs, action, doLess, sendedFromServer) {
				console.log('fillIteraction', pn, requiredData, interfaces, funcs, action, doLess, sendedFromServer);
				this.itActWin.style.display = 'block';
				if (!doLess) this.iteractions.push({pn, requiredData, action});

				const buttons = this.itActWin.childNodes[1].childNodes;

				this.itActWin.childNodes[0].innerHTML = interfaces[0];
				buttons[0].textContent = interfaces[1];
				buttons[0].onclick = () => this[funcs[0]](pn, requiredData);
				buttons[1].textContent = interfaces[2];
				buttons[1].onclick = () => this[funcs[1]](pn);
				if (sendedFromServer) buttons[2].textContent = this.iteractions.length;
				else buttons[2].textContent = buttons[2].textContent ? (Number.parseInt(buttons[2].textContent) + (doLess ? -1 : 1)) : 1;
		},
		send(type, msg) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type, msg}));
			}
		},
		replaceToCatName(pn, text) {
			text = text.replace(/%catname/ig, `${app.known[pn] ? app.known[pn][0].value : 'Неизвестный котик'}`);
			return text;
		},
		nextClear(text) {
			this.next.innerHTML = '';
			document.getElementById('next').style.display = 'block';
			const firstDiv = document.createElement('div'); firstDiv.classList.add('ul');
			firstDiv.innerHTML = text;
			this.next.appendChild(firstDiv);
		},
		turnOnLowerStack() {
			this.iteractions.pop(); //this.send(109, {code: 'del'});
			let l = this.iteractions.length;
			if (l) {
				const a = this.iteractions[--l].action,
					served = [this.replaceToCatName(app.iteractions[l].pn,this.runTheActionWith[a].add.interfaces[0]),
						    this.runTheActionWith[a].add.interfaces[1],
						    this.runTheActionWith[a].add.interfaces[2]]
				this.fillIteraction(app.iteractions[l].pn, this.iteractions[l].requiredData,
				served, this.runTheActionWith[a].add.funcs, a, true);
			} else { this.itActWin.childNodes[1].childNodes[2].textContent = '0'; this.itActWin.style.display = 'none' };

		},
		showAsksAboutYou(pn, data) {
			this.nextClear('Вы можете оставлять поля пустыми, если не хотите отвечать на какой-либо вопрос.');
			const line = [
				{ q: 'Как тебя зовут?', answ: CATS[PN].name },
				{ q: 'Из какого ты племени или группы?', answ: CATS[PN].clan },
			];
			let buffer = [];
			const controlExistingData = i => {
				buffer.push({i, value: null});
				const div = document.createElement('div'), input = document.createElement('input');
				div.classList.add('ul'); div.innerHTML = line[i].q;

				input.classList.add('form'); input.style.width = '98%'; input.value = line[i].answ;
				div.appendChild(input); app.next.appendChild(div);
			}
			//если отсутствует data, то задать всевозможные вопросы, иначе только те, что перечислены в data
			if (!data) line.forEach((obj, i) => controlExistingData(i))
			else data.forEach(i => controlExistingData(i));
			const b = document.createElement('button'), endDiv = document.createElement('div'); endDiv.classList.add('ul');
			b.classList.add('form'); b.textContent = 'Рассказать';
			b.onclick = () => {
				Object.keys(app.next.elements).forEach(x => {
					if (this.next.elements[x].nodeName === 'INPUT' && buffer[x]) buffer[x].value = this.next.elements[x].value;
				});
				this.send(106, {about: buffer, to: pn});
				document.getElementById('next').style.display = 'none';
				this.turnOnLowerStack();
			}
			endDiv.appendChild(b); app.next.appendChild(endDiv);
		},
		hideAsksAboutYou(pn) {
			this.send(106, {about: null, to: pn});
			this.turnOnLowerStack();
		},
		simpleNextWindow(pn, data) { //0 - text, 1-2 are name of buttons, 3-4 are funcs
			this.nextClear(data[0]);
			const div = document.createElement('div'); div.classList.add('ul');
			for (let i = 0; i < 2; i++) {
				const b = document.createElement('button');
				b.classList.add('form'); b.style.width = '45%'; b.style.marginLeft = '5px';
				b.textContent = data[1 + i]; b.onclick = () => { data[3 + i]()};
				div.appendChild(b);
			}
			this.next.appendChild(div);
		},
		notification(data) {
			this.nextClear(data);
			const b = document.createElement('button');
			b.classList.add('form'); b.style.width = '100%'; b.style.marginTop = '5px';
			b.textContent = 'Понятно'; b.onclick = () => {
				document.getElementById('next').style.display = 'none';
			}
			this.next.appendChild(b);
		},
		statusOfAction: null,
		runTheActionMyself: {
			0: {
				status: 0,
				name: 'Ничего не делать',
				doIt(pn) {
					return;
				}
			},
			1: {
				status: 0,
				name: 'Сесть',
				doIt(pn) {
					const control = setInterval(() => {
						if (!CATS[pn].listingframes) {
							clearInterval(control);
							const cat = document.getElementById(`cat${pn}`).childNodes[1];
							cat.src = '/img/players/999.svg';
							cat.onload = () => {
								cat.width = 110 * CATS[pn].size;
								cat.height = 140 * CATS[pn].size;
							}
							if (pn == PN) {
								app.runTheActionMyself[2].status = 0;
								this.status = 1;
							}
						}
					}, 100);
				}
			},
			2: {
				status: 1,
				name: 'Встать',
				doIt(pn) {
					const cat = document.getElementById(`cat${pn}`).childNodes[1];
					cat.src = '/img/players/0.svg';
					cat.onload = () => {
						cat.width = 265 * CATS[pn].size;
						cat.height = 120 * CATS[pn].size;
					}
					if (pn == PN) {
						app.runTheActionMyself[1].status = 0;
						this.status = 1;
					}
				}
			},
		},
		runTheActionWith: {
			0: {
				status: [],
				add: null,
				name: 'Ничего не делать',
				doIt(pn) {
					return;
				}
			},
			1: {
				status: [],
				name: 'Узнать больше о котике',
				add: {
					interfaces: [`%catname хочет узнать о Вас больше`,'Ответить','Отказаться'],
					funcs: ['showAsksAboutYou', 'hideAsksAboutYou'],
				},
				doIt(pn, data, doLess, SendedFromServer) { //data is fields that must be filled. if undefined, cat asked all fields
					app.fillIteraction(pn, data, [app.replaceToCatName(pn, this.add.interfaces[0]),
					this.add.interfaces[1], this.add.interfaces[2]], this.add.funcs, 1, doLess, SendedFromServer);
				}
			},
		},
	};

window.onresize = () => {
	x = Math.floor(headloc.clientWidth / 160);
	y = Math.floor(headloc.clientHeight / 30);
}
/*
let counter = 0;
function reconnect() {
	console.log('пытаюсь проснуться...');
	counter += 10000;
	if (counter > 60000) {
		console.log('проснуться не удалось')
		counter = 0;
		return;
	}
	console.log(ws.readyState);
	try {
		ws = new WebSocket(HOST);
		ws.send(JSON.stringify({type: 102, token: document.cookie}));
		ws.onclose = () => {
			setTimeout(reconnect, 10000);
		}
	} catch (err) {
		setTimeout(reconnect, 10000);
	}
}
*/


function addCat(pn, chunk) {
	const div = document.createElement('div'); let scale = 'scale(-1, 1)', widthCat = 70,
		actions = document.createElement('span');
	if (chunk[2]) { scale = 'scale(1)'; widthCat = 200; }
	div.innerHTML = `</div><div></div><img style="transform: ${scale}"` +
	`src="/img/players/0.svg" width="${265 * CATS[pn].size}" height="${120 * CATS[pn].size}"><img src="/css/img/lowMsg.png"` +
	` style="position: absolute; bottom: ${120 * CATS[pn].size - 7}px; right: 0px; display: none">`;
	div.classList.add('cat');
	div.id = `cat${pn}`;
	div.style.left = `${chunk[0] * x - widthCat * CATS[pn].size}px`;
	div.style.bottom = `${chunk[1] * y}px`;
	div.style.zIndex = 100 - chunk[1];

	actions.classList.add('style-of-game');
	actions.classList.add('action-window');

	div.onclick = () => {
		actions.innerHTML = '';
		actions.style.display = 'block';
		if (pn == PN) {
			Object.keys(app.runTheActionMyself).forEach(i => {
				i = Number.parseInt(i);
				if ((i && app.statusOfAction == i) || app.runTheActionMyself[i].status) return;
				let b = document.createElement('button');
				b.style.marginBottom = '3px'; b.style.width = '150px';
				b.classList.add('form'); b.textContent = app.runTheActionMyself[i].name;
				b.onclick = (e) => {
					actions.style.display = 'none';
					if (e.target.tagName != 'BUTTOM') e.stopPropagation();
					app.send(108, {i});
					app.statusOfAction = i;
				}
				actions.appendChild(b);
			});
		} else {
			Object.keys(app.runTheActionWith).forEach(i => {
				i = Number.parseInt(i);
				if ((i && app.statusOfAction == -i) || app.runTheActionWith[i].status.some(j => pn == j)) return;
				let b = document.createElement('button');
				b.style.marginBottom = '3px'; b.style.width = '150px';
				b.classList.add('form'); b.textContent = app.runTheActionWith[i].name;
				b.onclick = (e) => {
					actions.style.display = 'none';
					if (e.target.tagName != 'BUTTOM') e.stopPropagation();
					app.send(108, {pn, i: -i});
					app.statusOfAction = -i;
					if (i) app.runTheActionWith[i].status.push(pn);
				}
				actions.appendChild(b);
			});
		}
	}
	div.onmouseover = () => {
		app.fillInfoAsCat(pn);
	}
	div.onmouseout = () => {
		app.info.style.display = 'none';
	}
	div.appendChild(actions);
	cats.appendChild(div);
}

function serveChunk(crd) {
	crd[0] = Math.floor(crd[0] / x);
	crd[1] = 30 - Math.floor(crd[1] / y);
	return crd;
}

function addMeow(pn, msg) {
	let	catMsg = document.getElementById(`cat${pn}`).childNodes[0], maxMsg = 3, font = '';
	const	newMsg = document.createElement('div');

	if (msg.length > 60) maxMsg = 2;
	else if (msg.length < 30) maxMsg = 5;

	if (CATS[pn].size < 0.4) font = 'font-size:7pt;'
	else if (CATS[pn].size < 0.5) font = 'font-size:8pt;'
	else if (CATS[pn].size < 0.7) font = 'font-size:9pt;'

	catMsg.style.maxWidth = `${265 * CATS[pn].size}px`;
	if (CATS[pn].lastPlace[2]) catMsg.style.textAlign = 'right';
	if (catMsg.childNodes.length >= maxMsg) catMsg.childNodes[0].remove();
	newMsg.classList.add('msg-on-cat');
	msg  = `<div class="style-of-game" style="display: inline-block;${font}">${msg}</div>`;
	newMsg.innerHTML = msg;

	const deleteMsg = catMsg.appendChild(newMsg);
	setTimeout(() => {
		deleteMsg.remove();
	}, 15000);
}

function sendMeow() {
	app.send(104, { value: document.forms.meowing.elements.meowing.value });
	if (ws.readyState === WebSocket.OPEN) document.forms.meowing.reset()
	else app.notification('Сообщение не отправлено');
}

function changeOrient(pn, o, widthCat) {
	const cat = document.getElementById(`cat${pn}`);
	if (o) {
		cat.childNodes[1].style.transform = 'scale(1)';
		cat.childNodes[0].style.textAlign = 'right';
	} else {
		cat.childNodes[1].style.transform = 'scale(-1, 1)';
		cat.childNodes[0].style.textAlign = '';
		if (widthCat) widthCat = 70 * CATS[pn].size;
	}
}

function animation(pn, s) {
	clearTimeout(CATS[pn].steping); clearInterval(CATS[pn].listingframes); CATS[pn].lastPlace = s.oldchunk;
	const cat = document.getElementById(`cat${pn}`),
		step = (s.newchunk[1] - s.oldchunk[1]) * CATS[pn].speed / s.dis;
	let   widthCat = 200 * CATS[pn].size;

	CATS[pn].lastPlace[2] = s.newchunk[2];
	changeOrient(pn, s.newchunk[2], widthCat);

	for(let i = 0; i < s.dis; i+=CATS[pn].speed) {
		CATS[pn].steping = setTimeout(() => {
			if (!CATS[pn]) return;
			cat.style.zIndex = 100 -  Math.round(CATS[pn].lastPlace[1] += step);
		}, i);
	}
	let j = 1;
	CATS[pn].listingframes = setInterval(() => {
			if (j > 6) j = 1;
			cat.childNodes[1].src = `/img/players/${j++}.svg`;
	}, 41 * 4);
	cat.style.transition = `left ${s.dis}ms linear, bottom ${s.dis}ms linear`;
	cat.style.left = `${s.newchunk[0] * x - widthCat}px`;
	cat.style.bottom = `${s.newchunk[1] * y}px`;
	cat.ontransitionend = () => {
		clearInterval(CATS[pn].listingframes); CATS[pn].listingframes = null;
		cat.childNodes[1].src = '/img/players/0.svg';
	};
}
ws.onopen = () => {
	ws.send(JSON.stringify({type: 102, msg: { token: document.cookie }}));
}

ws.onmessage = (e) => {
	if (ws.readyState === WebSocket.OPEN) {
		let {type, data} = JSON.parse(e.data);
		switch (type) {
			case 2: {
				PN = data.pn; CATS[PN] = {};
				CATS[PN].name = data.name;
				CATS[PN].clan = data.clan;
				app.iteractions = data.itr;
				const l = data.itr.length - 1;
				if (l >= 0) app.runTheActionWith[data.itr[l].action].doIt(data.itr[l].pn, data.itr[l].data, true, true);
				break;
			} case 3: {
				if (data.del) {
					cats.innerHTML = ''; details.innerHTML = '';
					for(let pn in CATS) {
						if (pn == PN) continue;
						delete CATS[pn];
					}
//					addCat(PN, data.chunk);
				}
				let l = data.loc.fill.length;
				for(let j = 0; j < l; j++) {
					if (data.loc.fill[j].pn == PN) CATS[PN] = Object.assign(CATS[PN], data.loc.fill[j])
					else CATS[data.loc.fill[j].pn] = data.loc.fill[j];
					CATS[data.loc.fill[j].pn].listingframes = null;
					CATS[data.loc.fill[j].pn].steping = null;
					addCat(data.loc.fill[j].pn, data.loc.fill[j].lastPlace);
					if (data.loc.fill[j].action > 0) app.runTheActionMyself[data.loc.fill[j].action].doIt(data.loc.fill[j].pn);
					else if (data.loc.fill[j].action < 0) app.runTheActionWith[data.loc.fill[j].action].doIt(data.loc.fill[j].pn);
				}
				headloc.style.background = `url('${data.loc.surface}')`;
				app.nearloc.style.background = `url('${data.loc.surface}')`;
				app.nearloc.style.opacity = '.7';
				l = data.loc.landscape.length;
				for(let j = 0; j < l; j++) {
					const newdetail = document.createElement('img');
					if (!data.loc.landscape[j].disallow) newdetail.style.pointerEvents = 'none';
					newdetail.src = data.loc.landscape[j].texture;
					newdetail.width = data.loc.landscape[j].width;
					newdetail.height = data.loc.landscape[j].height;
					newdetail.style.position = 'absolute';
					if (data.loc.landscape[j].low) newdetail.style.zIndex = data.loc.landscape[j].low
					else newdetail.style.zIndex = 100 -  data.loc.landscape[j].chunk[1];
					newdetail.style.left = `${data.loc.landscape[j].chunk[0] * x}px`;
					newdetail.style.bottom = `${data.loc.landscape[j].chunk[1] * y}px`;
					details.appendChild(newdetail);
				} break;
			} case 5: { animation(data.pn, data.s); break;
			} case 13: { changeOrient(data.pn, data.o);
			} case 4: {
				let checkAdd = true;
				for(let pn in CATS) {
					if (CATS.hasOwnProperty(pn) && (data.pn == PN || data.pn == pn)) {
						checkAdd = false;
						break;
					}
				}
				if (checkAdd) {
					CATS[data.pn] = data;
					CATS[data.pn].listingframes = null;
					CATS[data.pn].steping = null;
					addCat(data.pn, data.lastPlace);
				} break;
			} case 6: { addMeow(data.pn, data.msg); break;
			} case 10: {
				if (data.i > 0) app.runTheActionMyself[data.i].doIt(data.pn, data.data);
				else if (data.i < 0) app.runTheActionWith[-data.i].doIt(data.pn, data.data); break;
			} case 11: {
				let b = app.runTheActionWith[1].status.indexOf(data.pn);
				if (~b) app.runTheActionWith[1].status.splice(b, 1);

				let buffer = '', d = data.sendedData;
				if (d[0]) buffer += `${CATS[data.pn].gender ? 'Кот' : 'Кошка'} представил${CATS[data.pn].gender ? 'ся' : 'ась'} как ${data.sendedData[0].value}. `
				else buffer += `${CATS[data.pn].gender ? 'Кот' : 'Кошка'} не назвал${CATS[data.pn].gender ? '' : 'a'} своего имени. `;
				if (d[1]) buffer += `${CATS[data.pn].gender ? 'Его' : 'Её'} принадлежность — это ${data.sendedData[1].value}. `
				else buffer += `${CATS[data.pn].gender ? 'Он' : 'Она'} не сказал${CATS[data.pn].gender ? '' : 'a'}, племенн` +
				`${CATS[data.pn].gender ? 'ой' : 'ая'} ли ${CATS[data.pn].gender ? 'он' : 'она'}, одиночка, либо кто-то ещё.`;

				app.simpleNextWindow(data.pn, [buffer, 'Запомнить', 'Не запоминать',
					() => {
						app.known[data.pn] = data.sendedData;
						localStorage.setItem('knownPlayers', JSON.stringify(app.known));
						document.getElementById('next').style.display = 'none';
						app.send(109, {pn: data.pn, data: data.sendedData});
					},
					() => {
						document.getElementById('next').style.display = 'none';
					}]); break;
			} case 12: {
				app.notification(app.replaceToCatName(data.add.pn, data.msg));
				break;
			} case 8: {
				if (data != PN) {
					document.getElementById(`cat${data}`).remove();
					delete CATS[data];
				} break;
			} case 7: {
				alert(data); break;
			} case 9: {
				localStorage.setItem('knownPlayers', JSON.stringify(data)); app.known = data; break;
			}
		}
	}
}

headloc.onmousedown = (e) => {
	const excess = document.querySelector('#sky').clientHeight + document.querySelector('#nearloc').clientHeight;
	app.send(103, { value: serveChunk([e.pageX, e.pageY - excess]) });
}

ws.onclose = () => {
	console.log('соединение закрылось');
//	reconnect();
}
