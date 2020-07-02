'use strict'
app.cw = {
	next: {
		obj: {v: 0},
		tex: {v: 0},
		clr: {v: 100},
	},
	f: {
		preloader: null,
		showAdder: null, showCreater: null,
		listingTextures: null, listingObjects: null,
		createNewLocation: null, editExsisLocation: null,
		addPath : null, addObj: null, addDisallow: null,
		applyColors: null, generateColors: null,
		turnBack: null,
		createLoc: null,
		editedaddPath: null,
	},
	objIs: null,
}

{
	const dataToS = {objs: [{}], paths: [{}], disa: []};
	let	obj,
		colors, headloc, addedObj, addedPaths, addedStops, cr_add, adder, creater,
		nowposition = 0, nowpsPaths = 0,
		locsnames, objsExNames, objsNames, texsNames,
		x, y;
	function computeXY() {
		x = headloc.clientWidth / 160;
		y = headloc.clientHeight / 30;
	}
	function toStringRGB(hsl) {
		return 'rgb(' + [Number.parseInt(hsl.substr(1,2), 16),
			  Number.parseInt(hsl.substr(3,2), 16),
			  Number.parseInt(hsl.substr(5,2), 16)].join(', ') + ')';
	}
	app.cw.f.listingTextures = function(p) {
		const l = document.getElementById('leftArrowTex'),
			r = document.getElementById('rightArrowTex'),
			name = document.getElementById('hereTypeName');
		app.animationArrows(l, r, p, app.cw.next.tex, texsNames.length - 1, () => {
			name.innerHTML = texsNames[app.cw.next.tex.v].name;
			headloc.style.background = `url(${texsNames[app.cw.next.tex.v].texture})`;
			document.getElementById('nearloc').style.background = `url(${texsNames[app.cw.next.tex.v].texture})`;
			document.getElementById('nearloc').style.opacity = '.7';
			dataToS.texs = texsNames[app.cw.next.tex.v].texture;
		}, 'low');
	}
	app.cw.f.listingObjects = function(p) {
		if (!p) { obj.data = objsNames[app.cw.next.obj.v].url; return; }
		const l = document.getElementById('leftArrowCreater'),
			r = document.getElementById('rightArrowCreater');
		app.animationArrows(l, r, p, app.cw.next.obj, objsNames.length - 1, () => {
			obj.data = objsNames[app.cw.next.obj.v].url;
			obj.onload = () => { colors.innerHTML = app.cw.f.generateColors(app.cw.next.obj.v) }
		});
	}
	app.cw.f.listingExObjects = function(p) {
		const l = document.getElementById('leftArrowAdder'),
			r = document.getElementById('rightArrowAdder');
		app.animationArrows(l, r, p, app.cw.next.obj, objsExNames.length - 1, () => {
			obj.data = objsExNames[app.cw.next.obj.v];
		});
	}
	app.cw.f.addDisallow = function() {
		dataToS.disa[161] = 1;
		app.cw.next.clr.v += 20;
		const stop = document.getElementById('stop').value.match(/\d+/g),
			b = document.createElement('button'),
			shellNewDisa = document.createElement('div'),
			clr = document.createElement('div'),
			div = document.createElement('div');
		if (stop.length > 2) return;
		stop[0] = +stop[0]; stop[1] = Number.parseInt(stop[1], 2);
		if (stop[1] >= Math.pow(2, 31)) return alert('Второе значение должно быть меньше, чем 2^31');
		if (stop[0] < 0 || stop[0] > 161) return alert('Первое значение должно принадлежать [0; 161]')
		else if (!(stop[0] + 1)) return alert('Одно из значений — не число');
		if (!stop[1] || stop[0] == 161) return;

		dataToS.disa[stop[0]] = stop[1];

		if (app.cw.next.clr.v > 255) app.cw.next.clr.v = 100;

		for (let i = 0; i < 30; i++) {
			if (stop[1] & Math.pow(2,i)) {
				const d = document.createElement('div');
				d.style.position = 'absolute';
				d.style.zIndex = 104;
				d.style.width = x + 'px';
				d.style.height = y + 'px';
				d.style.left = stop[0] * x + 'px';
				d.style.bottom = i * y + 'px';
				d.style.background = `rgb(${app.cw.next.clr.v}, 0, 0)`;
				d.style.opacity = '.8';
				headloc.appendChild(div);
				div.appendChild(d);
			}
		}

		clr.style.width = '20px';
		clr.style.height = '20px';
		clr.innerHTML = `<span class="lower-text">${stop[0]}</span>`;
		clr.style.background = `rgb(${app.cw.next.clr.v}, 0, 0)`;
		clr.style.display = 'inline-block';
		shellNewDisa.style.margin = '2.5px';
		shellNewDisa.appendChild(clr);
		shellNewDisa.style.display = 'inline-block';

		b.classList.add('form');
		b.style.marginLeft = '5px';
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewDisa.remove();
			div.remove();
			dataToS.disa[stop[0]] = null;
			if (addedStops.children.length == 1) {
				document.getElementById('stop').value = '161 0000000000000000000000000000000';
				dataToS.disa[161] = null;
			}
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //delete
		}
		shellNewDisa.appendChild(b);
		addedStops.appendChild(shellNewDisa);
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //delete

	}
	app.cw.f.createNewLocation = function() {
		resizeWindow(200, 0);
		document.getElementsByTagName('button')[1].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[2].style.backgroundColor = '#bb8b54';
		document.getElementById('editExsisLocation').style.display = 'none';
		document.getElementById('createNewLocation').style.display = 'block';
		computeXY();
	}
	app.cw.f.editExsisLocation = function() {
		resizeWindow(200, 0);
		document.getElementsByTagName('button')[2].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[1].style.backgroundColor = '#bb8b54';
		document.getElementById('createNewLocation').style.display = 'none';
		document.getElementById('editExsisLocation').style.display = 'block';
		computeXY();
	}
	app.cw.f.addPath = function() {
		const minmax = document.getElementById('minmax').value.match(/\d+/g).map(i => +i),
			move = document.getElementById('move').value.match(/\d+/g).map(i => +i),
			div = document.createElement('div'),
			shellNewPath = document.createElement('div'),
			b = document.createElement('button'),
			n = nowpsPaths;
		if (minmax[0] > minmax[2] || minmax[1] > minmax[3]) { alert('Указывайте координаты в порядке возрастания'); return; }
		if (minmax[0] < 0 || minmax[0] > 160 || minmax[1] < 0 || minmax[1] > 30 ||
		    minmax[2] < 0 || minmax[2] > 160 || minmax[3] < 0 || minmax[3] > 30) {
			alert('Координаты пути выходят за пределы допустимого диапазона'); return;
		} else if (!(minmax[0] + 1) || !(minmax[1] + 1) || !(minmax[2] + 1) || !(minmax[3] + 1)) {
			alert('Введённые координаты пути не являются числом');
			return;
		}
		if (move[0] < 20 || move[0] > 140 || move[1] < 0 || move[1] > 30) {
			alert('Координаты позиции игрока после перемещения выходят за пределы допустимого диапазона');
			return;
		} else if (!(move[0] + 1) || !(move[1] + 1)) {
			alert('Введённая позиция игрока после перемещения не являются числом');
			return;
		}
		if (!(move[2] == 0 || move[2] == 1)) { alert('Некорректная ориентация после перемещения'); return; }
		if (!locsnames[move[3]]) { alert('Указанной локации не существует'); return; }

		dataToS.paths[n].to = move;
		dataToS.paths[n].minChunk = [minmax[0], minmax[1]];
		dataToS.paths[n].maxChunk = [minmax[2], minmax[3]];

		div.style.position = 'absolute';
		div.style.zIndex = 101;
		div.style.width = `${Math.abs(minmax[2] - minmax[0]) * x}px`;
		div.style.height = `${Math.abs(minmax[3] - minmax[1]) * y}px`;
		div.style.left = `${minmax[0] * x}px`;
		div.style.bottom = `${minmax[1] * y}px`;
		div.style.background = 'deeppink';
		div.style.opacity = '.4';
		div.innerHTML = `<div style="font-size: 6pt;">Путь №${n}</div>`
		headloc.appendChild(div);

		shellNewPath.style.marginBottom = '5px';
		shellNewPath.innerHTML = `<div class="lower-text">Путь №${n} ведет в ${locsnames[move[3]]}</div>`;
		b.classList.add('form');
		b.style.marginTop = '3px';
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewPath.remove();
			div.remove();
			dataToS.paths[n] = null;
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //удалить
		}
		shellNewPath.appendChild(b);
		addedPaths.appendChild(shellNewPath);
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //удалить
		dataToS.paths.push({});
		++nowpsPaths;
	}
	app.cw.f.addObj = function() {
		if (!obj.contentDocument) return;
		const createX = +document.getElementById('x').value,
			createY = +document.getElementById('y').value,
			createZ = +document.getElementById('z').value,
			createS = +(document.getElementById('size').value.replace(/,/, '.')) || 1,
			n = nowposition;
		if (createX < -160 || createX > 160 || createY < -5 || createY > 30 || createZ && (createZ < 1 || createZ >= 120)) {
			alert('Координаты выходят за пределы допустимого диапазона');
			return;
		} else if (!(createX + 1) || !(createY + 1)) {
			alert('Введённые данные не являются целым числом');
			return;
		}
		dataToS.objs[n].chunk = [createX, createY];
		dataToS.objs[n].s = createS;
		if (createZ) dataToS.objs[n].z = createZ
		else dataToS.objs[n].z = null;

		if (app.cw.objIs === 'new') dataToS.objs[n].url = objsNames[app.cw.next.obj.v].url
		else {
			dataToS.objs[n].noserve = objsExNames[app.cw.next.obj.v];
			if (dataToS.objs[n].colors) {
				delete dataToS.objs[n].colors;
				delete dataToS.objs[n].d;
			}
		}

		localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //delete

		let	newobj = obj.contentDocument.all[0].cloneNode(true),
			newobjadd = obj.contentDocument.all[0].cloneNode(true),
			shellNewObj = document.createElement('div'),
			b = document.createElement('button');

		newobj.style.position = 'absolute';
		newobj.style.zIndex = createZ || 100 - dataToS.objs[n].chunk[1];
		newobj.style.width = `${obj.contentDocument.all[0].attributes.width.value / 2 * dataToS.objs[n].s}px`;
		newobj.style.height = `${obj.contentDocument.all[0].attributes.height.value / 2 * dataToS.objs[n].s}px`;
		newobj.style.left = `${dataToS.objs[n].chunk[0] * x}px`;
		newobj.style.bottom = `${dataToS.objs[n].chunk[1] * y}px`;
		headloc.appendChild(newobj);

		newobjadd.style.width = '100px';
		newobjadd.style.height = '20px';
		shellNewObj.style.display = 'inline-block';
		shellNewObj.appendChild(newobjadd);
/*		b.classList.add('form');
		b.style.marginRight = '3px';
		b.textContent = 'редактировать';
		b.onclick = () => {
			//редактируем
		}
		shellNewObj.appendChild(b);
		b = document.createElement('button'); */
		b.classList.add('form');
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewObj.remove();
			newobj.remove();
			dataToS.objs[n] = null;
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS)); //delete
		}
		shellNewObj.appendChild(b);
		addedObj.appendChild(shellNewObj);
		dataToS.objs.push(Object.assign({}, dataToS.objs[n]))
		++nowposition;
	}
	app.cw.f.applyColors = function() {
		const l = document.forms.color.length - 1, stack = [];
		for(let i = 0; i < l; i++) {
			app.changeSVG(obj, toStringRGB(dataToS.objs[nowposition].colors[i]),
					  toStringRGB(document.forms.color.elements[i].value));
			stack.push(document.forms.color.elements[i].value);
		}
		dataToS.objs[nowposition].colors = stack;
	}
	app.cw.f.generateColors = function(n) {
		dataToS.objs[nowposition].colors = [];
		dataToS.objs[nowposition].d = [];
		let	formColors = '<form name="color">';
		for(let i = 0; i < objsNames[n].d.length; i++) {
			formColors += `<input style="margin: 1px" class="form" type="color" value="${objsNames[n].d[i]}">`;
			dataToS.objs[nowposition].colors.push(objsNames[n].d[i]);
			dataToS.objs[nowposition].d.push(objsNames[n].d[i]);
		}
		formColors += '<button style="width: 100%; margin-top: 3px" class="form" type="button" onclick="app.cw.f.applyColors();">Применить другой цвет</button></form>';
		return formColors;
	}
	app.cw.f.showCreater = function() {
		obj = document.getElementById('obj');
		app.cw.next.obj.v = 0; app.cw.objIs = 'new';
		cr_add.style.display = 'none';
		creater.style.display = 'block';
		obj.data = objsNames[0].url;
		obj.onload = () => {
			(colors = document.getElementById('colors')).innerHTML = app.cw.f.generateColors(0);
		}
	}
	app.cw.f.showAdder = function() {
		obj = document.getElementById('exobj');
		app.cw.next.obj.v = 0; app.cw.objIs = 'ex';
		cr_add.style.display = 'none';
		adder.style.display = 'block';
		obj.data = objsExNames[0];
	}
	app.cw.f.turnBack = function(from) {
		if (from == 'adder') {
			delete dataToS.objs[nowposition].noserve;
			document.getElementById('leftArrowCreater').style.background = 'url("css/img/lightarrow.svg") no-repeat'
			document.getElementById('rightArrowCreater').style.background = 'url("css/img/arrow.svg") no-repeat'
			adder.style.display = 'none';
			app.cw.f.showCreater();
		} else if (from == 'creater') {
			delete dataToS.objs[nowposition].url;
			document.getElementById('leftArrowAdder').style.background = 'url("css/img/lightarrow.svg") no-repeat'
			document.getElementById('rightArrowAdder').style.background = 'url("css/img/arrow.svg") no-repeat'
			creater.style.display = 'none';
			app.cw.f.showAdder();
		}
	}
	app.cw.f.preloader = function() {
		document.getElementById('preload').style.display = 'block';
		req.open('GET', '/getocw', true);
		req.send();
		req.onload = () => {
			const {res, data} = JSON.parse(req.response);
			if (req.status !== 200 || res == 0) {
				//загрузить не удалось
			} else if (res) {
				locsnames = data.locsnames; objsExNames = data.objsExNames;
				objsNames = data.objsNames; texsNames = data.texsNames;

				dataToS.disa.length = 162; dataToS.disa[161] = null;

				addQue('Ширина и высота игрового поля условно делится на 160 и 30 частей соответственно. Следовательно, координаты (0, 0) расположат ' +
				'объект в нижнем левом углу, а (160, 30) в правом верхнем.', document.getElementById('c'));
				addQue('Значение больше нуля увеличивает объект, а меньше нуля — уменьшает его.<br>'+
				'Например, коэффициент 4 увеличит объект в четыре раза, а 0.5 уменьшит в два раза.',
				document.getElementById('q'));
				addQue('Z-координата задает перспективу. Если указано значение меньше 70, то объект сновится самым ' +
				'низким. Если больше 100 — самым высоким. Если значение не указано, перспектива вычисляется автоматически.',
				document.getElementById('e'));

				document.getElementById('viewer').style.width = `${document.querySelector('html').clientWidth / 2}px`;
				document.getElementById('viewer').style.height = `${document.querySelector('html').clientHeight / 2}px`;

				headloc = document.querySelector('#headloc'); addedObj = document.getElementById('addedObj');
				addedPaths = document.getElementById('addedPaths'); addedStops = document.getElementById('addedStops');
				cr_add = document.getElementById('cr_add'); adder = document.getElementById('adder');
				creater = document.getElementById('creater');
				obj = document.getElementById('obj');

				document.getElementById('preload').style.display = 'none';
				document.getElementById('content').style.display = 'block';
			}
		}
	}

	app.cw.f.editedaddPath = function() {
		const minmax = document.getElementById('editedminmax').value.match(/\d+/g).map(i => +i),
			move = document.getElementById('editedmove').value.match(/\d+/g).map(i => +i),
			n = +document.getElementById('editedLoc').value;
		if (!locsnames[n]) return alert('Такой локации не существует');
		if (minmax[0] > minmax[2] || minmax[1] > minmax[3]) { alert('Указывайте координаты в порядке возрастания'); return; }
		if (minmax[0] < 0 || minmax[0] > 160 || minmax[1] < 0 || minmax[1] > 30 ||
		    minmax[2] < 0 || minmax[2] > 160 || minmax[3] < 0 || minmax[3] > 30) {
			alert('Координаты пути выходят за пределы допустимого диапазона'); return;
		} else if (!(minmax[0] + 1) || !(minmax[1] + 1) || !(minmax[2] + 1) || !(minmax[3] + 1)) {
			alert('Введённые координаты пути не являются числом');
			return;
		}
		if (move[0] < 20 || move[0] > 140 || move[1] < 0 || move[1] > 30) {
			alert('Координаты позиции игрока после перемещения выходят за пределы допустимого диапазона');
			return;
		} else if (!(move[0] + 1) || !(move[1] + 1)) {
			alert('Введённая позиция игрока после перемещения не являются числом');
			return;
		}
		if (!(move[2] == 0 || move[2] == 1)) { alert('Некорректная ориентация после перемещения'); return; }
		if (!locsnames[move[3]]) { alert('Указанной локации после перемещения не существует'); return; }

		const toServer = {
			path: {
				minChunk: [minmax[0], minmax[1]],
				maxChunk: [minmax[2], minmax[3]],
				to: move
			}, n
		}
		post(toServer, '/addpath');
		req.onload = () => {
			const {res, msg} = JSON.parse(req.responseText);
			if (req.status !== 200) {
				//неудача
			} else if (res == 0) {
				alert('Путь не добавлен: ' + msg);
			} else if (res == 1) {
				alert('Путь добавлен');
			}
		}
	}


	app.cw.f.createLoc = function() {
		const areYouReady  = confirm("Вы уверены, что хотите создать локацию?");
		if (!areYouReady) return;
		dataToS.name = document.getElementById('nameOfLoc').value;
//		dataToS.objs.pop(); dataToS.paths.pop();
		console.log(dataToS);
//		localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		post(dataToS, '/crnewloc');
		req.onload = () => {
			const {res, msg} = JSON.parse(req.responseText);
			if (req.status !== 200) {
				//неудача
			} else if (res == 0) {
				alert('Локация не создана: ' + msg);
			} else if (res == 1) {
				alert('Локация создана');
//				console.log(res.data);
			}
		}
	}
}

app.cw.f.preloader();
