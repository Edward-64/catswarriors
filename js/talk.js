'use strict'

const HOST = location.origin.replace(/^http/, 'ws'),
	md = new showdown.Converter({
		noHeaderId: true,
		simplifiedAutoLink: true,
		tables: true,
		simpleLineBreaks: true,
		literalMidWordUnderscores: true,
		strikethrough: true
	});
let	ws = null, PN = null;

app.talk = {
	f: {
		preload: null,
		backStartFromATalk: null, backStartFromCreating: null, backFromEditorATalk: null,
		toATalk: null,
		sendMeow: null, editTalk: null,
		createTalk: null,
		isWriting: null, goWriting: null,
		serveCheckbox: null, toMarkdown: null, editToMarkdown: null,
		listingFields: null,
		send(type, msg) {
                  if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type, msg}));
                  }
            },

	}
}

{
	let	set, talks, aTalk, preload, cTalk,
		talksR, aTalkR,
		generatedTalk, generatedTalkR,
		f,
		KNOWN, PN,
		listingPlayers = [], listingFields = 0, listingPlayersLastWriting = {}, maxFields,
		bloks = 0,
		lastScroll = 0;
	const TALKS = {},
		colors = ['#a5bdba','#795d7c','#4d4178','#ffe7d9','#f7c4c6','#6b7c8f','#f4c7aa','#df9a91','#686a97',
			    '#e4eaef','#c6dce4','#81b5bb','#348694','#294d52','#44a2a7','#9fad3c','#817a2e','#5d5505',
			    '#63361b','#8f5936','#e1bd6e'];
	let timer;
	app.talk.f.goWriting = function() {
		if (bloks & 4) return;
		bloks = bloks | 4;
		setTimeout(() => { if (bloks & 4) bloks = bloks ^ 4; }, 1000);
		f.send(108, {id: getIdNowTalk(), alias: document.getElementById('alias').value.substr(0,32)});
	}
	app.talk.f.isWriting = function(display) {
		const cat = KNOWN[display.pn] && KNOWN[display.pn][0] ? KNOWN[display.pn][0].value : display.alias || 'Неизвестный котик';
		if (listingPlayers.some(a => a == cat)) return listingPlayersLastWriting[display.pn] = Date.now();
		listingPlayers.push(cat);
//return		console.log(document.getElementById('talk-input').children[0]);
		const c = document.getElementById('talk-input').children[0].children[0];
		let a = 0;
		clearInterval(timer);
		timer = setInterval(() => {
			const p = listingPlayers.join(', ');
			if (p.length == 0) {
				c.innerHTML = '';
				return clearInterval(timer);
			}
			a = a == 3 ? 0 : ++a;
			switch (a) {
				case 0: c.innerHTML = p + (listingPlayers.length > 1 ? ' печатают' : ' печатает') + ' .'; break;
				case 1: c.innerHTML = p + (listingPlayers.length > 1 ? ' печатают' : ' печатает') + ' . .'; break;
				case 2: c.innerHTML = p + (listingPlayers.length > 1 ? ' печатают' : ' печатает') + ' . . .'; break;
			}
		}, 400);
		const t = setInterval(() => {
			if (Date.now() - listingPlayersLastWriting[display.pn] > 1200) {
				const c = listingPlayers.indexOf(cat);
				listingPlayers.splice(c, 1);
				clearInterval(t);
			}
		}, 1200);
	}

	const stackMeows = [];
	setInterval(() => {
		if (stackMeows.length) {
			f.send(105, stackMeows[0]);
			stackMeows.shift();
		}
		if (!stackMeows.length && bloks & 8) bloks = bloks ^ 8;
	}, 700);
	app.talk.f.sendMeow = function() {
		if (stackMeows.length > 20) return app.displayError('Стек переполнен. Сбавьте темп.');
		let	c = document.getElementById('alias').value,
			content = document.getElementById('talk-input').children[1].children[0].value;
		if (!content.length) return;
		if (c.length > 40) c = c.substr(0, 40) + ' ...';
		const msg = {content: JSON.stringify(content), id: getIdNowTalk(),
				 md: document.getElementById('md').checked, alias: c}
//unthebest var
		if (ws.readyState === WebSocket.OPEN) document.getElementById('talk-input').children[1].children[0].value = '';
		if (bloks & 8) return stackMeows.push(msg);
		f.send(105, msg); bloks = bloks | 8;
	}

	function serveDisplayng(id) {
		const c = document.getElementById('talk-input').children;
		if (TALKS[id].type) {
			c[1].style.display = 'flex';
			c[2].style.display = 'none';
		} else if (TALKS[id].admins.some(i => i == PN)) {
			c[1].style.display = 'flex';
			c[2].style.display = 'none';
		} else {
			c[2].style.display = 'block';
			c[1].style.display = 'none';
		}
	}

//turner Markdown in head chat

	app.talk.f.serveCheckbox = function(v) {
		if (v) document.getElementById('markdown').style.display = 'block'
		else document.getElementById('markdown').style.display = 'none';
	}

	function hideMarkdown(b, dlt) {
		dlt.remove();
		b.textContent = 'Предпросмотр';
		b.onclick = () => app.talk.f.toMarkdown(b);
		if (bloks & 2) bloks ^= 2;
	}

	app.talk.f.toMarkdown = function(b) {
		bloks |= 2;
		const content = document.getElementById('talk-input').children[1].children[0].value,
			h_div = document.createElement('div'),
			div = document.createElement('div');
		div.classList.add('msg-talk'); div.classList.add('msg-talk-viever');
		div.innerHTML = `<span class="talk-md-low-viever">Предпросмотр</span><div style="font-weight: normal;">${md.makeHtml(content)}</div>`
		div.style.textAlign = 'start';
		h_div.style.textAlign = 'right';

		h_div.appendChild(div);
		const	now = generatedTalk.appendChild(h_div);
		generatedTalk.scrollTop = generatedTalk.scrollHeight;

		b.onclick = () => { hideMarkdown(b, now) }
		document.getElementById('talk-input').children[1].children[0].addEventListener('mouseup', () => { hideMarkdown(b, now); }, {once: true});
		b.textContent = 'Скрыть';
	}

//turnet Markdown in description

	function editHideMarkdown(b) {
		b.children[2].style.display = 'none';
		b.children[1].style.display = 'block';
		b.children[3].style.left = '80%';
		b.children[3].textContent = 'Предпросмотр';
		b.children[3].onclick = () => f.editToMarkdown(b);
	}

	app.talk.f.editToMarkdown = function(b) {
		let content = b.children[1].value;
		content = b.children[4].children[0].checked ? md.makeHtml(content) :
			    JSON.parse(JSON.stringify(content).replace(/\\n/g, '<br>'));
		b.children[2].innerHTML = content;
		b.children[1].style.display = 'none';
		b.children[2].style.display = 'block';
		b.children[3].style.left = '90%';
		b.children[3].textContent = 'Назад';
		b.children[3].onclick = () => editHideMarkdown(b);

	}

	app.talk.f.editTalk = function(b) {
		const send = {
			pre: JSON.stringify(b.children[1].value),
			md: b.children[4].children[0].checked,
			id: getIdNowTalk()
		}
		if (send.pre.length > 10000)
			return app.displayError(`Слишком длинное описание, максимум — 1000 символов. Вы написали: ${send.pre.length}.`);
		b = b.parentElement;
		send.name = b.children[0].children[0].value;
		if (send.name.length > 40) send.name = send.name.substr(0,40) + ' ...';
		send.type = b.children[1].children[0].children[0].checked ? 0 : 1;
		f.send(109, send);
		f.backFromEditorATalk();
	}

	app.talk.f.backStartFromCreating = function() {
		cTalk.style.display = 'none';
		cTalk.children[0].style.display = 'block';
		for (let i = 1; i < cTalk.children.length; i++) {
			cTalk.children[i].style.display = 'none';
		}
		set.children[0].style.display = 'none';
		set.children[1].style.display = 'block';
		talks.style.display = 'block';
		talksR.style.display = 'block';
	}

	app.talk.f.backStartFromATalk = function() {
		generatedTalk.style.display = 'none';
		generatedTalkR.style.display = 'none';
		generatedTalk = null; generatedTalkR = null;
		aTalk.style.display = 'none';
		aTalkR.style.display = 'none';
		set.children[0].style.display = 'none';
		set.children[1].style.display = 'block';
		talks.style.display = 'block';
		talksR.style.display = 'block';
	}

	app.talk.f.backFromEditorATalk = function() {
		document.getElementById('a-talk-edit').style.display = 'none';
		aTalk.style.display = 'block';
		set.children[0].onclick = f.backStartFromATalk;
	}

	app.talk.f.backFromMembersATalk = function(id) {
		document.getElementById(`a-talk-members${id}`).style.display = 'none';
		aTalk.style.display = 'block';
		set.children[0].onclick = f.backStartFromATalk;
	}

	app.talk.f.backFromDescriptorATalk = function(id) {
		document.getElementById(`a-talk-description${id}`).style.display = 'none';
		aTalk.style.display = 'block';
		set.children[0].onclick = f.backStartFromATalk;
	}

	let newTalk;
	app.talk.f.createTalk = function(start, add, send) {
		if (start) {
			newTalk = {};
			talks.style.display = 'none';
			talksR.style.display = 'none';
			cTalk.style.display = 'block';
			set.children[0].onclick = f.backStartFromCreating;
			set.children[0].style.display = 'block';
			set.children[1].style.display = 'none';
		}
		if (add) {
			newTalk[add[0]] = add[1];
			switch (add[0]) {
				case 'log': {
					cTalk.children[0].style.display = 'none';
					cTalk.children[1].style.display = 'block';
					cTalk.children[1].innerHTML = `<p>Выберите из известных Вам игроков тех, с кем хотите начать` +
						` ${add[1] ? 'диалог' : 'монолог'}. Нажмите кнопку <button class="form" ` +
						`onclick="app.talk.f.createTalk(null, null, true)">Начать</button> после того, как закончите выбор.</p>`;
					newTalk.members = [];
					const l = Object.keys(KNOWN), container = document.createElement('div');
					container.style.maxHeight = '400px'; container.style.overflow = 'auto';
					for (let i = 0; i < l.length; i++) {
						const pn = +l[i];
						container.appendChild(renderKnown(pn, div => {
							console.log(newTalk);
							if (!newTalk.members.some((x, y) => {
								if (x == pn) {
									newTalk.members.splice(y, 1);
									div.children[2].style.display = 'none';
									return true;
								}
							})) {
								newTalk.members.push(pn);
								div.children[2].style.display = 'block';
							}
						}).div);
					}
					cTalk.appendChild(container);
				}
			}
		}
		if (send) {
			f.backStartFromCreating();
			f.send(106, newTalk);
		}
	}

	app.talk.f.toATalk = function(id) {
		if (bloks & 1) return;
		lastScroll = 0;
		talks.style.display = 'none';
		talksR.style.display = 'none';
		if (document.getElementById(`talk${id}`)) {
			generatedTalk = document.getElementById(`talk${id}`);
			generatedTalkR = document.getElementById(`right-talk${id}`);
			generatedTalk.style.display = 'block';
			generatedTalkR.style.display = 'block';
		} else {
			bloks = bloks | 1;
			preload.style.display = 'block';
			let container = document.createElement('div');
			container.classList.add('container-for-a-talk');
			container.id = `talk${id}`;
			generatedTalk = aTalk.insertBefore(container, document.getElementById('talk-input'));
			container = document.createElement('div');
			container.id = `right-talk${id}`;
			generatedTalkR = aTalkR.appendChild(container);
			f.send(104, [0,50,id]);
		}
		set.children[0].onclick = f.backStartFromATalk;
		set.children[0].style.display = 'block';
		set.children[1].style.display = 'none';
		serveDisplayng(id);
		aTalk.style.display = 'block';
		aTalkR.style.display = 'block';
	}

	function reconnect() {
		app.displayError('Восстановление соединения...')
		f.preload();
		const a = setInterval(() => {
			if (ws.readyState == WebSocket.OPEN) {
				app.displayDone('Соединение восстановлено!');
				clearInterval(a);
			}
		}, 500);
	}

	app.talk.f.preload = function(first) {
		ws = new WebSocket(HOST, 'talks');

		ws.onopen = () => {
			if (first) {
				set = document.getElementById('setting'); f = app.talk.f;
				talks = document.getElementById('talks');
				aTalk = document.getElementById('a-talk');
				preload = document.getElementById('preload');
				cTalk = document.getElementById('creating-talk');
				talksR = document.getElementById('talks-right');
				aTalkR = document.getElementById('a-talks-right');

				const a = document.getElementById('alias');
				a.value = localStorage.getItem('aliasForTalk');
				let alias, time;
				a.oninput = () => {
					clearTimeout(time);
					alias = a.value;
					time = setTimeout(() => {
						localStorage.setItem('aliasForTalk', alias);
					}, 3000);
				}

				talks.onscroll = () => {
					if (listingFields == maxFields || bloks & 32) return;
					bloks = bloks | 32;
					setTimeout(() => {
						if (bloks & 32) bloks = bloks ^ 32;
					}, 200);
					if (talks.scrollTop > talks.scrollHeight - 800) {
						f.send(103, [listingFields,listingFields+10]);
					}
				}

				document.getElementById('talk-input').children[1].children[0].addEventListener('keydown', (e) => {
					if (!e.shiftKey & e.keyCode == 13) {
						f.sendMeow();
						e.preventDefault();
					}
				});

				app.addPrompt(set.children[0], 'Назад');
				app.addPrompt(set.children[1], 'Начать разговор');
			}
			req.open('GET', '/getcookie', true);
			req.send();
			req.onload = () => { 
				const {res, cookie, alias} = JSON.parse(req.response);
				if (res) f.send(102, `auth=${cookie}; alias=${alias}`)
				else app.displayError('Не удалось подключиться к серверу');
			}
		}
		ws.onmessage = (e) => {
			const {type, data} = JSON.parse(e.data);
			console.log(type, data);
			switch (type) {
				case 2:
					f.send(103, [0,10]); break;
				case 3:
					if (!first) talks.innerHTML = '';
					KNOWN = data.known; PN = data.pn; maxFields = data.max; listingFields += data.t.length;
					for (let i = 0; i < data.t.length; i++) talks.appendChild(renderATalk(data.t[i]).div);
					preload.style.display = 'none';
					if (first) talks.style.display = 'block';
					if (first) talksR.style.display = 'block';
					break;
				case 4:
					const id = getIdNowTalk();

					if (!generatedTalk.children[1]) {
						generatedTalk.scrollTop = generatedTalk.scrollHeight;
						generatedTalk.onscroll = () => {
							if (bloks & 2 || TALKS[id].all) return;
							bloks = bloks | 2;
							setTimeout(() => {
								if (bloks & 2) bloks = bloks ^ 2;
							}, 200);

							if (generatedTalk.scrollTop < generatedTalk.clientHeight) {
								lastScroll = generatedTalk.scrollHeight;
								const m = Object.keys(TALKS[id].content).length;
								preload.style.display = 'block';
								f.send(104, [m,m+50,id]);
							}
						}
						generatedTalkR.innerHTML = `<button class="form" style="width: 96%;${TALKS[id].admins.some(a => a == PN) ? '' : 'display:none;'}">Редактировать</button>` +
						`<div style="display: flex;align-items: center;"><div><img style="border-radius: 25px; background:` +
						` ${TALKS[id].color};margin-right: 5px;" src="${TALKS[id].img}" width="25" height="25"></div><div>` +
						`<h4>${TALKS[id].name}</h4></div></div><h5>${TALKS[id].type ? 'Диалог' : 'Монолог'}</h5>` +
						`<div class="as-form" style="display: flex;cursor: pointer;"><img src="/img/talk/4.svg" ` +
						`width="20" height="20"><div style="margin-left: 10px;">Описание</div></div>` +
						`<div class="as-form" style="display: flex;cursor: pointer;"><img src="/img/talk/4.svg"` +
						` width="20" height="20"><div style="margin-left: 10px;">Участники</div></div>`;

						TALKS[id].choose = [];
						let d = document.getElementById('a-talk-members');
						d.appendChild(document.createElement('div'));
						d.lastChild.id = `a-talk-members${id}`;
						d.lastChild.style.maxHeight = '400px';
						d.lastChild.style.overflow = 'auto';
						d.lastChild.style.display = 'none';
						for (let i = 0; i < TALKS[id].members.length; i++) {
							if (TALKS[id].members[i] == PN) continue;
							d.lastChild.appendChild(renderKnown(TALKS[id].members[i], div => {
								if (!TALKS[id].choose.some((x, y) => {
									if (x == TALKS[id].members[i]) {
										TALKS[id].choose.splice(y, 1);
										div.children[2].style.display = 'none';
										return true;
									}
								})) {
									TALKS[id].choose.push(TALKS[id].members[i]);
									div.children[2].style.display = 'block';
								}
							}).div);
						}

						d = document.getElementById('a-talk-description');
						d.appendChild(document.createElement('div'));
						d.lastChild.id = `a-talk-description${id}`;
						d.lastChild.style.display = 'none';
	const content = TALKS[id].pre ? JSON.parse(TALKS[id].md ? TALKS[id].pre.replace(/</g, '&lt;') : TALKS[id].pre.replace(/</g, '&lt;').replace(/\\n/g, '<br>')) : '';
	d.lastChild.innerHTML = `<div class="talk-description">${TALKS[id].md ? md.makeHtml(content).replace(/&amp;/g, '&') : content}</div>`;


						const edit = document.getElementById('a-talk-edit'),
							mems = document.getElementById(`a-talk-members${id}`),
							desc = document.getElementById(`a-talk-description${id}`);

						generatedTalkR.children[0].onclick = () => {
							aTalk.style.display = 'none';
							desc.style.display = 'none';
							mems.style.display = 'none';
							edit.style.display = 'block';
							editFillDef(id);
							set.children[0].onclick = f.backFromEditorATalk;
						};
						generatedTalkR.children[3].onclick = () => {
							aTalk.style.display = 'none';
							mems.style.display = 'none';
							edit.style.display = 'none';
							desc.style.display = 'block';
							set.children[0].onclick = () => f.backFromDescriptorATalk(id);
						};
						generatedTalkR.children[4].onclick = () => {
							aTalk.style.display = 'none';
							edit.style.display = 'none';
							desc.style.display = 'none';
							mems.style.display = 'block';
							set.children[0].onclick = () => f.backFromMembersATalk(id);
						};
						aTalkR.appendChild(generatedTalkR);
					}

					if (data) {
						TALKS[id].newMsg = null;
						for (let i = 0; i < data.length; i++) {
							const r = renderAMsg(data[i]);

							if (Object.keys(TALKS[id].content).length)
								generatedTalk.insertBefore(r.div, generatedTalk.firstChild)
							else generatedTalk.appendChild(r.div);

							if (!TALKS[id].newMsg && TALKS[id].userLastActiv < data[i].id) TALKS[id].newMsg = data[i].id;
							TALKS[id].content[data[i].id] = r.content;

						}
						if (data.length == 0) TALKS[id].all = true;
					} else generatedTalk.innerHTML = 'Здесь пока что не ведется разговор. Начните первым!';

					if (TALKS[id].newMsg) generatedTalk.scrollTop = generatedTalk.querySelector(`[data-peer="${TALKS[id].newMsg}"]`).offsetHeight
					else generatedTalk.scrollTop = generatedTalk.scrollHeight - lastScroll;

					preload.style.display = 'none';
					if (bloks & 1) bloks = bloks ^ 1;
					break;
				case 5: {
					moveToUp(data.id, data.sender != PN);
					const t = document.getElementById(`talk${data.id}`);
					if (t) {
						document.addEventListener('mousemove', () => {
							if (data.sender == PN) return;
							f.send(107, {id: data.id}); //, pn: data.sender});
						}, {once: true});
						if (!t.children.length) t.innerHTML = '';
						const h_t = document.getElementById(`hight-talk${data.id}`),
							withoutId = Object.assign({}, data);
							withoutId.id = withoutId.msgId;
						const	r = renderAMsg(withoutId);
						t.appendChild(r.div);
						h_t.children[2].title = r.time[0];
						h_t.children[2].textContent = r.time[1];
						if (data.sender != PN) h_t.children[1].children[1].style.display = 'inline-block';

						if (data.id == getIdNowTalk()) {
							t.scrollTop = t.scrollHeight;
							h_t.children[1].children[1].style.display = 'none';
						}
					} break;
				}
				case 6:
					if (data.admins[0] == PN) app.displayDone('Разговор успешно начат!');
					talks.insertBefore(renderATalk(data).div, talks.firstChild); break;
				case 7:
					app.displayError(data); break;
				case 8:
					hidePaws(data); break;
				case 9:
					if (data[1] != PN && data[0] == getIdNowTalk()) f.isWriting({pn: data[1], alias: data[2]}); break;
				case 10:
					app.displayDone(data); break;
				case 11:
					maxFields = data.max; listingFields += data.t.length;
					for (let i = 0; i < data.t.length; i++) talks.appendChild(renderATalk(data.t[i]).div);
					preload.style.display = 'none';
			}
		}
		ws.onclose = (e) => {
			console.log('соединение закрылось', bloks, e.code);
//			if (e.code == 4001) return document.addEventListener('mousemove', waiting, {once: true});
//			reconnect();
			if (bloks & 16) return;
			reconnect();
			bloks = bloks | 16;
		}
	}
	function editFillDef(id) {
		const c = document.getElementById('a-talk-edit');
		c.children[0].children[0].value = TALKS[id].name;
		if (TALKS[id].type) c.children[1].children[0].children[1].checked = true
		else c.children[1].children[0].children[0].checked = true;
		c.children[2].children[1].value = JSON.parse(TALKS[id].pre || "\"\"");
		c.children[2].children[4].children[0].checked = TALKS[id].md;
	}

	function hidePaws(data) {
		let c = document.getElementById(`talk${data[0]}`);
		if (!c) return;
		c = c.querySelectorAll('[data-peer]');
		for (let i = 0; i < c.length; i++) {
			if (+c[i].dataset.peer >= data[1]) c[i].children[0].children[0].style.display = 'none';
		}
	}

	function renderAMsg(data) {
		const div = document.createElement('div'),
			time = app.serveRawDate(data.id),
			content = JSON.parse(data.md ? data.content.replace(/</g, '&lt;') : data.content.replace(/</g, '&lt;').replace(/\\n/g, '<br>'));

		if (data.sender == PN) div.style.textAlign = 'right';
		div.dataset.peer = data.id;
		div.innerHTML = `<div class="msg-talk"><img ${data.read && data.sender == PN ? '' : 'style="display:none;"'}`+
			 `src="/img/talk/4.svg" class="msg-isntwrote" width="10" height="10">` +
			 `<span>${data.sender == PN ? 'Вы' : KNOWN[data.sender] && KNOWN[data.sender][0] ? KNOWN[data.sender][0].value : 'Неизвестный котик'}` +
			 `${data.alias ? ' (' + data.alias + ')' : ''}</span><span class="msg-talk-time" title="${time[0]}">${time[1]}</span>` +
			 `<div style="font-weight: normal;">${data.md ? md.makeHtml(content).replace(/&amp;/g, '&') : content}</div></div>`;
		return {time, content, div}
	}

	function renderATalk(data) {
		const div = document.createElement('div'),
			time = app.serveRawDate(data.lastActiv);
		div.id = `hight-talk${data.id}`;
		div.classList.add('form'); div.classList.add('field-of-talks');

		div.innerHTML = `<div style="display: inline-block;">` +
			 `<img style="border-radius: 25px; background: ${data.color};"` +
			 ` src="${data.img}" width="50" height="50"></div><div class="center-of-field-talk"><div>${data.name}` +
			 `</div><div ${data.userLastActiv < data.lastActiv ? 'style="display:inline-block"' : ''}` +
			 `class="isnt-writed-talk">Есть непрочитанное сообщение</div>` +
			 `</div><div class="lower-text time-last-talk" title="${time[0]}">${time[1]}</div></div>`;

		div.onmouseover = () => mouseoverTalk(div);
		div.onmouseout = () => mouseoutTalk(div);
		div.onclick = () => clickTalk(div, data);

		TALKS[data.id] = data;
		TALKS[data.id].content = {};
		return {time, div}
	}

	function renderKnown(pn, func) {
		const div = document.createElement('div');
		div.classList.add('form'); div.classList.add('field-of-talks');
		div.innerHTML = `<div style="display: inline-block;">` +
			`<div style="background-color: ${colors[Math.floor(Math.random() * colors.length)]};`+
			`background-image: url(${KNOWN[pn] && KNOWN[pn][3] ? KNOWN[pn][3].skin : '/img/players/2682152751.svg'});"` +
			`class="talk-known-img"></div></div><div class="center-of-field-talk"><div>` +
			`${KNOWN[pn] && KNOWN[pn][0] ? KNOWN[pn][0].value : 'Имя неизвестно'}</div><div class="norm-txt">` +
			`${KNOWN[pn] && KNOWN[pn][1] ? KNOWN[pn][1].item + ' ' + KNOWN[pn][1].value : ''}</div>` +
			`<div class="norm-txt">${KNOWN[pn] && KNOWN[pn][2] ? KNOWN[pn][2].item + ' ' + KNOWN[pn][2].value : ''}</div></div>` +
			`<div class="talk-choose-members">Выбран <img src="/img/talk/4.svg"></div>`;
		div.onclick = () => func(div);
		return {div};
	}

	function mouseoverTalk(div) {
		div.style.backgroundColor = 'rgb(187, 139, 84, 0.6)';
	}

	function mouseoutTalk(div) {
		div.style.backgroundColor = 'rgb(187, 139, 84)';
	}

	function clickTalk(div, data) {
		f.toATalk(data.id);
		f.send(107, {id: data.id}); //, pn: PN});
		div.children[1].children[1].style.display = 'none';
	}

	function moveToUp(id, noWrote) {
		const t = document.getElementById(`hight-talk${id}`);
		talks.insertBefore(t, talks.firstChild);
		if (noWrote || id != getIdNowTalk()) t.children[1].children[1].style.display = 'inline-block';
	}

	function getIdNowTalk() {
		if (generatedTalk) return +generatedTalk.id.match(/\d+/)[0]
		else return null;
	}

	app.get = function() {
		console.log({bloks, TALKS, KNOWN, newTalk})
	}
}

app.talk.f.preload(true);
