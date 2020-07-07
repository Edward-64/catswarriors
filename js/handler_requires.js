'use strict'
const req = new XMLHttpRequest(),
oldWindow = {
	content: document.getElementById('require').innerHTML,
	widthHight: 640,
	width: 620,
	minHeight: 360,
},
app = {
	//max - максимум элементов для перебора
	//next - ссылка на итерируемое/декремируемое значение
	//func - то, что надо сделать после анимации
	animationArrows(la, ra, plus, next, max, func, low = '') {
		let a = false;

		next.v = (next.v += plus) < 0 ? (a = true, 0) : max < next.v ? (a = true, max) : next.v;

		if (next.v == 0) { la.style.background = `url('css/img/${low}lightarrow.svg') no-repeat`; }
		else la.style.background = `url('css/img/${low}arrow.svg') no-repeat`;
		if (next.v == max) { ra.style.background = `url('css/img/${low}lightarrow.svg') no-repeat`; }
		else ra.style.background = `url('css/img/${low}arrow.svg') no-repeat`;
		if (plus < 0) { la.style.right = '5px'; setTimeout(() => { la.style.right = '0px' }, 500); }
		if (plus > 0) { ra.style.left = '5px'; setTimeout(() => { ra.style.left = '0px' }, 500); }

		if (a) return;
		func();
	},
	changeSVG(obj, from, to) {
		let find = obj.contentDocument.querySelectorAll('path');
		for (let i = 0; i < find.length; i++) if (find[i].style.fill == from) find[i].style.fill = to;
		find = obj.contentDocument.querySelectorAll('ellipse');
		for (let i = 0; i < find.length; i++) if (find[i].style.fill == from) find[i].style.fill = to;
		find = obj.contentDocument.querySelectorAll('linearGradient');
		for (let i = 0; i < find.length; i++) {
			if (!find[i].children[0]) continue;
			if (find[i].children[0].style.stopColor == from) {
				find[i].children[0].style.stopColor = to;
				find[i].children[1].style.stopColor = to;
			}
		}
	},
};

function post(data, path) {
	req.open('POST', path, true);
	req.setRequestHeader('content-type', 'application/json; charset=utf-8');
	req.send(JSON.stringify(data));
}

function createCharacter() {
	function errorReq(id, text, server) {
		const errRequire = document.getElementById(id);
		errRequire.innerHTML = `<span class="lower-text">Персонаж не создан: ${text}</span>`;
		errRequire.style.display = 'block';
		if (id === 'gender') return;
		if (server) {
			document.forms[0].onclick = () => { errRequire.style.display = 'none'; }
			return;
		}
		form.elements[id].onclick = () => { errRequire.style.display = 'none'; }
	}
	const form = document.forms.create,
	data = {
		catName: form.elements.catName.value,
		gender: form.elements.gender.value,
		alias: form.elements.alias.value,
		password: form.elements.password.value,
	};
	let emptyProp = null, boolEmP = false;

	for(let prop in data) {
		if (data.hasOwnProperty(prop) && !data[prop]) {
			emptyProp = prop;
			boolEmP = true; break;
		}
	}
	let regCatName = data.catName.match(/[а-яА-Яё]+/g),
	regAlias = data.alias.match(/[a-zA-Zа-яА-Я\dё]+/g),
	regPass = data.password.match(/[\wа-яА-Я\-\dё]+/);

	if (regCatName && regCatName.length === 2) regCatName = regCatName.join(' ');
	if (regCatName && regCatName.length === 1) regCatName = regCatName[0];
	if (regPass) regPass = regPass[0];
	if (regAlias) regAlias = regAlias.join(' ');

	if (boolEmP) {
		errorReq(emptyProp, 'это поле не может быть пустым');
		if (emptyProp === 'gender') {
			errRequire = document.getElementById(emptyProp);
			document.getElementById('catRadio').onclick = () => { errRequire.style.display = 'none'; }
			document.getElementById('catRadio2').onclick = () => { errRequire.style.display = 'none'; }
		}
	} else if (data.catName.length < 2 || data.catName.length > 32) {
		errorReq('catName', 'имя должно быть длины от 2-х до 32-х букв');
	} else if (regCatName !== data.catName) {
		errorReq('catName', 'имя может состоять только из одного или двух русских слов. Например, Песчаная Буря');
	} else if (data.alias.length < 2) {
		errorReq('alias', 'псевдоним должен состоять как минимум из двух русских или английских букв, цифр, а также может быть словосочетанием');
	} else if (data.password.length < 6) {
		errorReq('password', 'пароль должен быть длиннее пяти символов. Допускаются русские, английские буквы, символы тире «-», нижнего подчеркивания «_» и цифры');
	} else if (data.alias.length > 32) {
		errorReq('alias', 'зачем такой длинный псевдоним? Укоротите как минимум до 32-х символов');
	} else if (data.password.length > 32) {
		errorReq('password', 'безопасность - это замечательно, но придумайте пароль короче: максимум 32 символа');
	} else if (regPass !== data.password) {
		errorReq('password', 'в пароле используются недопустимые символы. Допускаются только русские, английские буквы, символы тире «-», нижнего подчеркивания «_» и цифры');
	} else if (regAlias !== data.alias) {
		errorReq('alias', 'в псевдониме используются недопустимые символы. Псевдоним должен состоять как минимум из двух русских или английских букв, цифр, а также может быть словосочетанием');
	} else if (data.password !== form.elements.passwordRepeat.value) {
		errorReq('password', 'пароли не совпадают');
		document.forms.create.elements.passwordRepeat.onclick = () => { document.getElementById('password').style.display = 'none'; }
	} else {
		post(data, '/cc');
		req.onload = () => {
			const res = JSON.parse(req.responseText);
			console.log(res);
			if (res.cr == 0) {
				if (req.status !== 200) errorReq('catName', `произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`, true)
				else errorReq('catName', res.res);
			} else if (res.cr == 1) {
				document.getElementById('catName').style.display = 'block';
				document.getElementById('catName').innerHTML = res.res;
				document.forms[0].onclick = () => {
                            	window.location.reload();
				}
			}
		}
	}
}

function activCharacter() {
	const form = document.forms.activ.elements,
	data = {
		alias: form.alias.value,
		password: form.password.value,
	};
	post(data, '/ac');
	req.onload = () => {
		const {res} = JSON.parse(req.responseText),
                winErr = document.getElementById('alias');
                winErr.style.display = 'block';
		if (res == 0) {
			winErr.innerHTML = 'Персонаж не активирован: проверьте правильность введённых данных';
			form.alias.onclick = () => { document.getElementById('alias').style.display = 'none' }
			form.password.onclick = () => { document.getElementById('alias').style.display = 'none' }
		} else if (res == 1) {
			winErr.innerHTML = 'Персонаж активирован!';
			setTimeout(()=> { window.location='/'; }, 3000);
		}
	}
}

function sendRequire() {
	const require = document.forms.meowing.elements.meowing.value,
	focus = document.forms.meowing.elements.meowing,
	windowErr = document.getElementById('noRequire'),
	windowReq = document.getElementById('require');

	focus.onclick = () => { windowErr.style.display = 'none'; }
	if (require.length > 100) {
		windowErr.style.display = 'block';
		windowErr.textContent = 'Выразите своё желание короче';
	} else if (require.toLowerCase() === 'и' || /играть/i.test(require)) {
		window.location='/play';
	} else if (require.toLowerCase() === 'сп' || /создать персонажа/i.test(require)) {
		req.open('GET', '/creating', true);
		req.send();
		req.onload = () => {
			if (req.status !== 200) {
					windowErr.style.display = 'block';
					windowErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`;
				} else {
					const res = JSON.parse(req.response);
					if (res.res == 0) {
						windowErr.style.display = 'block';
						windowErr.innerHTML = `Вы уже создали персонажа`;
					} else if (res.res == 2) {
						windowErr.style.display = 'block';
						windowErr.innerHTML = `<span class='lower-text'>У Вас уже есть персонаж по имени ${res.catName}. ` +
						`Создание сразу двух и более персонажей запрещено. Чтобы создать нового персонажа, нужно удалить старого.</span>`;
					} else if (res.res == 1) {
						resizeWindow(0, -80);
						windowReq.innerHTML = res.data;
					}
			}
		}
	} else if (require.toLowerCase() === 'дп' || /деактивировать|деактивация|выйти|выход/i.test(require)) {
		req.open('GET', '/dac', true);
		req.send();
		req.onload = () => {
			if (req.status !== 200) {
				windowErr.style.display = 'block';
				windowErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`;
			} else {
				windowErr.style.display = 'block';
      		      windowErr.textContent = 'Персонаж деактивирован';
			}
		}
	} else if (require.toLowerCase() === 'ап' || /активировать|активация|вход|войти/i.test(require)) {
		req.open('GET', '/activ', true);
		req.send();
		req.onload = () => {
			const res = JSON.parse(req.response);
              	if (req.status !== 200) {
				windowErr.style.display = 'block';
                       	windowErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`;
			} else if (res.res == 2) {
				windowErr.style.display = 'block';
				windowErr.innerHTML = `Ваш персонаж по имени ${res.catName} уже активирован`;
			} else if (res.res == 1) {
				resizeWindow(-160, -100);
                       		document.getElementById('require').innerHTML = res.data;
                   	}
		}
	} else {
		post({require: require.toLowerCase()}, '/ar');
		req.addEventListener('load', () => {
			const res = JSON.parse(req.responseText);
			if (res.res == 1) {
				document.getElementById('require').innerHTML = res.data;
				resizeWindow(res.add[0], res.add[1]);
				if (res.add[2]) {
					const script = document.createElement('script');
					script.src =  res.add[2];
					document.body.appendChild(script);
				}
			} else if (res.res == 2) {
				windowErr.style.display = 'block';
				windowErr.textContent = 'Вы не можете это сделать';
			} else if (res.res == 0){
				windowErr.style.display = 'block';
				windowErr.textContent = 'Для начала активируйте персонажа или, если у вас его ещё нет, создайте';
			} else if (res.res == 3) {
				windowErr.style.display = 'block';
				windowErr.textContent = 'Попробуйте что-нибудь другое';
			}
		}, {once: true});
	}
}

function backRequire() {
	document.getElementById('require').innerHTML = oldWindow.content;
	resizeWindow(0, 0);
}

function resizeWindow(w, h) {
	document.getElementById('container').style.width = `${oldWindow.widthHight + w}px`;
	document.getElementById('lower-cover').style.width = `${oldWindow.width + w}px`;
	document.getElementById('cover').style.width = `${oldWindow.widthHight + w}px`;
	document.getElementById('container').style.minHeight = `${oldWindow.minHeight + h}px`;
	document.getElementById('lower-cover').style.minHeight = `${oldWindow.minHeight + h}px`;
	document.getElementById('cover').style.minHeight = `${oldWindow.minHeight + h}px`;
}

function addQue(text, where) {
	const div = document.createElement('div'),
		lowdiv = document.createElement('div');
	lowdiv.classList.add('window-of-q'); lowdiv.classList.add('form');
	lowdiv.innerHTML = text;
	div.classList.add('question');
	div.textContent = '?';
	div.appendChild(lowdiv);
	const events = where.appendChild(div);
	events.onmouseover = () => {
		events.childNodes[1].style.display = 'inline-block';
	};
	events.onmouseout = () => {
		events.childNodes[1].style.display = 'none';
	};
}
/*
let	createNewLocation, editExsisLocation, changeSVG, generateColors, listingObjects, applyColors, createLoc,
	applySizeXY, preloadCW, orientCW, listingLocs, addPath, renameLoc, addDisallow, listingTextures,
	showCreater, showAdder, listingExObjects, turnBack, createNewLocationNoCreater;
{
	const dataToS = {objs: [{}], paths: [{to: []}], disa: []};
	let	colors, obj, nextObj = 0, nextLoc = 1, nextTexs = 0, nextColor = 100, nextExObj = 0,
		headloc, addedObj, addedPaths, addedStops, crORadd, adder, creater, loading,
		nowposition = 0, nowpsPaths = 0,
		locsnames, objsExNames, objsNames, texsNames,
		canRunPreload = true, x, y, orient;

	preloadCW = function() {
		req.open('GET', '/getocw', true);
		req.send();
		req.onload = () => {
			if (req.status !== 200) {
				//загрузить не удалось
			} else {
				const {add, data} = JSON.parse(req.response);
				locsnames = add.locsnames; objsExNames = add.objsExNames;
				objsNames = add.objsNames; texsNames = add.texsNames;
				document.getElementById('createNewLocation').innerHTML = data;

				for(let i = 0; i <= 160; i++) dataToS.disa[i] = [];

				addQue('Ширина и высота игрового поля условно делится на 160 и 30 частей соответственно. Следовательно, координаты (0, 0) расположат ' +
				'объект в нижнем левом углу, а (160, 30) в правом верхнем.', document.getElementById('c'));
				addQue('Значение больше нуля увеличивает объект, а меньше нуля — уменьшает его.<br>'+
				'Например, коэффициент 4 увеличит объект в четыре раза, а 0.5 уменьшит в два раза.',
				document.getElementById('q'));

				(colors = document.getElementById('colors')).innerHTML = generateColors(0);
				document.getElementById('viewer').style.width = `${document.querySelector('html').clientWidth / 2}px`;
				document.getElementById('viewer').style.height = `${document.querySelector('html').clientHeight / 2}px`;

				headloc = document.querySelector('#headloc'); addedObj = document.getElementById('addedObj');
				addedPaths = document.getElementById('addedPaths'); addedStops = document.getElementById('addedStops');
				crORadd = document.getElementById('crORadd'); adder = document.getElementById('adder');
				creater = document.getElementById('creater'); loading = document.getElementById('loading');
				obj = document.getElementById('obj');

				x = headloc.clientWidth / 160;
				y = headloc.clientHeight / 30;

				canRunPreload = false;
			}
		}
	}
	listingTextures = function(plus) {
		if (!texsNames) return;
		let a = false;
		const lb = document.getElementById('bleft1'),
			rb = document.getElementById('bright1'),
			name = document.getElementById('typeOfTexs'),
			maxTexs = texsNames.length - 1;
		nextTexs = (nextTexs += plus) < 0 ? (a = true, 0) : maxTexs < nextTexs ? (a = true, maxTexs) : nextTexs;
		if (nextTexs == 0) { lb.style.background = `url('css/img/lowlightarrow.svg') no-repeat`; }
		else lb.style.background = `url('css/img/lowarrow.svg') no-repeat`;
		if (nextTexs == maxTexs) { rb.style.background = `url('css/img/lowlightarrow.svg') no-repeat`; }
		else rb.style.background = `url('css/img/lowarrow.svg') no-repeat`;
		if (plus < 0) { lb.style.right = '5px'; setTimeout(() => { lb.style.right = '0px' }, 500); }
		if (plus > 0) { rb.style.left = '5px'; setTimeout(() => { rb.style.left = '0px' }, 500); }
		if (a) return;
		name.innerHTML = texsNames[nextTexs].name;
		headloc.style.background = `url(${texsNames[nextTexs].texture})`
		dataToS.texs = texsNames[nextTexs].texture;
	}
	addDisallow = function() {
		nextColor += 20;
		const div = document.createElement('div'),
			startX = Number.parseInt(document.getElementById('startX').value),
			startY = Number.parseInt(document.getElementById('startY').value),
			endX = Number.parseInt(document.getElementById('endX').value),
			endY = Number.parseInt(document.getElementById('endY').value),
			b = document.createElement('button'),
			shellNewDisa = document.createElement('div'),
			col = document.createElement('div');
		let	biggerX, biggerY, lowerX, lowerY;
		if (nextColor > 255) nextColor = 100;
		if (startX == endX || startY == endY) { alert('Конечная и начальная точка не могут быть равны'); return; }
		if (startX < 0 || startX > 160 || startY < 0 || startY > 30) {
			alert('Координаты начальной точки вышли за пределы допустимого диапазона');
			return;
		} else if (!(startX + 1) || !(startY + 1)) {
			alert('Введённые Координаты начальной точки не являются числом');
			return;
		}
		if (endX < 0 || endX > 160 || endY < 0 || endY > 30) {
			alert('Координаты конечной точки вышли за пределы допустимого диапазона');
			return;
		} else if (!(endX + 1) || !(endY + 1)) {
			alert('Введённые Координаты конечной точки не являются числом');
			return;
		}
		if (startX > endX) { biggerX = startX; lowerX = endX }
		else { biggerX = endX; lowerX = startX }
		if (startY > endY) { biggerY = startY; lowerY = endY }
		else { biggerY = endY; lowerY = startY }

		for(let i = lowerX; i <= biggerX; i++) {
			for(let j = lowerY; j <= biggerY; j++) {
				if (dataToS.disa[i][j]) {
					alert('Это зона (или её часть) уже помечена как недоступная');
					return;
				}
				dataToS.disa[i][j] = 1;
			}
		}

		div.style.position = 'absolute';
		div.style.zIndex = 104;
		div.style.width = `${Math.abs(endX - startX) * x}px`;
		div.style.height = `${Math.abs(endY - startY) * y}px`;
		div.style.left = `${(lowerX) * x}px`;
		div.style.bottom = `${(lowerY) * y}px`;
		div.style.background = `rgb(${nextColor}, 0, 0)`;
		div.style.opacity = '.8';
		headloc.appendChild(div);

		col.style.width = '100px';
		col.style.height = '20px';
		col.innerHTML = `<span class="lower-text">(${lowerX}, ${lowerY})∪(${biggerX}, ${biggerY})</span>`;
		col.style.background = `rgb(${nextColor}, 0, 0)`;
		col.style.display = 'inline-block';
		shellNewDisa.style.marginBottom = '5px';
		shellNewDisa.appendChild(col);

		b.classList.add('form');
		b.style.marginLeft = '5px';
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewDisa.remove();
			div.remove();
			for(let i = lowerX; i <= biggerX; i++) {
				for(let j = lowerY; j <= biggerY; j++) {
					dataToS.disa[i][j] = null;
				}
			}
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		}
		shellNewDisa.appendChild(b);
		addedStops.appendChild(shellNewDisa);
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS));

	}
	renameLoc = function(v) {
		if (!locsnames) return;
		v = Number.parseInt(v);
		v = v ? v : -1;
		nextLoc = v;
		document.getElementById('typeOfTxts').textContent = locsnames[v] ? locsnames[v] : '[локация не существует]';
	}
	createNewLocationNoCreater = function() {
		if (canRunPreload) preloadCW();
		resizeWindow(200, 0);
		document.getElementsByTagName('button')[1].style.display = 'none';
		document.getElementById('createNewLocation').style.display = 'block';
	}
	createNewLocation = function() {
		if (canRunPreload) preloadCW();
		resizeWindow(200, 0);
		document.getElementsByTagName('button')[1].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[2].style.backgroundColor = '#bb8b54';
		document.getElementById('editExsisLocation').style.display = 'none';
		document.getElementById('createNewLocation').style.display = 'block';
	}
	editExsisLocation = function() {
		resizeWindow(200, 0);
		document.getElementsByTagName('button')[2].style.backgroundColor = '#976b3c';
		document.getElementsByTagName('button')[1].style.backgroundColor = '#bb8b54';
		document.getElementById('createNewLocation').style.display = 'none';
		document.getElementById('editExsisLocation').style.display = 'block';
	}
	orientCW = function(v) {
		const lOr = document.getElementById('lOr'),
			rOr = document.getElementById('rOr');
		orient = v;
		if (v) {
			rOr.style.background = '#976b3c';
			lOr.style.background = '#bb8b54';
		} else {
			lOr.style.background = '#976b3c';
			rOr.style.background = '#bb8b54';
		}
	}
	listingLocs = function(plus) {
		if (!locsnames) return;
		let a = false;
		nextLoc = (nextLoc += plus) < 1 ? (a = true, 1) : locsnames[0] < nextLoc ? (a = true, locsnames[0]) : nextLoc;
		const lb = document.getElementById('bleft2'),
			rb = document.getElementById('bright2'),
			name = document.getElementById('typeOfTxts');
		if (nextLoc == 1) { lb.style.background = `url('css/img/lowlightarrow.svg') no-repeat`; }
		else lb.style.background = `url('css/img/lowarrow.svg') no-repeat`;
		if (nextLoc == locsnames[0]) { rb.style.background = `url('css/img/lowlightarrow.svg') no-repeat`; }
		else rb.style.background = `url('css/img/lowarrow.svg') no-repeat`;
		if (plus < 0) { lb.style.right = '5px'; setTimeout(() => { lb.style.right = '0px' }, 500); }
		if (plus > 0) { rb.style.left = '5px'; setTimeout(() => { rb.style.left = '0px' }, 500); }
		if (a) return;
		name.innerHTML = locsnames[nextLoc];
	}
	addPath = function() {
		const pathX = Number.parseInt(document.getElementById('pathX').value),
			pathY = Number.parseInt(document.getElementById('pathY').value),
			endX = Number.parseInt(document.getElementById('endXP').value),
			endY = Number.parseInt(document.getElementById('endYP').value),
			div = document.createElement('div'),
			shellNewPath = document.createElement('div'),
			b = document.createElement('button'),
			n = nowpsPaths;
		if (pathX < 0 || pathX > 140 || pathY < 0 || pathY > 25) {
			alert('Координаты пути выходят за пределы допустимого диапазона');
			return;
		} else if (!(pathX + 1) || !(pathY + 1)) {
			alert('Введённые координаты пути не являются числом');
			return;
		}
		if (endX < 20 || endX > 140 || endY < 0 || endY > 30) {
			alert('Координаты позиции игрока после перемещения выходят за пределы допустимого диапазона');
			return;
		} else if (!(endX + 1) || !(endY + 1)) {
			alert('Введённая позиция игрока после перемещения не являются числом');
			return;
		}
		dataToS.paths[n].to[0] = endX;
		dataToS.paths[n].to[1] = endY;
		dataToS.paths[n].to[2] = orient;
		dataToS.paths[n].to[3] = nextLoc;

		dataToS.paths[n].minChunk = [pathX, pathY];
		dataToS.paths[n].maxChunk = [pathX + 20, pathY + 5];

		div.style.position = 'absolute';
		div.style.zIndex = 101;
		div.style.width = `${20 * x}px`;
		div.style.height = `${5 * y}px`;
		div.style.left = `${pathX * x}px`;
		div.style.bottom = `${pathY * y}px`;
		div.style.background = 'deeppink';
		div.style.opacity = '.4';
		div.innerHTML = `<div style="font-size: 6pt;">Путь №${nextLoc}</div>`
		headloc.appendChild(div);
		shellNewPath.style.marginBottom = '5px';
		shellNewPath.innerHTML = `<div class="lower-text">Путь №${nextLoc} ведет в ${locsnames[nextLoc]}</div>`;
		b.classList.add('form');
		b.style.marginTop = '3px';
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewPath.remove();
			div.remove();
			dataToS.paths[n] = null;
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		}
		shellNewPath.appendChild(b);
		addedPaths.appendChild(shellNewPath);
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		dataToS.paths.push({to: []});
		++nowpsPaths;
	}
	applySizeXY = function() {
		if (!obj.contentDocument) return;
		const createX = Number.parseInt(document.getElementById('x').value),
			createY = Number.parseInt(document.getElementById('y').value),
			createS = Number.parseFloat(document.getElementById('size').value.replace(/,/, '.')) || 1;
		if (createX < -10 || createX > 160 || createY < -5 || createY > 30) {
			alert('Координаты выходят за пределы допустимого диапазона');
			return;
		} else if (!(createX + 1) || !(createY + 1)) {
			alert('Введённые данные не являются числом');
			return;
		}
		dataToS.objs[nowposition].chunk = [createX, createY];
		dataToS.objs[nowposition].s = createS;
		if (objsNames[nextObj]) dataToS.objs[nowposition].url = objsNames[nextObj].url;
		if (objsNames[nextObj].noserve) dataToS.objs[nowposition].noserve = objsExNames[nextObj];
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		let	newobj = obj.contentDocument.all[0].cloneNode(true),
			newobjadd = obj.contentDocument.all[0].cloneNode(true),
			shellNewObj = document.createElement('div'),
			b = document.createElement('button'),
			n = nowposition;
		newobj.style.position = 'absolute';
		newobj.style.zIndex = 100 - dataToS.objs[nowposition].chunk[1];
		newobj.style.width = `${obj.contentDocument.all[0].attributes.width.value / 2 * dataToS.objs[nowposition].s}px`;
		newobj.style.height = `${obj.contentDocument.all[0].attributes.height.value / 2 * dataToS.objs[nowposition].s}px`;
		newobj.style.left = `${dataToS.objs[nowposition].chunk[0] * x}px`;
		newobj.style.bottom = `${dataToS.objs[nowposition].chunk[1] * y}px`;
		headloc.appendChild(newobj);
		newobjadd.style.width = '100px';
		newobjadd.style.height = '20px';
		shellNewObj.style.display = 'inline-block';
		shellNewObj.appendChild(newobjadd);
		b.classList.add('form');
		b.style.marginRight = '3px';
		b.textContent = 'редактировать';
		b.onclick = () => {
			//редактируем
		}
		shellNewObj.appendChild(b);
		b = document.createElement('button');
		b.classList.add('form');
		b.textContent = 'удалить';
		b.onclick = () => {
			shellNewObj.remove();
			newobj.remove();
			dataToS.objs[n] = null
			localStorage.setItem('dataToSCW', JSON.stringify(dataToS));
		}
		shellNewObj.appendChild(b);
		addedObj.appendChild(shellNewObj);
		dataToS.objs.push(Object.assign({}, dataToS.objs[nowposition]));
		++nowposition;
	}
	changeSVG = function(from, to) {
		let find = obj.contentDocument.querySelectorAll('path');
		for (let i = 0; i < find.length; i++) {
			if (find[i].attributes.fill.value.toLowerCase() == from.toLowerCase()) {
				find[i].attributes.fill.value = to;
			}
			if (find[i].attributes.stroke && find[i].attributes.stroke.value.toLowerCase() == from.toLowerCase()) {
				find[i].attributes.stroke.value = to;
			}
		}
		find = obj.contentDocument.querySelectorAll('ellipse');
		for (let i = 0; i < find.length; i++) {
			if (find[i].attributes.fill.value.toLowerCase() == from.toLowerCase()) {
				find[i].attributes.fill.value = to;
			}
		}
		find = obj.contentDocument.querySelectorAll('linearGradient');
		for (let i = 0; i < find.length; i++) {
			for (let j = 0; j < find[i].childNodes.length; j++) {
				if (find[i].childNodes[j].nodeName === '#text') continue;
				if (find[i].childNodes[j].attributes['stop-color'].value.toLowerCase() == from.toLowerCase()) {
					find[i].childNodes[j].attributes['stop-color'].value = to;
				}
			}
		}
	}
	applyColors = function() {
		const l = document.forms.color.length - 1, stack = [];
		for(let i = 0; i < l; i++) {
			changeSVG(dataToS.objs[nowposition].colors[i], document.forms.color.elements[i].value);
			stack.push(document.forms.color.elements[i].value);
		}
		dataToS.objs[nowposition].colors = stack;
	}
	generateColors = function(n) {
		dataToS.objs[nowposition].colors = [];
		dataToS.objs[nowposition].d = [];
		let	formColors = '<form name="color">';
		for(let i = 0; i < objsNames[n].d.length; i++) {
			formColors += `<input style="margin: 1px" class="form" type="color" value="${objsNames[n].d[i]}">`;
			dataToS.objs[nowposition].colors.push(objsNames[n].d[i]);
			dataToS.objs[nowposition].d.push(objsNames[n].d[i]);
		}
		formColors += '<button style="width: 100%; margin-top: 3px" class="form" type="button" onclick="applyColors();">Применить другой цвет</button></form>';
		return formColors;
	}
	listingObjects = function(plus) {
		if (!plus) { obj.data = objsNames[nextObj].url; return; }
		if (!objsNames) return;
		let a = false;
		const lb = document.getElementById('bleft'),
			rb = document.getElementById('bright'),
			endObj = objsNames.length - 1;
		nextObj = (nextObj += plus) < 0 ? (a = true, 0) : nextObj > endObj ? (a = true, endObj) : nextObj;
		if (nextObj == 0) { lb.style.background = `url('css/img/lightarrow.svg') no-repeat`; }
		else lb.style.background = `url('css/img/arrow.svg') no-repeat`;
		if (nextObj == endObj) { rb.style.background = `url('css/img/lightarrow.svg') no-repeat`; }
		else rb.style.background = `url('css/img/arrow.svg') no-repeat`;
		if (plus < 0) { lb.style.right = '10px'; setTimeout(() => { lb.style.right = '0px' }, 500); }
		if (plus > 0) { rb.style.left = '10px'; setTimeout(() => { rb.style.left = '0px' }, 500); }
		if (a) return;
		obj.data = objsNames[nextObj].url;
		obj.onload = () => { colors.innerHTML = generateColors(nextObj) }
	}
	showCreater = function() {
		obj = document.getElementById('obj');
		nextObj = 0;
		crORadd.style.display = 'none';
		creater.style.display = 'block';
		obj.data = objsNames[nextObj].url;
	}
	showAdder = function() {
		obj = document.getElementById('exobj');
		nextObj = 0;
		crORadd.style.display = 'none';
		adder.style.display = 'block';
		dataToS.objs[nowposition].noserve = objsExNames[nextObj];
		obj.data = objsExNames[nextObj];
	}
	turnBack = function(type) {
		if (type == 'adder') {
			delete dataToS.objs[nowposition].noserve;
			adder.style.display = 'none';
			showCreater();
		} else if (type == 'creater') {
			creater.style.display = 'none';
			showAdder();
		}
	}
	listingExObjects = function(plus) {
		if (!objsExNames) return;
		let a = false;
		const lb = document.getElementById('bleft3'),
			rb = document.getElementById('bright3'),
			endObj = objsExNames.length - 1;
		nextObj = (nextObj += plus) < 0 ? (a = true, 0) : nextObj > endObj ? (a = true, endObj) : nextObj;
		if (nextObj == 0) { lb.style.background = `url('css/img/lightarrow.svg') no-repeat`; }
		else lb.style.background = `url('css/img/arrow.svg') no-repeat`;
		if (nextObj == endObj) { rb.style.background = `url('css/img/lightarrow.svg') no-repeat`; }
		else rb.style.background = `url('css/img/arrow.svg') no-repeat`;
		if (plus < 0) { lb.style.right = '10px'; setTimeout(() => { lb.style.right = '0px' }, 500); }
		if (plus > 0) { rb.style.left = '10px'; setTimeout(() => { rb.style.left = '0px' }, 500); }
		if (a) return;
		obj.data = objsExNames[nextObj];
		dataToS.objs[nowposition].noserve = objsExNames[nextObj];
	}
	createLoc = function() {
		const areYouReady  = confirm("Вы уверены, что хотите создать локацию?");
		if (!areYouReady) return;
		dataToS.name = document.getElementById('nameOfLoc').value;
		localStorage.setItem('dataToSCW', JSON.stringify(dataToS));

		post(dataToS, '/crnewloc');
		req.onload = () => {
			const res = JSON.parse(req.responseText);
			if (req.status !== 200) alert('Локация не создана из-за ошибки на сервере. ' +
			'Данные сохранены, поэтому Вы можете попробовать отправить данные снова, ' +
			'не создавая локацию заново, даже если перезагрузите страницу и визульно редактор будет пустой.')
			else {
				if (res.res == 0) {
					alert('Локация не создана: ' + res.msg);
				} else if (res.res == 1) {
					alert('Локация создана');
					console.log(res.data);
				}
			}
		}
	}
}
*/

/* thanks https://gist.github.com/mjackson/5311256 

app.cch.rgbToHsl = function(rgb) {
let r = rgb[0], g = rgb[1], b = rgb[2];
  r /= 255, g /= 255, b /= 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ].map(i => Math.round(i * 255));
}

app.cch.hslToRgb = function(hsl) {
hsl = hsl.map(i => i / 255);
let h = hsl[0], s = hsl[1], l = hsl[2];
  let r, g, b;

  if (s == 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ r, g, b ].map(i => Math.round(i * 255));
}
*/
