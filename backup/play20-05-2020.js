const ws = new WebSocket('ws://192.168.1.5:8181'),
	place = document.getElementById('headloc'),
	gameplace = document.getElementById('place'),
	CATS = {
		0: {
			pn: undefined,
			name: undefined,
			chunk: [],
			anim: false,
		},
	};
let   x = Math.round(document.querySelector('#headloc').clientWidth / 160),
	y = Math.round(document.querySelector('#headloc').clientHeight / 27);

window.onresize = () => {
	x = Math.round(document.querySelector('#headloc').clientWidth / 160);
	y = Math.round(document.querySelector('#headloc').clientHeight / 27);
}

function addCat(pn, chunk) {
	const div = document.createElement('div');
	div.innerHTML = `<div style="background: url('img/players/0.svg')` +
	` no-repeat; width: 265px; height: 120px;">` +
	`	<div class="hightMessage"></div>` +
	`	<div class="hightMessage"></div>` +
	`	<div class="lowMessage"></div>` +
	`</div></div>`;
	div.classList.add('cat');
	div.id = `cat${pn}`;
	div.style.left = `${chunk[0] * x}px`;
	div.style.bottom = `${chunk[1] * y}px`;
	place.appendChild(div);
}

//floor обяз
function serveChunks(crd) {
	crd[0] = Math.floor(crd[0] / x);
	crd[1] = 27 - Math.floor(crd[1] / y);
	return crd;
}

function animation(pn, newchunk, oldchunk) {
	const cat = document.getElementById(`cat${pn}`),
		dis = (Math.abs(newchunk[0] - oldchunk[0]) + Math.abs(newchunk[1] - oldchunk[1])) / 30,
		t = dis * 100;
	let	chX = newchunk[0] / 10, chY = newchunk[1] / 10,
		widthCat = 200, checkAn = undefined, i = 0;

	if (newchunk[1] < oldchunk[1]) chY = -chY;

//	console.log('По оси x:', newchunk[0] - oldchunk[0], '\nПо оси у: ', newchunk[1] - oldchunk[1]);
//	console.log(dis);

	if (newchunk[0] < oldchunk[0]) {
		cat.style.transform = 'scale(-1, 1)'
		widthCat = 70; chX = -chX;
	} else {
		cat.style.transform = 'scale(1)';
	}

	if (CATS[pn].anim) {
		CATS[pn].anim = false;
		setTimeout(() => { CATS[pn].anim = true; }, t*3);
		checkAn = setInterval(() => {
			if (!CATS[pn].anim || i >= 7) {
				clearInterval(checkAn);
				CATS[pn].chunk[0] = Math.round(CATS[pn].chunk[0]);
				CATS[pn].chunk[1] = Math.round(CATS[pn].chunk[1]);
			}
			else {
				i++;
				console.log(i, chX, chY, CATS[pn].chunk[0], CATS[pn].chunk[1]);
				CATS[pn].chunk[0] += chX;
				CATS[pn].chunk[1] += chY;
			}
		}, t);
	} else {
		CATS[pn].anim = true;
		checkAn = setInterval(() => {
			if (!CATS[pn].anim || i >= 10) {
				clearInterval(checkAn);
				CATS[pn].chunk[0] = Math.round(CATS[pn].chunk[0]);
				CATS[pn].chunk[1] = Math.round(CATS[pn].chunk[1]);
			}
			else {
				i++;
				console.log(i, chX, chY, CATS[pn].chunk[0], CATS[pn].chunk[1]);
				CATS[pn].chunk[0] += chX;
				CATS[pn].chunk[1] += chY;
			}
		}, t);
	}

	cat.style.transition = `left ${dis}s cubic-bezier(0.25, 0.1, 1.0, 1.0), bottom ${dis}s cubic-bezier(0.25, 0.1, 1.0, 1.0)`;
	cat.style.left = `${newchunk[0] * x - widthCat}px`;
	cat.style.bottom = `${newchunk[1] * y}px`;
	cat.childNodes[0].classList.add('animation');
	cat.ontransitionend = () => {
		cat.childNodes[0].classList.remove('animation');
		CATS[pn].chunk = newchunk;
		CATS[pn].anim = false;
	}
}

ws.onopen = (e) => {
	console.log('connected!');

	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({type: 'pn', token: document.cookie})); //отправляем данные для входа в игру
		ws.onmessage = (e) => { // слушаем об изменениях, проиходящих в игре
			const data = JSON.parse(e.data);
			if (data.type === 'recrd') { //кто-то изменил координаты
				//console.log(data.pn, data.chunks, CATS[data.pn]);
				if (data.pn != CATS[0].pn) animation(data.pn, data.chunks, CATS[data.pn].chunk);
			} else if (data.type === 'newcat') { //на локацию зашел новый котик
				let checkAdd = true;
				for(let cat in CATS) {
					if (!CATS.hasOwnProperty(cat)) continue;
					if (data.cat.pn == CATS[0].pn || data.cat.pn == cat) {
						checkAdd = false;
						break;
					}
				}
				if (checkAdd) {
					addCat(data.cat.pn, data.cat.chunks);
					CATS[data.cat.pn] = {
                                    name: data.cat.name,
                                    chunk: data.cat.chunks,
						anim: false,
                              }
				}
			} if (data.type === 'catout') { //из локации вышел котик
				//
			} else if (data.type === 'stLoc') { //сервер сообщает состояние локации (что и кто)
				for(let j = 0; j < data.loc.fill.length; j++) {
					if (data.loc.fill[j].pn === CATS[0].pn) continue;
					addCat(data.loc.fill[j].pn, data.loc.fill[j].chunk);
					CATS[data.loc.fill[j].pn] = {
						name: data.loc.fill[j].name,
						chunk: data.loc.fill[j].chunk,
						anim: false,
					}
				}
			} else if (data.type === 'in') {
				CATS[0].pn = data.pn;
				CATS[0].name = data.name;
				CATS[0].chunk = data.chunk;
				addCat(0, data.chunk);
			}
		}

		place.onmousedown = (e) => {
			const excess = document.querySelector('#sky').clientHeight + document.querySelector('#nearloc').clientHeight;
			chunk = serveChunks([e.pageX, e.pageY - excess]);
			animation(0, chunk, CATS[0].chunk);
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({type: 'newcrd', value: chunk}));
			}
//			if (ws.readyState === WebSocket.OPEN) {
//				ws.send(JSON.stringify({type: 'newcrd', chunks: chunk}));
//			}
		}
	}
}
