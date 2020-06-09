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
		known: JSON.parse(localStorage.getItem('knownPlayers')),
		nearloc: document.getElementById('nearloc'),
		info: document.getElementById('info'),
		fillInfoAsCat(pn) {
			this.info.innerHTML = '';
			if (!this.known) {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: 107 }));
				};
//			} else if (pn == PN) {
//				this.info.innerHTML = 'Это Вы';
			} else if (Object.keys(this.known).length == 0) {
				this.info.innerHTML = 'Это неизвестный для Вас котик';
			} else {
				Object.keys(this.known[pn]).forEach(x => {
					const div = document.createElement('div');
					div.innerHTML = this.known[pn][x].item + this.known[pn][x].value;
					this.info.appendChild(div);
				});
			}
		}
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
	const div = document.createElement('div'); let scale = 'scale(-1, 1)', widthCat = 70;
	if (chunk[2]) { scale = 'scale(1)'; widthCat = 200; }
	div.innerHTML = `</div><div></div><img style="transform: ${scale}"` +
	`src="/img/players/0.svg" width="${265 * CATS[pn].size}" height="${120 * CATS[pn].size}"><img src="/css/img/lowMsg.png"` +
	` style="position: absolute; bottom: ${120 * CATS[pn].size - 7}px; right: 0px; display: none">`;
	div.classList.add('cat');
	div.id = `cat${pn}`;
	div.style.left = `${chunk[0] * x - widthCat * CATS[pn].size}px`;
	div.style.bottom = `${chunk[1] * y}px`;
	div.style.zIndex = 100 - chunk[1];
	div.onmouseover = () => {
		app.fillInfoAsCat(pn);
		app.info.style.display = 'block';
	}
	div.onmouseout = () => {
		app.info.style.display = 'none';
	}
	cats.appendChild(div);
}

function serveChunk(crd) {
	crd[0] = Math.floor(crd[0] / x);
	crd[1] = 30 - Math.floor(crd[1] / y);
	return crd;
}

function updateChunk(chunk) {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 103, msg: { value: chunk }}));
	}
}

function addMeow(pn, msg) {
	msg = msg.match(/[^\s]{0,30}/g).join(' ');

	let	catMsg = document.getElementById(`cat${pn}`).childNodes[0], maxMsg = 2;
	const	newMsg = document.createElement('div'), catWidth = `${265 * CATS[pn].size}px`,
		pic = document.getElementById(`cat${pn}`).childNodes[2];
	if (msg.length > 200) {
		msg = msg.slice(0, 200) + ' ...';
		maxMsg = 0;
	}
	if (msg.length > 60) maxMsg = 1;
	if (msg.length < 10) maxMsg = 4;
	catMsg.style.width = catWidth;
	if (CATS[pn].lastPlace[2]) {
		catMsg.style.textAlign = 'right';
		pic.style.right = '0px';
		pic.style.transform = 'scale(1)';
	} else {
		pic.style.right = 'unset';
		pic.style.transform = 'scale(-1, 1)';
	}
	if (catMsg.childNodes.length > maxMsg) {
		catMsg.childNodes[0].remove();
	}
	newMsg.classList.add('msg-on-cat');
	pic.style.display = 'block';
	msg  = `<div class="style-of-game" style="display: inline-block">${msg}</div>`;
	newMsg.innerHTML = msg;

	const deleteMsg = catMsg.appendChild(newMsg);
	setTimeout(() => {
		deleteMsg.remove(); if (catMsg.childNodes.length == 0) pic.style.display = 'none';
	}, 10000);
}

function sendMeow() {
	const meow = document.forms.meowing.elements.meowing.value;
	if (!meow || !meow.replace(/\s/g, '')) return;
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 104, msg: { value: meow }}))
	};
	document.forms.meowing.reset();
}

function animation(pn, s) {
	clearTimeout(CATS[pn].steping); clearInterval(CATS[pn].listingframes); CATS[pn].lastPlace = s.oldchunk;
	const cat = document.getElementById(`cat${pn}`),
		step = (s.newchunk[1] - s.oldchunk[1]) * CATS[pn].speed / s.dis,
		orient = s.newchunk[0] - s.oldchunk[0],
		pic = document.getElementById(`cat${pn}`).childNodes[2].style;
	let   widthCat = 200 * CATS[pn].size;

	if (orient < 0) {
            cat.childNodes[1].style.transform = 'scale(-1, 1)';
            widthCat = 70 * CATS[pn].size; CATS[pn].lastPlace[2] = 0;
		document.getElementById(`cat${pn}`).childNodes[0].style.textAlign = '';
		pic.right = 'unset'; pic.transform = 'scale(-1, 1)';
	} else if (orient > 0) {
		cat.childNodes[1].style.transform = 'scale(1)';
		CATS[pn].lastPlace[2] = 1; document.getElementById(`cat${pn}`).childNodes[0].style.textAlign = 'right';
		pic.right = '0px'; pic.transform = 'scale(1)';
	}

	for(let i = 0; i < s.dis; i+=CATS[pn].speed) {
		CATS[pn].steping = setTimeout(() => {
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
		clearInterval(CATS[pn].listingframes);
		cat.childNodes[1].src = '/img/players/0.svg';
	};
}
ws.onopen = () => {
	ws.send(JSON.stringify({type: 102, msg: { token: document.cookie }}));
}

ws.onmessage = (e) => {
	if (ws.readyState === WebSocket.OPEN) {
		let {type, data} = JSON.parse(e.data);
		if (typeof type === 'string') type = Number.parseInt(type);
		switch (type) {
			case 2:
				PN = data.pn;
				break;
			case 3:
				if (data.del) {
					cats.innerHTML = ''; details.innerHTML = '';
					for(let pn in CATS) {
						if (pn == PN) continue;
						delete CATS[pn];
					}
					addCat(PN, data.chunk);
				}
				let l = data.loc.fill.length;
				for(let j = 0; j < l; j++) {
					CATS[data.loc.fill[j].pn] = data.loc.fill[j];
					CATS[data.loc.fill[j].pn].listingframes = null;
					CATS[data.loc.fill[j].pn].steping = null;
					addCat(data.loc.fill[j].pn, data.loc.fill[j].lastPlace);
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
			case 5:
				animation(data.pn, data.s); break;
			case 4:
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
			case 6: addMeow(data.pn, data.msg); break;
			case 8:
				if (data != PN) {
					document.getElementById(`cat${data}`).remove();
					delete CATS[data];
				} break;
		}
	}
}

headloc.onmousedown = (e) => {
	const excess = document.querySelector('#sky').clientHeight + document.querySelector('#nearloc').clientHeight,
	chunk = serveChunk([e.pageX, e.pageY - excess]);
	updateChunk(chunk);
}

ws.onclose = () => {
	console.log('соединение закрылось');
//	reconnect();
}
