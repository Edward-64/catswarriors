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
	displayError(text) {
		const err = document.getElementById('hight-error');
		err.style.background = '#c96b6b';
		err.style.display = 'inline-block';
		err.textContent = text;
		setTimeout(() => {
			err.style.display = 'none';
		}, 15000);
	},
	displayDone(text) {
		const err = document.getElementById('hight-error');
		err.style.background = '#9ec96b';
		err.style.display = 'inline-block';
		err.textContent = text;
		setTimeout(() => {
			err.style.display = 'none';
		}, 15000);
	},
	serveRawDate(date) {
		let diff = Date.now() - date, hours = new Date(date).getHours(), day = new Date(date).getDate();
//		console.log();
		if (diff > 31536000000) diff = 'более года назад'
		else if (diff > 7776000000) diff = 'более сезона назад'
		else if (diff > 2592000000) diff = 'более луны назад'
		else if (diff > 86400000) diff = 'недавно'
		else if (new Date(Date.now()).getDate() - 1 == day) diff = 'день назад'
		else if (hours > 22) diff = 'после захода солнца'
		else if (hours > 10) diff = 'днём'
		else if (hours > 4) diff = 'утром';
		else diff = 'до восхода солнца';
		return [[day,new Date(date).getMonth()+1,new Date(date).getFullYear()].join('.') +
			  ` ${hours}:${new Date(date).getMinutes()}`, diff];
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
	addPrompt(where, text) {
		const p = document.createElement('div');
		p.classList.add('prompt'); p.textContent = text;
		where.addEventListener('mouseover', () => {
			p.style.display = 'inline-block';
		});
		where.addEventListener('mouseout', () => {
			p.style.display = 'none';
		});
		where.appendChild(p);
	}
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
	} else if (require.toLowerCase() === 'р' || /общение|общаться|(р[оа]{1}зг[оа]{1}вор)|(р[оа]{1}зг[оа]{1}варивать)|личные сообщения/i.test(require)) {
		req.open('GET', '/talks', true);
		req.send();
		req.onload = () => {
			const {res, data} = JSON.parse(req.response);
			if (res) {
				resizeWindow(300, 0);
				document.getElementById('require').innerHTML = data;
				const script = document.createElement('script');
				script.src = '/js/talk.js';
				document.body.appendChild(script);
			} else {
				windowErr.style.display = 'block';
				windowErr.innerHTML = 'Недоступно';
			}
		}
	} else if (/markdown/i.test(require)) {
		req.open('GET', '/markdown', true);
		req.send();
		req.onload = () => {
			const {res, data} = JSON.parse(req.response);
			if (res) {
				resizeWindow(250, 0);
				document.getElementById('require').innerHTML = data;
			} else {
				windowErr.style.display = 'block';
				windowErr.innerHTML = 'Недоступно';
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
