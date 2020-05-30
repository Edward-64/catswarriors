const req = new XMLHttpRequest(),
oldWindow = {
	content: document.getElementById('require').innerHTML,
	widthHight: 640,
	width: 620,
	minHeight: 360,
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
	let regCatName = data.catName.match(/[а-яА-Я]+/g),
	regAlias = data.alias.match(/[a-zA-Zа-яА-Я\d]+/g),
	regPass = data.password.match(/[\wа-яА-Я\-\d]+/);

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
			setTimeout(()=> { backRequire() }, 3000);
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
						`Создание сразу двух и более персонажей запрещено, поэтому, если продолжите попытки создания нового персонажа, ${res.catName} ` +
						`будет заблокирован и нового создать Вы не сможете. Чтобы создать нового персонажа, нужно удалить старого.</span>`;
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
		req.onload = () => {
			const res = JSON.parse(req.responseText);
			if (res.res == 1) {
				document.getElementById('require').innerHTML = res.data;
				resizeWindow(res.add[0], res.add[1]);
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
		}
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

function createNewLocation() {
	resizeWindow(200, 0); document.getElementsByTagName('button')[1].style.backgroundColor = '#976b3c';
	document.getElementsByTagName('button')[2].style.backgroundColor = '#bb8b54';
	document.getElementById('editExsisLocation').style.display = 'none';
	document.getElementById('bleft').style.background = `url('css/img/lightarrow.svg') no-repeat`;
	const create = document.getElementById('createNewLocation');

	create.style.display = 'block';

}

function editExsisLocation() {
	resizeWindow(200, 0); document.getElementsByTagName('button')[2].style.backgroundColor = '#976b3c';
	document.getElementsByTagName('button')[1].style.backgroundColor = '#bb8b54';
	document.getElementById('createNewLocation').style.display = 'none';
	const edit = document.getElementById('editExsisLocation');

	edit.style.display = 'block';

}


let nextObj = 0;
function listingObjects(plus) {
	const lb = document.getElementById('bleft'),
		rb = document.getElementById('bright'),
		pobj = document.getElementById('obj'),
		colors = document.getElementById('colors'),
		maxObj = objectsdb.length - 1;

	nextObj += plus;

	if (nextObj < 0) { nextObj = 0 } else { if (nextObj > maxObj) nextObj = maxObj; }
	if (nextObj == 0) lb.style.background = `url('css/img/lightarrow.svg') center no-repeat`
	else lb.style.background = `url('css/img/arrow.svg') center no-repeat`;
	if (nextObj == maxObj) rb.style.background = `url('css/img/lightarrow.svg') center no-repeat`;
	else rb.style.background = `url('css/img/arrow.svg') center no-repeat`;
	if (plus < 0) { lb.style.right = '10px'; setTimeout(() => lb.style.right = '0px', 500); }
	if (plus > 0) { rb.style.left = '10px'; setTimeout(() => rb.style.left = '0px', 500); }

	pobj.data = objectsdb[nextObj].url;

	function changeSVG(from, to) {
		const find = pobj.contentDocument.querySelectorAll('path');
		for(let i = 0; i < find.length; i++) {
			if (find[i].attributes.fill.value.toLowerCase() == from.toLowerCase()) {
				find[i].attributes.fill.value = to;
			}
		}
	}

	const colorf = createElement('input'); colorf.type = 'color';
	colorf.classList.add('form');
	//добавить событие, возникающее при выборе формы
	//событие вызывает функцию changeSVG(..., ...)
	//у которой первый аргумент - дефортное значение (генерируется при динамическом добавлении
	//кнопки через массив detailsdb[i].d) а второй - value
	colors.appendChild(colorf);

}
