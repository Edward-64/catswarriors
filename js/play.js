'use strict'
const HOST = location.origin.replace(/^http/, 'ws'),
	headloc = document.querySelector('#headloc'),
	req = new XMLHttpRequest();
let   x = Math.floor(headloc.clientWidth / 160),
	y = Math.floor(headloc.clientHeight / 30),
	ws = new WebSocket(HOST, 'play'), PN = null;
const	details = document.getElementById('details'),
	cats = document.getElementById('cats'),
	CATS = {},
	app = {
		iteractions: [],
		known: null,
		nearloc: document.getElementById('nearloc'),
		info: document.getElementById('info'),
		next: document.forms.next,
		itActWin: document.getElementById('iteractions'),
		fillInfoAsCat(pn) {
			this.info.innerHTML = '';
			this.info.style.display = 'block';
			if (pn == PN) {
				this.info.innerHTML = 'Это я';
			} else if (!this.known[pn]) {
				this.info.innerHTML = 'Я не знаю этого котика... Или не помню.';
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

				const buttons = this.itActWin.children[1].children;

				this.itActWin.children[0].innerHTML = interfaces[0];
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
			text = text.replace(/%catname/ig, `${app.known[pn] && app.known[pn][0] ? app.known[pn][0].value : 'Неизвестный котик'}`);
			return text;
		},
		nextClear(text) {
			this.next.innerHTML = '';
			document.getElementById('next').style.display = 'block';
			if (text) {
				const firstDiv = document.createElement('div'); firstDiv.classList.add('ul');
				firstDiv.innerHTML = text;
				this.next.appendChild(firstDiv);
			}
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
			} else { this.itActWin.children[1].children[2].textContent = '0'; this.itActWin.style.display = 'none' };

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
		actionsMyself() {
			this.nextClear('Выполнить действие с самим собой: ');
			Object.keys(this.runTheActionMyself).forEach(i => {
				i = +i; if ((i && app.statusOfAction == i) || app.runTheActionMyself[i].status) return;

				console.log(i);

				let b = document.createElement('button');
				b.style.marginBottom = '3px'; b.style.width = '98%'; b.style.display = 'block';
				b.classList.add('form'); b.textContent = app.runTheActionMyself[i].name;
				b.addEventListener('click', () => {
					document.getElementById('next').style.display = 'none';
					this.send(108, {i});
					this.statusOfAction = i;
				}, {once:true});

				this.next.appendChild(b);
			});
		},
		actionsWith(pn) {
			const msg = this.known[pn] && this.known[pn][0] ? `Взаимодействовать c ${CATS[pn].gender ? 'котом' : 'кошкой'}` +
			` по имени ${this.known[pn][0].value}` : 'Взаимодействовать c неизвестным котиком';
			if (!document.getElementById('with')) {
				const b = document.createElement('div');
				b.classList.add('style-of-game'); b.classList.add('part-of-actions'); //b.classList.add('lower-text');
				b.title = msg;
				b.id = 'with'; b.innerHTML = '<img src="/img/2.svg" width="40" height="40">';
				document.getElementById('actions').appendChild(b);
			}
			document.getElementById('with').onclick = () => {
				this.nextClear(msg + ': ');
				Object.keys(this.runTheActionWith).forEach(i => {
					i = +i; if ((i && this.statusOfAction == -i) || this.runTheActionWith[i].status.some(j => pn == j)) return;

					let b = document.createElement('button');
					b.style.marginBottom = '3px'; b.style.width = '98%';
					b.classList.add('form'); b.textContent = this.runTheActionWith[i].name;
					b.addEventListener('click', () => {
						document.getElementById('next').style.display = 'none';
						this.send(108, {pn, i: -i});
						this.statusOfAction = -i;
						if (i) this.runTheActionWith[i].status.push(pn);
					}, {once:true});

					this.next.appendChild(b);
				});
			}
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
							const cat = document.getElementById(`cat${pn}`).children[1];
							cat.style.backgroundPositionX = -220 * CATS[pn].size + 'px';
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
					const cat = document.getElementById(`cat${pn}`).children[1];
					cat.style.backgroundPositionX = '0px';
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

function addCat(pn, chunk) {
	const div = document.createElement('div'); let scale = 'scale(-1, 1)', widthCat = 40 * CATS[pn].size,
		actions = '0px';
	if (chunk[2]) { scale = 'scale(1)'; widthCat = 108 * CATS[pn].size; }

	if (CATS[pn].status != 'go') actions = -440 * CATS[pn].size + 'px'
	else if (CATS[pn].action == 1) actions = -220 * CATS[pn].size + 'px';

	div.innerHTML = `<div></div><div style="transform: ${scale}; background: url(${CATS[pn].skin});` +
	`background-position-x: ${actions}; background-repeat: no-repeat;` +
	`width:${220 * CATS[pn].size + 'px'};height:${140 * CATS[pn].size + 'px'}; background-size:1200%;"></div>`;

	div.classList.add('cat');
	div.id = `cat${pn}`;
	div.style.left = `${chunk[0] * x - widthCat * CATS[pn].size}px`;
	div.style.bottom = `${chunk[1] * y}px`;
	div.style.zIndex = Math.floor(100 - chunk[1]);

	div.addEventListener('mouseover', () => {
		app.fillInfoAsCat(pn);
		if (pn != PN) app.actionsWith(pn);
	});
	div.addEventListener('mouseout', () => {
		app.info.style.display = 'none';
	});

	cats.appendChild(div);
}

function serveChunk(crd) {
	crd[0] = Math.floor(crd[0] / x);
	crd[1] = 30 - Math.floor(crd[1] / y);
	return crd;
}

function addMeow(pn, msg) {
	let	catMsg = document.getElementById(`cat${pn}`).children[0], maxMsg = 3, font = '';
	const	newMsg = document.createElement('div');

	if (msg.length > 60) maxMsg = 2;
	else if (msg.length < 30) maxMsg = 5;

	if (CATS[pn].size < 0.4) font = 'font-size:7pt;'
	else if (CATS[pn].size < 0.5) font = 'font-size:8pt;'
	else if (CATS[pn].size < 0.8) font = 'font-size:9pt;'

	catMsg.style.maxWidth = `${300 * CATS[pn].size}px`;
	if (catMsg.children.length >= maxMsg) catMsg.children[0].remove();
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
	const cat = document.getElementById(`cat${pn}`); o = +o;
	if (o) {
		cat.children[1].style.transform = 'scale(1)';
		if (widthCat) return 108 * (CATS[pn].size + 0.3);
	} else {
		cat.children[1].style.transform = 'scale(-1, 1)';
		if (widthCat) return 40 * (CATS[pn].size + 0.3);
	}
}

function animation(pn, s) {
	clearTimeout(CATS[pn].steping); clearInterval(CATS[pn].listingframes); CATS[pn].lastPlace = s.oldchunk;
	const cat = document.getElementById(`cat${pn}`),
		step = (s.newchunk[1] - s.oldchunk[1]) * CATS[pn].speed / s.dis;
	let   widthCat = true;

	CATS[pn].lastPlace[2] = s.newchunk[2];
	widthCat = changeOrient(pn, s.newchunk[2], widthCat);

	for(let i = 0; i < s.dis; i+=CATS[pn].speed) {
		CATS[pn].steping = setTimeout(() => {
			if (!CATS[pn]) return;
			cat.style.zIndex = 100 -  Math.round(CATS[pn].lastPlace[1] += step);
		}, i);
	}
	let	buffer = -880 * CATS[pn].size,
		start = buffer,
		next = -220 * CATS[pn].size,
		stop = -2540 * CATS[pn].size;
	CATS[pn].listingframes = setInterval(() => {
		if (buffer < stop) buffer = start;
		cat.children[1].style.backgroundPositionX = `${buffer}px`;
		buffer += next;
	}, 121);
	cat.style.transition = `left ${s.dis}ms linear, bottom ${s.dis}ms linear`;
	cat.style.left = `${s.newchunk[0] * x - widthCat}px`;
	cat.style.bottom = `${s.newchunk[1] * y}px`;
	cat.ontransitionend = () => {
		clearInterval(CATS[pn].listingframes); CATS[pn].listingframes = null;
		cat.children[1].style.backgroundPositionX = '0px';
	};
}
ws.onopen = () => {
      req.open('GET', '/getcookie', true);
      req.send();
      req.onload = () => {
            const {res, cookie, alias} = JSON.parse(req.response);
            if (res) app.send(102, `auth=${cookie}; alias=${alias}`)
      	else app.displayError('Не удалось подключиться к серверу');
      }
}

ws.onmessage = (e) => {
	if (ws.readyState === WebSocket.OPEN) {
		let {type, data} = JSON.parse(e.data);
		console.log(type, data);
		switch (type) {
			case 2: {
				PN = data.pn; CATS[PN] = {};
				CATS[PN].name = data.name;
				CATS[PN].clan = data.clan;
				app.known = data.known;
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
				}
				let l = data.loc.fill.length;
				for(let j = 0; j < l; j++) {
					if (data.loc.fill[j].pn == PN) CATS[PN] = Object.assign(CATS[PN], data.loc.fill[j])
					else CATS[data.loc.fill[j].pn] = data.loc.fill[j];
					CATS[data.loc.fill[j].pn].listingframes = null;
					CATS[data.loc.fill[j].pn].steping = null;
					addCat(data.loc.fill[j].pn, data.loc.fill[j].lastPlace);
					if (data.loc.fill[j].pn == PN) {
						if (data.loc.fill[j].action > 0) app.runTheActionMyself[data.loc.fill[j].action].doIt(data.loc.fill[j].pn);
						else if (data.loc.fill[j].action < 0) app.runTheActionWith[data.loc.fill[j].action].doIt(data.loc.fill[j].pn);
					}
				}
				headloc.style.backgroundImage = `url('${data.loc.surface}')`;
				app.nearloc.style.backgroundImage = `url('${data.loc.surface}')`;
				app.nearloc.style.opacity = '.7';
				l = data.loc.landscape.length;
				for(let j = 0; j < l; j++) {
					const newdetail = document.createElement('img');
					newdetail.style.pointerEvents = 'none';
					newdetail.src = data.loc.landscape[j].texture;
					newdetail.width = data.loc.landscape[j].width;
					newdetail.height = data.loc.landscape[j].height;
					newdetail.style.position = 'absolute';
					if (data.loc.landscape[j].z) newdetail.style.zIndex = data.loc.landscape[j].z
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
						app.known[data.pn] = {};
                                    for (let p in data.sendedData) {
                                          if (!data.sendedData.hasOwnProperty(p)) continue;
                                          app.known[data.pn][p] = data.sendedData[p];
                                    }
						document.getElementById('next').style.display = 'none';
						app.send(109, {pn: data.pn, data: data.sendedData});
					},
					() => {
						document.getElementById('next').style.display = 'none';
					}]); break;
			} case 12:
				app.notification(app.replaceToCatName(data.add.pn, data.msg)); break;
			  case 8:
				if (data != PN) {
					document.getElementById(`cat${data}`).remove();
					delete CATS[data];
				} break;
			  case 7: app.notification(data); break;
			  case 14: {
				const c = document.getElementById(`cat${data.pn}`).children[1].style;
				if (data.s === 'go') {
					if (data.pn == PN) document.getElementById('sleeping').style.display = 'none';
					if (CATS[data.pn].action == 1) c.backgroundPositionX = -220 * CATS[data.pn].size + 'px'
					else c.backgroundPositionX = '0px'
				} else {
					if (data.pn == PN) document.getElementById('sleeping').style.display = 'block';
					c.backgroundPositionX = -440 * CATS[data.pn].size + 'px';
				}
			}
		}
	}
}

document.getElementById('sleeping').addEventListener('click', () => {
	if (ws.readyState === WebSocket.OPEN) {
		document.getElementById('sleeping').style.display = 'none';
		app.send(105);
	} else window.location='/play';
});
headloc.addEventListener('mousedown', (e) => {
	const excess = document.querySelector('#sky').clientHeight + document.querySelector('#nearloc').clientHeight;
	console.log(serveChunk([e.pageX, e.pageY - excess]));
	app.send(103, { value: serveChunk([e.pageX, e.pageY - excess]) });
});

ws.onclose = () => {
	document.getElementById('sleeping').style.display = 'block';
	console.log('соединение закрылось');
}
