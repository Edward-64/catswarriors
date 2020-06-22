'use strict'
app.cch = {
	next: {
		wht: {v: 0},
		patt: {v: 0}
	},
	funcs: {
		preloader: null,
		changeWool: null, contrastPattern: null, addWhite: null, changeEyes: null, changeSkin: null,
		nextPattern: null, nextWhite: null,
		rgbToHsl: null, hslToRgb: null,
		recover: null
	},
	skin: {
		nose: true,
		ears: true
	},
      ears: 'solid'
}

/*
	all[0] - цвет тела
	all[1] - контрастность тела
	all[2] - рисунок на теле
	all[3] - контрастность рисунка на теле. Если 0, то контрастность не применялась
	all[4] - белые элементы
	all[5] - цвет глаз
	all[6] - 11: светло-розовые участки везде
		   10: только на ухе
		    1: только на носу

	colorsSkin[0] - черный
	colorsSkin[1] - серый
	colorsSkin[2] - бурый темный
	colorsSkin[3] - бурый светлый, белый или светлый абрикосовый
	colorsSkin[4] - циннамон или красный
	colorsSkin[5] - светлая корица
*/

{
	const colorsWool = [[143,15,128], [6,44,128], [8,65,128], [20,191,128],[0,0,128]],
		colorsSkin = [[176,13,68],[177,13,140],[245,41,103],[247,126,199],[6,100,100],[7,52,156]],
		colorsEyes = [[107,105,94],[59,102,142],[39,184,143],[26,245,131],[13,143,100],[136,85,142]],
		all = [3, 128, 0, 0, 0, 0, 0];
	let   obj, o, rangeWool, rangePattern, nowWool, fromServer, S = 8;
	function IsObjLoaded() {
		if (!o || !o.getElementById('body')) {
			o = obj.contentDocument;
			return false;
	      }
            return true;
	}
	function getDefWool(v) {
            if (!IsObjLoaded()) { setTimeout(() => {nowWool = getDefWool(v)}, 100); return; }
		const d = {
			n: v,
			body: { arr: colorsWool[v], str: o.getElementById('body').style.fill},
			elems: { arr: [
					colorsWool[v][0],
					v == 4 ? 0 : colorsWool[v][1] + 64 / S > 254 ? 254 :  colorsWool[v][1] + 64 / S,
					colorsWool[v][2] - 64 < 1 ? 1 : colorsWool[v][2] - 64,
				], str: o.getElementById('path5176').style.fill },
			shadow: { arr: [
					colorsWool[v][0],
					colorsWool[v][1]/*v == 4 ? 0 : colorsWool[v][1] + 32 / S > 254 ? 254 :  colorsWool[v][1] + 32 / S*/,
					colorsWool[v][2] - 32 < 1 ? 1 : colorsWool[v][2] - 32
				], str: o.getElementById('leftLowPaw1').style.fill }
			};
			return d;
	}

      function string(hsl) {
            return 'rgb(' + app.cch.funcs.hslToRgb(hsl).join(', ') + ')';
      }

      function saveAll() {
		const parsed = JSON.stringify(all);
            localStorage.setItem('creatingCharacter', parsed);
		document.getElementById('code').value = parsed;
      }

	app.cch.funcs.changeSkin = function() {
		const n = nowWool.body.arr;
		let	target;
		switch (nowWool.n) {
			case 0:;
			case 4: target = n[2] > 156 ? colorsSkin[1] : colorsSkin[0]; break;
			case 1: target = n[2] > 156 ? colorsSkin[3] : colorsSkin[2]; break;
			case 2: target = n[2] > 156 ? colorsSkin[5] : colorsSkin[4]; break;
			case 3: target = n[2] > 156 ? colorsSkin[3] : colorsSkin[4]; break;
		}
		if (app.cch.skin.ears) o.getElementById('insideRightEar').style.fill = string(target);
		if (app.cch.skin.nose) o.getElementById('nose').style.fill = string(target);
	}

      function doChange(newWool) {
            app.changeSVG(obj, nowWool.elems.str, newWool.elems.str);

            o.getElementById('body').style.fill = newWool.body.str;
            o.getElementById('rightHightPaw1').style.fill = newWool.body.str;
            o.getElementById('rightHightPaw2').style.fill = newWool.body.str;
            o.getElementById('tail').style.fill = newWool.body.str;
            o.getElementById('leftBorder').style.fill = newWool.body.str;
            o.getElementById('rightBorder').style.fill = newWool.body.str;

            o.getElementById('leftLowPaw1').style.fill = newWool.shadow.str;
            o.getElementById('leftLowPaw2').style.fill = newWool.shadow.str;
            if (app.cch.ears === 'solid') {
                  o.getElementById('rightEar').style.fill = newWool.shadow.str;
                  o.getElementById('leftEar').style.fill = newWool.shadow.str;
                  o.getElementById('lineFall').style.fill = newWool.shadow.str;
            }
      }

      app.cch.funcs.changeWool = function(v) {
            all[0] = v; all[1] = 128; all[3] = 0; saveAll();
		rangeWool.value = 128;

            const newWool = getDefWool(v);
		rangePattern.max = newWool.shadow.arr[2] < 16 ? 16 : newWool.shadow.arr[2];
		rangePattern.value = newWool.shadow.arr[2] - 32;

            newWool.body.str = string(newWool.body.arr);
            newWool.elems.str = string(newWool.elems.arr);
            newWool.shadow.str = string(newWool.shadow.arr);

            doChange(newWool);

            nowWool = newWool;
		app.cch.funcs.changeSkin();
		rangePattern.max = nowWool.shadow.arr[2];
      }

      app.cch.funcs.contrastWool = function(v) {
            all[1] = v; saveAll();

            const n = colorsWool[nowWool.n],
                  l = (128 - v) / S,
			b = nowWool.n == 4 ? 1 : n[1] + l,
			e = nowWool.n == 4 ? 1 : n[1] + l + 64 / S,
			s = nowWool.n == 4 ? 1 : n[1] + l + 32 / S,
                  newWool = {
                        n: nowWool.n,
                        body: { arr: [n[0], b > 254 ? 254 : b < 1 ? 1 : b, v < 1 ? 1 : v] },
                        elems: { arr: [n[0], e > 254 ? 254 : e < 1 ? 1 : e, v - 64  < 1 ? 1 : v - 64] },
                        shadow: { arr: [n[0], n[1], v - 32 < 1 ? 1 : v - 32] },
                  },
			forCheck = Object.keys(newWool).filter(i => i !== 'n');

            newWool.body.str = string(newWool.body.arr);
            newWool.elems.str = string(newWool.elems.arr);
            newWool.shadow.str = string(newWool.shadow.arr);

            doChange(newWool);

            nowWool = newWool;
		app.cch.funcs.changeSkin();
		rangePattern.max = nowWool.shadow.arr[2] < 16 ? 16 : nowWool.shadow.arr[2];
		rangePattern.value = nowWool.shadow.arr[2] - 32;
      }

      app.cch.funcs.nextPattern = function(p) {
		function toTabby() {
                  app.cch.ears = 'tabby';
	      	o.getElementById('rightEar').style.fill = nowWool.elems.str;
	            o.getElementById('leftEar').style.fill = nowWool.elems.str;
	            o.getElementById('lineFall').style.fill = nowWool.elems.str;
	            o.getElementById('border').style.opacity = 1;
		}
            function toSolid() {
                  app.cch.ears = 'solid';
	            o.getElementById('rightEar').style.fill = nowWool.shadow.str;
	            o.getElementById('leftEar').style.fill = nowWool.shadow.str;
	            o.getElementById('lineFall').style.fill = nowWool.shadow.str;
	            o.getElementById('border').style.opacity = 0;
	      }
	      function resetElements() {
	            const a = o.getElementById('elements'),
				b = o.getElementById('elementsOnPaw');
	            for (let i = 0; i < a.children.length; i++) a.children[i].style.opacity = 0;
	            for (let i = 0; i < b.children.length; i++) b.children[i].style.opacity = 0;
            }
	      const l = document.getElementById('pattArrowL'),
	      	r = document.getElementById('pattArrowR');

		app.animationArrows(l, r, p, app.cch.next.patt, fromServer.lastPattern, () => {
		      all[2] = app.cch.next.patt.v; saveAll();
	            document.getElementById('patterns').src = `/img/cch/patt/${app.cch.next.patt.v}.svg`;
	            switch (app.cch.next.patt.v) {
		            case 0: toSolid(); resetElements(); break;
	                  case 1:
	      	            toTabby(); resetElements();
	                        o.getElementById('strips').style.opacity = 1;
	                        o.getElementById('stripsOnPaw').style.opacity = 1;
	                        break;
	                  case 2:
	                        toTabby(); resetElements();
	                        o.getElementById('tabby-color').style.opacity = 1;
	                        o.getElementById('tabby-colorOnPaw').style.opacity = 1;
	            }
		});
	}

	let lastWhiteElement = {}, noDelete = [];
	app.cch.funcs.nextWhite = function(p) {
		function check(what, n, name) {
			if (lastWhiteElement.str)
				if (!noDelete.some(x => x == lastWhiteElement.str))
					o.getElementById(lastWhiteElement.str).style.opacity = 0;
			o.getElementById(what).style.opacity = 1;
			lastWhiteElement.str = what;
			lastWhiteElement.n = n;
			lastWhiteElement.name = name;
		}
	      const l = document.getElementById('whtArrowL'),
	      	r = document.getElementById('whtArrowR');

		app.animationArrows(l, r, p, app.cch.next.wht, fromServer.lastWhite, () => {
			document.getElementById('whities').src = `/img/cch/wht/${app.cch.next.wht.v}.svg`;
			switch (app.cch.next.wht.v) {
				case 0:
					if (!noDelete.some(i => i == lastWhiteElement.str))
						o.getElementById(lastWhiteElement.str).style.opacity = 0;
					lastWhiteElement.n = null; break;
				case 1: check('whiteRightPaw', 1, 'передняя пр. лапка 1/5'); break;
				case 2: check('leftWhiteOnPaw1-5', 2, 'передняя л. лапка 1/5'); break;
			}
		});
	}

	app.cch.funcs.addWhite = function() {
		const n = app.cch.next.wht.v;
		if (!n) return;
		if (noDelete.length > 3) return alert('Можно добавить не более четырёх зон');
		if (noDelete.some(i => i == lastWhiteElement.str)) return alert('Эта зона уже добавлена');

		all[4] = all[4] | 1 << n - 1; saveAll();
		noDelete.push(lastWhiteElement.str);

		const	field = document.createElement('div'),
			thisLastWhiteElement = lastWhiteElement.str,
			b = document.createElement('button');
		b.classList.add('form');
		b.style.fontSize = '7pt';
		b.style.marginLeft = '3px';
		b.style.marginBottom = '1px';
		b.innerHTML = 'удалить';
		b.onclick = () => {
			field.remove();
			noDelete.some((i, j) => {
				if (i == thisLastWhiteElement) noDelete.splice(j, 1);;
			});
			all[4] = all[4] ^ 1 << n - 1; saveAll();
			o.getElementById(thisLastWhiteElement).style.opacity = 0;
		}
		field.innerHTML = lastWhiteElement.name;
		field.appendChild(b);
		document.getElementById('added').appendChild(field);
	}

      app.cch.funcs.contrastPattern = function(v) {
		all[3] = v; saveAll();

		const	newElems = Object.assign({}, nowWool.elems),
			l = (128 - v) / S,
			e = getDefWool(nowWool.n).elems.arr[1] + l;

		newElems.arr[1] = nowWool.n == 4 ? 0 : e > 254 ? 254 : e;
		newElems.arr[2] = v;
		newElems.str = string(newElems.arr);

		app.changeSVG(obj, nowWool.elems.str, newElems.str);

		nowWool.elems = newElems;

      }

	app.cch.funcs.changeEyes = function(v) {
		all[5] = v; saveAll();
		o.getElementById('iris').style.fill = string(colorsEyes[v]);
	}

	app.cch.funcs.recover = function(raw, reloadObj) {
		try {
			raw = JSON.parse(raw);
			if (raw[0] < 0 || raw[0] >= colorsWool.length) throw new Error();
			app.cch.funcs.changeWool(raw[0]);
			if (raw[1] < 0 || raw[1] > 255) throw new Error();
			rangeWool.value = raw[1];
			app.cch.funcs.contrastWool(raw[1]);
			if (raw[2] < 0 || raw[2] > fromServer.lastPattern) throw new Error();
			app.cch.next.patt.v = raw[2] - 1; app.cch.funcs.nextPattern(1);
			if ((raw[3] > 0 && raw[3] < 16) || raw[3] > rangePattern.max) throw new Error();
			if (raw[3] >= 16) {
				rangePattern.value = raw[3];
				app.cch.funcs.contrastPattern(raw[3]);
			}
			if (raw[4] < 0 || raw[4] >=  Math.pow(2, fromServer.lastWhite)) throw new Error();
			document.getElementById('added').innerHTML = ''; all[4] = 0; saveAll(); noDelete = [];
	            const a = o.getElementById('whiteElements'),
				b = o.getElementById('whiteOnPaw');
	            for (let i = 0; i < a.children.length; i++) a.children[i].style.opacity = 0;
	            for (let i = 0; i < b.children.length; i++) b.children[i].style.opacity = 0;
			for (let i = 0; i < fromServer.lastWhite; i++) {
				app.cch.next.wht.v = i;
				if (raw[4] & 1 << i) {
					app.cch.funcs.nextWhite(1);
					app.cch.funcs.addWhite();
				}
			}
			lastWhiteElement.str = 'whiteRightPaw';
			app.cch.next.wht.v = 1; app.cch.funcs.nextWhite(-1);
			if (raw[5] < 0 || raw[5] >= colorsEyes.length) throw new Error();
			app.cch.funcs.changeEyes(raw[5]);
		} catch(error) {
			//console.log(error);
			const err = document.getElementById('errorRecover');
			err.innerHTML = 'Не удалось восстановить окрас';
			err.style.display = 'block';
			setTimeout(() => { err.style.display = 'none'; }, 5000);
		}
	}

	app.cch.funcs.preloader = function() {
		req.open('GET', '/getacch', true);
		req.send();
		req.addEventListener('load', () => {
			const {res, data} = JSON.parse(req.response);
			if (req.status != 200 || res == 0) document.getElementById('preload').innerHTML = `Не удалось загрузить содержимое`
			else {
				fromServer = data;

				rangeWool = document.getElementById('wool');
				rangePattern = document.getElementById('pattern');
				document.getElementById('code').value = JSON.stringify(all);

				obj = document.getElementById('obj');
				o = obj.contentDocument;
				nowWool = getDefWool(3);

				document.getElementById('preload').style.display = 'none';
				document.getElementById('content').style.display = 'flex';
			}
		}, {once: true});
	}
}

/* thanks https://gist.github.com/mjackson/5311256 for rgb/hsl converter */

app.cch.funcs.rgbToHsl = function(rgb) {
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

app.cch.funcs.hslToRgb = function(hsl) {
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


app.cch.funcs.preloader();
