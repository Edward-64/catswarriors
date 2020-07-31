'use strict'
app.cw = {
	next: {
		obj: {v: 0},
		tex: {v: -1},
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
	const dataToS = {objs: [{}], paths: [{}], disa: {}},
		edit = {};
	let	obj,
		colors, headloc, mouser, addedObj, addedPaths, addedStops, cr_add, adder, creater,
		nowposition = 0, nowpsPaths = 0,
		locsnames, objsExNames, objsNames, texsNames,
		x, y,
		bloks = 0;
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
			headloc.parentElement.style.backgroundImage = `url(${texsNames[app.cw.next.tex.v].texture})`;
			document.getElementById('nearloc').style.backgroundImage = `url(${texsNames[app.cw.next.tex.v].texture})`;
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
	app.cw.f.preDraw = function(style, chunk) {
		const div = document.createElement('div');

		div.style.position = 'absolute';
		div.style.width = x + 'px';
		div.style.height = y + 'px';
		div.style.left = chunk[0] * x + 'px';
		div.style.bottom = chunk[1] * y + 'px';
		div.style.opacity = '.7';
		div.style.zIndex = style.z;
		div.style.background = style.color;

		return div;
	}
	app.cw.f.draw = function(style, shell, func) {
		let	stat = 0; console.log(mouser);
		mouser.onclick = () => {
			if (stat == 0) stat = 1
			else stat = 0;
		}
		mouser.onmousemove = (e) => {
			if (stat == 1) {
				stat = 0;
				const chunk = [Math.floor(e.offsetX / x), 30 - Math.floor(e.offsetY / y)];

				if (chunk[0] < 0) chunk[0] = 0;
				if (chunk[1] < 0) chunk[1] = 0;
				if (chunk[1] > 30) chunk[1] = 30;

				if (func(chunk)) return stat = 1;
				shell.appendChild(app.cw.f.preDraw(style, chunk));
				stat = 1;
			}
		}

	}
	app.get = function() {
		return {dataToS, locsnames, texsNames, bloks};
	}
	app.cw.f.addDisallow = function() {
		const shell = headloc.appendChild(document.createElement('div')),
			local = {},
			m = document.getElementById('turner-moving'),
			p = document.getElementById('turner-path');
		m.textContent = 'Закончить и добавить';
		m.onclick = () => {
			m.textContent = 'Начать';
			m.onclick = app.cw.f.addDisallow;
			p.style.display = 'inline-block';
			mouser.onclick = null;
			mouser.onmousemove = null;

			const b = document.createElement('button'),
				shellNewDisa = document.createElement('div'),
				clr = document.createElement('div');

			clr.style.width = '20px';
			clr.style.height = '20px';
			clr.style.background = `rgb(${app.cw.next.clr.v}, 0, 0)`;
			clr.style.display = 'inline-block';
			shellNewDisa.style.margin = '3px';

			shellNewDisa.appendChild(clr);
			shellNewDisa.style.display = 'inline-flex';

			b.classList.add('form');
			b.style.marginLeft = '5px';
			b.textContent = 'удалить';
			b.onclick = () => {
				shellNewDisa.remove();
				shell.remove();
				for (let p in local) {
					if (!local.hasOwnProperty(p)) continue;
					dataToS.disa[p] = dataToS.disa[p] ^ local[p];
					if (dataToS.disa[p] == 0) delete dataToS.disa[p];
				}
			}
			shellNewDisa.appendChild(b);
			addedStops.appendChild(shellNewDisa);
		}
		p.style.display = 'none';
		app.cw.next.clr.v += 20;
		if (app.cw.next.clr.v > 255) app.cw.next.clr.v = 100;

		app.cw.f.draw({color: `rgb(${app.cw.next.clr.v}, 0, 0)`, z: 104}, shell, chunk => {
			if (dataToS.disa[chunk[0]] >> chunk[1] & 1) return true;
			local[chunk[0]] = local[chunk[0]] | 1 << chunk[1];
			dataToS.disa[chunk[0]] = dataToS.disa[chunk[0]] | 1 << chunk[1];
		});
	}
	app.cw.f.renderListOfLocs = function(locs) {
		if (bloks & 1) return setTimeout(() => app.cw.f.renderListOfLocs(locs), 200);
		bloks |= 1;
		const form = document.forms['list-of-locs'];
		if (Object.keys(locs).length == 0) form.innerHTML = 'Ничего не найдено';
		else form.innerHTML = '';

		for (let p in locs) {
			if (!locs.hasOwnProperty(p)) continue;
			const d = document.createElement('div');
			d.classList.add('ul');
			d.innerHTML = `<input type="radio" name="loc" value="${p}">${locs[p]} [${p}]`;
			form.appendChild(d);
		}
		if (bloks & 1) bloks ^= 1;
	}
	app.cw.f.searchingLocs = function(input) {
		if (bloks & 1) return setTimeout(() => app.cw.f.searchingLocs(input), 200);
		bloks |= 1;
		if (+input == 0) app.cw.f.renderListOfLocs(locsnames)
		else if (+input) {
			const keys = Object.keys(locsnames).filter(i => {if (i.startsWith(input)) return i}),
				local = {};
			keys.forEach(i => local[i] = locsnames[i]);
			app.cw.f.renderListOfLocs(local);
		} else {
			const reg = new RegExp(input, 'i'),
				local = {};
			for (let p in locsnames) {
				if (!locsnames.hasOwnProperty(p)) continue;
				if (reg.test(locsnames[p])) local[p] = locsnames[p];
			}
			app.cw.f.renderListOfLocs(local);
		}
		if (bloks & 1) bloks ^= 1;
	}
	app.cw.f.chooseLoc = function() {
		const form = document.forms['list-of-locs'].elements;
		let	choose;
		for (let i = 0; i < form.length; i++) {
			if (form[i].checked) choose = +form[i].value;
		}
		if (choose) {
			edit.editedLoc = choose;
			req.open('GET', `/r/getloc/${choose}`, true);
			req.send();
			req.onload = () => {
				const {res, msg} = JSON.parse(req.responseText);
				if (res) {
					dataToS.objs = [{}];
					dataToS.paths = [{}];
					dataToS.disa = {};
					nowposition = 0;
					nowpsPaths = 0;

					const texs = texsNames.findIndex(i => i.texture == msg.texture);
					app.cw.next.tex.v = texs - 1;
					app.cw.f.listingTextures(1);

					document.getElementById('nameOfLoc').value = msg.name;
					document.getElementById('editExsisLocation').style.display = 'none';
					document.getElementById('createNewLocation').style.display = 'block';
					computeXY();

					msg.landscape.forEach(i => {
						const toViever = document.createElement('img'),
							toAdded = document.createElement('img');
						toViever.src = i.texture;
						toAdded.src = i.texture;

						dataToS.objs[nowposition] = i;
						dataToS.objs[nowposition].old = true;

						app.cw.f.preAddObj({
							width: i.width / 2 + 'px',
							height: i.height / 2 + 'px',
							z: i.z || 100 - i.chunk[1],
							chunk: i.chunk
						}, [toViever, toAdded]);
					});

					msg.paths.forEach(i => {
						let shell = headloc.appendChild(document.createElement('div'));

						dataToS.paths[nowpsPaths] = i;

						for (let k = 0; k <= 160; k++) {
						if (i[k]) {
						for (let j = 0; j <= 30; j++) {
							if (i[k] >> j & 1) shell.appendChild(app.cw.f.preDraw({color: 'deeppink', z: 102}, [k, j]));
						}}}

//						app.cw.f.addTextToPath(shell);
						app.cw.f.preAddPath(shell, i.to[3]);
					});

					console.log(msg);
				} else {
					app.displayError('Не удалось загрузить локацию: ' + msg);
				}
			}
		} else alert('Локация не выбрана');
	}
	app.cw.f.createNewLocation = function() {
		resizeWindow(200, 0);
		const s = document.getElementById('to-server');
		s.onclick = app.cw.f.createLoc;
		s.textContent = 'Создать';
		document.getElementsByTagName('button')[1].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[2].style.backgroundColor = '#bb8b54';
		document.getElementById('editExsisLocation').style.display = 'none';
		document.getElementById('createNewLocation').style.display = 'block';
		computeXY();
	}
	app.cw.f.editExsisLocation = function() {
		resizeWindow(200, 0);
		const s = document.getElementById('to-server');
		s.onclick = app.cw.f.editLoc;
		s.textContent = 'Изменить';
		headloc.innerHTML = ''; addedPaths.innerHTML = '';
		addedObj.innerHTML = ''; addedStops.innerHTML = '';
		document.getElementsByTagName('button')[2].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[1].style.backgroundColor = '#bb8b54';
		document.getElementById('createNewLocation').style.display = 'none';
		document.getElementById('editExsisLocation').style.display = 'block';
		app.cw.f.renderListOfLocs(locsnames);
	}
	app.cw.f.preAddPath = function(shell, loc) {
		const	shellNewPath = document.createElement('div'),
			b = document.createElement('button'),
			n = nowpsPaths;

		shellNewPath.style.marginBottom = '3px';
		shellNewPath.innerHTML = `<div class="lower-text">№${n} ведет в ${locsnames[loc]} [${loc}]</div>`;
		b.classList.add('form');
		b.style.marginTop = '3px';
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewPath.remove();
			shell.remove();
			dataToS.paths[n] = null;
		}
		shellNewPath.appendChild(b);
		addedPaths.appendChild(shellNewPath);
		dataToS.paths.push({});
		++nowpsPaths;

		let several = [0, 0]; const k = 10;
		for (let i = 0; i < k; i++) {
			const c = shell.children[Math.floor(Math.random() * shell.children.length)];
			several[0] += +c.style.left.match(/\d+/)[0];
			several[1] += +c.style.bottom.match(/\d+/)[0];
		}
		const d = document.createElement('div');
		d.style.position = 'absolute';
		d.style.zIndex = 103;
		d.style.left = several[0] / k + 'px';
		d.style.bottom = several[1] / k + 'px';
		d.style.background = 'rgb(255, 20, 147, .4)';
		d.textContent = `№${n}`;
		shell.appendChild(d);
	}

	app.cw.f.addPath = function() {
		let move = document.getElementById('move').value.match(/\d+/g);

		if (!move) return alert('Введите координаты позиции игрока после перемещения');
		move = move.map(i => +i);
		if (move[0] < 10 || move[0] > 150 || move[1] < 0 || move[1] > 30)
			return alert('Координаты позиции игрока после перемещения выходят за пределы допустимого диапазона')
		else if (!(move[0] + 1) || !(move[1] + 1))
			return alert('Введённые данные не являются числом');
		if (!(move[2] == 0 || move[2] == 1)) return alert('Некорректная ориентация после перемещения');
		if (!locsnames[move[3]]) return alert('Указанной локации не существует');

		const	m = document.getElementById('turner-moving'),
			p = document.getElementById('turner-path'),
			shell = headloc.appendChild(document.createElement('div'));

		p.textContent = 'Закончить и добавить';
		p.onclick = () => {
			p.textContent = 'Начать';
			p.onclick = app.cw.f.addPath;
			m.style.display = 'inline-block';

			mouser.onclick = null;
			mouser.onmousemove = null;

			app.cw.f.preAddPath(shell, move[3]);
		}
		m.style.display = 'none';;

		dataToS.paths[nowpsPaths].to = move;
		app.cw.f.draw({color: 'deeppink', z: 102},
				   shell, chunk => {
			if (dataToS.paths[nowpsPaths][chunk[0]] >> chunk[1] & 1) return true;
			dataToS.paths[nowpsPaths][chunk[0]] = dataToS.paths[nowpsPaths][chunk[0]] | 1 << chunk[1];
		});
	}
	app.cw.f.preAddObj = function(style, objs) {
		let	newobj = objs[0],
			newobjadd = objs[1],
			shellNewObj = document.createElement('div'),
			b = document.createElement('button'),
			n = nowposition;

		newobj.style.position = 'absolute';
		newobj.style.zIndex = style.z;
		newobj.style.width = style.width;
		newobj.style.height = style.height;
		newobj.style.left = style.chunk[0] * x + 'px';
		newobj.style.bottom = style.chunk[1] * y + 'px';
		headloc.appendChild(newobj);

		newobjadd.style.width = '30px';
		newobjadd.style.height = '20px';
		newobjadd.style.marginLeft = '3px';
		shellNewObj.style.display = 'inline-block';
		shellNewObj.appendChild(newobjadd);

		b.classList.add('form');
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewObj.remove();
			newobj.remove();
			dataToS.objs[n] = null;
		}
		shellNewObj.appendChild(b);
		addedObj.appendChild(shellNewObj);
		if (dataToS.objs[n].old) dataToS.objs.push({})
		else dataToS.objs.push(Object.assign({}, dataToS.objs[n]));
		++nowposition;
	}
	app.cw.f.addObj = function() {
		if (!obj.contentDocument) return;
		const createX = +document.getElementById('x').value,
			createY = +document.getElementById('y').value,
			createZ = +document.getElementById('z').value,
			createS = +(document.getElementById('size').value.replace(/,/, '.')) || 1;
		if (createX < -160 || createX > 160 || createY < -5 || createY > 30 || createZ && (createZ < 1 || createZ >= 120)) {
			alert('Координаты выходят за пределы допустимого диапазона');
			return;
		} else if (!(createX + 1) || !(createY + 1)) {
			alert('Введённые данные не являются целым числом');
			return;
		}
		dataToS.objs[nowposition].chunk = [createX, createY];
		dataToS.objs[nowposition].s = createS;
		if (createZ) dataToS.objs[nowposition].z = createZ
		else dataToS.objs[nowposition].z = undefined;

		if (app.cw.objIs === 'new') dataToS.objs[nowposition].url = objsNames[app.cw.next.obj.v].url
		else {
			dataToS.objs[nowposition].noserve = objsExNames[app.cw.next.obj.v];
			if (dataToS.objs[nowposition].colors) {
				delete dataToS.objs[nowposition].colors;
				delete dataToS.objs[nowposition].d;
			}
		}

		app.cw.f.preAddObj({
			width: `${obj.contentDocument.all[0].attributes.width.value / 2 * createS}px`,
			height: `${obj.contentDocument.all[0].attributes.height.value / 2 * createS}px`,
			z: createZ || 100 - createY,
			chunk: [createX, createY]
		},
			[obj.contentDocument.all[0].cloneNode(true),
			 obj.contentDocument.all[0].cloneNode(true)]
		);
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

				addedObj = document.getElementById('addedObj').children[1];
				addedPaths = document.getElementById('addedPaths').children[1];
				addedStops = document.getElementById('addedStops').children[1];
				headloc = document.querySelector('#headloc').children[0];
				obj = document.getElementById('obj'); mouser = document.getElementById('mouser');
				cr_add = document.getElementById('cr_add'); adder = document.getElementById('adder');
				creater = document.getElementById('creater');

				app.cw.f.listingTextures(1);

				document.getElementById('preload').style.display = 'none';
				document.getElementById('content').style.display = 'block';
			}
		}
	}

	app.cw.f.editLoc = function() {
		const areYouReady  = confirm("Вы уверены, что хотите изменить локацию?");
		if (!areYouReady) return;

		dataToS.name = document.getElementById('nameOfLoc').value;
		dataToS.loc = edit.editedLoc;

		post(dataToS, '/edtloc');
		req.onload = () => {
			const {res, msg} = JSON.parse(req.responseText);
			if (res) {
				app.displayDone('Локация изменена');
			} else {
				app.displayError('Локация не изменена: ' + msg);
			}
		}
	}

	app.cw.f.createLoc = function() {
		const areYouReady  = confirm("Вы уверены, что хотите создать локацию?");
		if (!areYouReady) return;
		dataToS.name = document.getElementById('nameOfLoc').value;
		post(dataToS, '/crnewloc');
		req.onload = () => {
			const {res, msg} = JSON.parse(req.responseText);
			if (res) app.displayDone('Локация создана')
			else app.displayError('Локация не создана: ' + msg);
		}
	}
}

app.cw.f.preloader();
