const HOST = location.origin.replace(/^http/, 'ws'),
	ws = new WebSocket(HOST),
	place = document.getElementById('headloc'),
	mouselistener = document.getElementById('mouselistener'),
	gameplace = document.getElementById('place'),
	CATS = {
		0: {
			pn: undefined,
			name: undefined,
			chunk: [],
			orient: undefined, //0 лево, 1 право
			time: [],
		},
	}, headloc = document.querySelector('#headloc');
let   x = Math.round(headloc.clientWidth / 160),
	y = Math.round(headloc.clientHeight / 30);

window.onresize = () => {
	x = Math.round(headloc.clientWidth / 160);
	y = Math.round(headloc.clientHeight / 30);
}

const meowing = document.getElementById('meowing');
meowing.style.left = `${headloc.clientWidth * 0.5 - document.querySelector('#meowing').clientWidth / 2}px`


function addCat(pn, chunk) {
	const div = document.createElement('div'); let scale = 'scale(-1, 1)';
	if (CATS[pn].orient) scale = 'scale(1)';
	div.innerHTML = `<div></div><div style="background: url('img/players/0.svg') no-repeat;` +
	` transform:${scale}; width: 265px; height: 120px;"><img src="/css/img/lowMsg.png" style="position: absolute; top: -2px; right: 0px; display: none"></div>`;
	div.classList.add('cat');
	div.id = `cat${pn}`;
	div.style.left = `${chunk[0] * x}px`;
	div.style.bottom = `${chunk[1] * y}px`;
	div.style.zIndex = 100 - chunk[1];
	place.appendChild(div);
}

function serveChunk(crd) {
	crd[0] = Math.floor(crd[0] / x);
	crd[1] = 30 - Math.floor(crd[1] / y);
	return crd;
}

function updateChunk(s) {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 103, value: [Math.floor(CATS[0].chunk[0]), Math.floor(CATS[0].chunk[1]), CATS[0].orient], s: s, }));
	}
}

function addMeow(pn, msg) {
	if (!msg) return;
	let	catMsg = document.getElementById(`cat${pn}`).childNodes[0], maxMsg = 4;
	const	newMsg = document.createElement('div'), catWidth = `${265}px`,
		pic = document.getElementById(`cat${pn}`).childNodes[1].childNodes[0];
	msg = msg.slice(0, 200); if (msg.length > 60) { maxMsg = 1; }
	catMsg.style.width = catWidth; if (CATS[pn].orient) catMsg.style.textAlign = 'right';
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
	addMeow(0, meow);
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 104, value: meow}))
	};
	document.forms.meowing.reset();
}

function animation(pn, newchunk, oldchunk, SPEED) {
	const cat = document.getElementById(`cat${pn}`),
		disX = newchunk[0] - oldchunk[0], disY = newchunk[1] - oldchunk[1],
		dis = Math.round(Math.sqrt(Math.pow(disX, 2) + Math.pow(disY, 2) + 0.6)) * SPEED;
	let	widthCat = 200, stepX = disX * SPEED / dis, stepY = disY * SPEED / dis;
//	if (cat.style.animationPlayState === 'running') {
//		cat.style.animationPlayState = 'paused';
//		cat.childNodes[1].classList.remove('animation');
//		return;
//	}
	if (stepX  < 0) {
            cat.childNodes[1].style.transform = 'scale(-1, 1)'
            widthCat = 70; CATS[pn].orient = 0;
		document.getElementById(`cat${pn}`).childNodes[0].style.textAlign = '';
      } else {
            cat.childNodes[1].style.transform = 'scale(1)';
		CATS[pn].orient = 1; document.getElementById(`cat${pn}`).childNodes[0].style.textAlign = 'right';
      }
	if (pn == 0) { CATS[0].chunk = newchunk; updateChunk(dis); CATS[0].chunk = oldchunk; }
	cat.style.animationPlayState = 'running';
	for(let i = 0; i < dis; i+=SPEED) {
		const control = setTimeout(() => {
			if (cat.style.animationPlayState === 'paused') clearTimeout(control)
			else {
				CATS[pn].chunk[0] += stepX; CATS[pn].chunk[1] += stepY;
				cat.style.zIndex = 100 - Math.floor(CATS[pn].chunk[1]);
			}
		}, i);
	}
	cat.style.transition = `left ${dis}ms cubic-bezier(0.25, 0.1, 1.0, 1.0), bottom ${dis}ms cubic-bezier(0.25, 0.1, 1.0, 1.0)`;
	cat.style.left = `${newchunk[0] * x - widthCat}px`;
	cat.style.bottom = `${newchunk[1] * y}px`;
	if (oldchunk[0] != newchunk[0] && oldchunk[1]!= newchunk[1]) cat.childNodes[1].classList.add('animation'); 
	cat.ontransitionend = () => {
		cat.childNodes[1].classList.remove('animation');
		cat.style.animationPlayState = 'paused';
	}
}

ws.onopen = (e) => {
	console.log('connected!');

	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 102, token: document.cookie}));
		ws.onmessage = (e) => {
			const data = JSON.parse(e.data);
			if (data.type == 6) {
				if(data.pn != CATS[0].pn) addMeow(data.pn, data.msg);
			} else if (data.type == 5) {
				if (data.pn != CATS[0].pn) animation(data.pn, data.chunk, CATS[data.pn].chunk, data.speed || 50);
			} else if (data.type == 4) {
				let checkAdd = true;
				for(let cat in CATS) {
					if (!CATS.hasOwnProperty(cat)) continue;
					if (data.cat.pn == CATS[0].pn || data.cat.pn == cat) {
						checkAdd = false;
						break;
					}
				}
				if (checkAdd) {
					CATS[data.cat.pn] = {
                                    name: data.cat.name,
                                    chunk: [data.cat.chunk[0], data.cat.chunk[1]],
						orient: data.cat.chunk[2],
                              }
					addCat(data.cat.pn, [data.cat.chunk[0], data.cat.chunk[1]]);
				}
			} if (data.type === 'catout') {
				//из локации вышел котик
			} else if (data.type == 3) {
				for(let j = 0; j < data.loc.fill.length; j++) {
					if (data.loc.fill[j].pn === CATS[0].pn) continue;
					CATS[data.loc.fill[j].pn] = {
						name: data.loc.fill[j].name,
						chunk: [data.loc.fill[j].chunk[0], data.loc.fill[j].chunk[1]],
						orient: data.loc.fill[j].chunk[2],
					}
					addCat(data.loc.fill[j].pn, [data.loc.fill[j].chunk[0], data.loc.fill[j].chunk[1]]);
				}
			} else if (data.type === 2) {
				CATS[0].pn = data.pn;
				CATS[0].name = data.name;
				CATS[0].chunk = [data.chunk[0], data.chunk[1]];
				CATS[0].orient = data.chunk[2];
				addCat(0, CATS[0].chunk);
			}
		}

		mouselistener.onmousedown = (e) => {
			const excess = document.querySelector('#sky').clientHeight + document.querySelector('#nearloc').clientHeight;
			chunk = serveChunk([e.pageX, e.pageY - excess]);
			animation(0, chunk, CATS[0].chunk, CATS[0].speed || 50);
		}
	}
}
