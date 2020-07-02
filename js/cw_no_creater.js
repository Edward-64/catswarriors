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

				x = headloc.clientWidth / 160;
				y = headloc.clientHeight / 30;
			}
		}
	}
}

app.cw.f.preloader();
