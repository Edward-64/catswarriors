const req = new XMLHttpRequest(),
oldWindow = {
	content: document.getElementById('require').innerHTML,
	containerWidth: document.querySelector('#container').clientWidth,
	containerHeight: document.querySelector('#container').clientHeight,
	coverWidth: document.querySelector('#cover').clientWidth,
	coverHeight: document.querySelector('#cover').clientHeight,
	lowerCoverWidth: document.querySelector('#lower-cover').clientWidth,
	lowerCoverHeight: document.querySelector('#lower-cover').clientHeight,
},
user = {
	alias: undefined,
	password: undefined,
};

/* req.open('GET', '/userdata', true);
req.send();
req.onload = () => {
	if (JSON.parse(req.response).res === 'permission denied') {
		permD.push('Недостаточно прав. Причины, по которым это могло произойти:' +
		'<ul> <li>Ваш персонаж не активирован. Чтобы активировать его, вернитесь назад и в ответ на вопрос "Что хотите?" ' +
		'напишите "Активировать персонажа"</li><li>Вы захотели что-то, на что у вас действительно нет прав.</ul>');
	} else {
		user.alias = JSON.parse(req.response).alias;
		user.password = JSON.parse(req.response).password;
	}
} */

function post(data, path) {
	req.open('POST', path, true);
	req.setRequestHeader('content-type', 'application/json; charset=utf-8');
	req.send(JSON.stringify(data));
}

function setCookie(type, token) {
	const day = new Date(Date.UTC(new Date().getFullYear() + 5, 0, 0, 0, 0, 0)).toUTCString();
	if (type === 'act') {
		document.cookie = `auth=${token}; expires=${day}`;
		document.cookie = `alias=${encodeURI(user.alias)}; expires=${day}`;
	} else if (type === 'create') {
		post(user, '/sccc');
		req.onload = () => {
			document.cookie = `auth=${token}; expires=${day}`;
			document.cookie = `alias=${user.alias}; expires=${day}`;
		}
	}
}

function createCharacter() {
	function errorReq(id, text) {
		const errRequire = document.getElementById(id);
		errRequire.innerHTML = `<span class="lower-text">${text}</span>`;
		errRequire.style.display = 'inline-block';
		form.elements[id].onclick = () => { errRequire.style.display = 'none'; }
	}
	const form = document.forms.create,
	data = {
		catName: form.elements.catName.value,
		gender: form.elements.gender.value,
		alias: form.elements.alias.value,
		password: form.elements.password.value,
	};
	let emptyProp = undefined, boolEmP = false;

	for(let prop in data) {
		if (!data.hasOwnProperty(prop)) continue;
		if (!data[prop]) {
			emptyProp = prop;
			boolEmP = true; break;
		}
	}
	let regCatName = data.catName.match(/[а-яА-Я]+/g),
	regAlias = data.alias.match(/[a-zA-Zа-яА-Я\d]+/g),
	regPass = data.password.match(/[\wа-яА-Я\-\d]+/);

	if (regCatName && regCatName.length === 2) regCatName = regCatName[0] + ' ' + regCatName[1];
	if (regCatName && regCatName.length === 1) regCatName = regCatName[0];
	if (regPass) regPass = regPass[0];
	if (regAlias) regAlias = regAlias.join(' ');

	if (boolEmP) {
		const errRequire = document.getElementById(emptyProp);
		errRequire.innerHTML = '<span class="lower-text">Это поле не может быть пустым</span>';
		errRequire.style.display = 'inline-block';
		if (emptyProp === 'gender') {
			document.getElementById('catRadio').onclick = () => { errRequire.style.display = 'none'; }
			document.getElementById('catRadio2').onclick = () => { errRequire.style.display = 'none'; }
		} else form.elements[emptyProp].onclick = () => { errRequire.style.display = 'none'; }
	} else if (data.catName.length < 2 || data.catName.length > 32) {
		errorReq('catName', 'Имя должно быть длины от 2-х до 32-х букв');
	} else if (regCatName !== data.catName) {
		errorReq('catName', 'Имя может состоять только из одного или двух русских слов. Например, Песчаная Буря');
	} else if (data.alias.length < 2) {
		errorReq('alias', 'Псевдоним должен состоять как минимум из двух русских или английских букв, цифр, а также может быть словосочетанием');
	} else if (data.password.length < 6) {
		errorReq('password', 'Пароль должен быть длиннее пяти символов. Допускаются русские, английские буквы, символы тире «-», нижнего подчеркивания «_» и цифры');
	} else if (data.alias.length > 32) {
		errorReq('alias', 'Зачем такой длинный псевдоним? Укоротите как минимум до 32-х символов');
	} else if (data.password.length > 32) {
		errorReq('password', 'Безопасность - это замечательно, но придумайте пароль короче: максимум 32 символа');
	} else if (regPass !== data.password) {
		errorReq('password', 'В пароле используются недопустимые символы. Допускаются только русские, английские буквы, символы тире «-», нижнего подчеркивания «_» и цифры');
	} else if (regAlias !== data.alias) {
		errorReq('alias', 'В псевдониме используются недопустимые символы. Псевдоним должен состоять как минимум из двух русских или английских букв, цифр, а также может быть словосочетанием');
	} else if (data.password !== form.elements.passwordRepeat.value) {
		errorReq('password', 'Пароли не совпадают');
		document.forms.create.elements.passwordRepeat.onclick = () => { document.getElementById('password').style.display = 'none'; }
	} else {
		post(data, '/cc');
		req.onload = () => {
			winErr = document.getElementById('catName');
			winErr.style.display = 'inline-block';
			if (req.status !== 200) winErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`
			else {
				const res = JSON.parse(req.responseText);
				if (!res.cr) {
					winErr.innerHTML = res.res;
					document.forms[0].onclick = () => { winErr.style.display = 'none' }
				} else {
					user.alias = data.alias;
					user.password = data.password;
					winErr.innerHTML = resData.res;
					document.forms[0].onclick = () => {
						setCookie('create');
						setTimeout(() => {window.location.reload()}, 3000);
					}
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
		const {res, token} = JSON.parse(req.responseText),
                winErr = document.getElementById('alias');
                winErr.style.display = 'inline-block';
		if (res == 0) {
			winErr.innerHTML = 'Персонаж не активирован: проверьте правильность введённых данных';
			form.alias.onclick = () => { document.getElementById('alias').style.display = 'none' }
			form.password.onclick = () => { document.getElementById('alias').style.display = 'none' }
		} else {
			user.alias = data.alias;
			user.password = data.passworde;
			setCookie('act', token);
			winErr.innerHTML = 'Персонаж активирован!';
			setTimeout(()=> {window.location.reload()}, 3000);
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
	} else if (require.toLowerCase() === 'зфнс' || /загрузить файл на сервер/i.test(require)) {
		req.open('GET', '/load', true);
	  	req.send();
		req.onload = () => {
			if (req.status !== 200) {
				windowErr.style.display = 'block';
				windowErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`;
			} else {
				document.getElementById('require').innerHTML = req.response;
				generateWindow(1.5);
			}
		}
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
						if (!user.alias) user.alias = res.alias;
						if (!user.password) user.password = res.password;
						windowErr.innerHTML = `Вы уже создали персонажа`;
					} else if (res.res == 2) {
						windowErr.innerHTML = `<span class='lower-text'>У Вас уже есть персонаж по имени ${res.catName}.` +
						`Создание сразу двух и более персонажей запрещено, поэтому, если продолжите попытки создания нового персонажа, ${res.catName}` +
						`будет заблокирован и нового создать не сможете. Чтобы создать нового персонажа, нужно удалить старого.</span>`
					} else if (res.res == 1) {
						windowReq.innerHTML = res.data;
						generateWindow(1.05);
					} else windowErr.innerHTML = 'Произошла ошибка со стороны сервера';
			}
		}
	} else if (require.toLowerCase() === 'дп' || /деактивировать|деактивация|выйти|выход/i.test(require)) {
		document.cookie = 'alias=; max-age=0';
		windowErr.style.display = 'block';
		user.alias = undefined; user.password = undefined;
                windowErr.textContent = 'Персонаж деактивирован';
		setTimeout(()=> {window.location.reload()}, 3000);
	} else if (require.toLowerCase() === 'ап' || /активировать|активация|вход|войти/i.test(require)) {
		if (!user.password && !user.alias) {
			req.open('GET', '/activ', true);
               req.send();
               req.onload = () => {
              	     if (req.status !== 200) {
					windowErr.style.display = 'block';
                         windowErr.innerHTML = `Произошла какая-то ошибка.<br>Код ошибки: ${req.status} (${req.statusText})`;
				} else {
                         document.getElementById('require').innerHTML = req.response;
                         generateWindow(1.3);
                    }
			}
		} else {
			document.getElementById('require').innerHTML = 'Персонаж уже активирован<br><br>' + permD[0];
			generateWindow(1.5);
		}
	} else {
		//отправить запрос на сервер if () {} else {
		windowErr.style.display = 'block';
		windowErr.textContent = 'Попробуйте что-нибудь другое';
	}
}

function backRequire() {
	document.getElementById('require').innerHTML = oldWindow.content;
	document.getElementById('container').style.width = `${oldWindow.containerWidth}px`;
	document.getElementById('container').style.height = `${oldWindow.containerHeight}px`;
	document.getElementById('cover').style.width = `${oldWindow.coverWidth}px`;
        document.getElementById('cover').style.height = `${oldWindow.coverHeight}px`;
	document.getElementById('lower-cover').style.width = `${oldWindow.lowerCoverWidth}px`;
        document.getElementById('lower-cover').style.height = `${oldWindow.lowerCoverHeight}px`;
	document.getElementById('lower-cover').style.bottom = `${oldWindow.containerHeight - 10}px`;
}

function generateWindow(divider) {
	const getContainerData = document.querySelector('#container'),
	setContainerData = document.getElementById('container').style,
	getLowerCoverData = document.querySelector('#lower-cover'),
	setLowerCoverData = document.getElementById('lower-cover').style,
	getCoverData = document.querySelector('#cover'),
	setCoverData = document.getElementById('cover').style,
	bottom = (getContainerData.clientHeight - 10) / divider;

	setLowerCoverData.bottom = `${bottom}px`;
	setContainerData.width = `${getContainerData.clientWidth / divider}px`;
	setContainerData.height = `${getContainerData.clientHeight / divider}px`;
	setLowerCoverData.width = `${getLowerCoverData.clientWidth / divider}px`;
	setLowerCoverData.height = `${getLowerCoverData.clientHeight / divider}px`;
	setCoverData.width = `${getCoverData.clientWidth / divider}px`;
	setCoverData.height = `${getCoverData.clientHeight / divider}px`;
}
