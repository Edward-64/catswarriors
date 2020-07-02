const xml = require('xml2js'),
	fs = require('fs'),
	optionsForSVG = {attrkey: 'attrs'},
	parserSVG = new xml.Parser(optionsForSVG),
	builderSVG = new xml.Builder(optionsForSVG),
	colorsOfBase = {
		def: {
			body: '#df7921',
			shadow: '#b75c0d',
			pattern: '#803d00',
		},
		now: [20,191,128],
		colorsWool: [[143,15,128], [6,44,128], [8,90,128], [20,191,128],[0,0,128]],
		colorsSkin: [[176,13,68],[177,13,140],[245,41,103],[247,126,199],[6,100,100],[7,52,156]],
		colorsEyes: [[107,105,94],[59,102,142],[39,184,143],[26,245,131],[13,143,100],[136,85,142]],
	},
	validator = require('./validators.js');

class CharacterCreator extends require('events').EventEmitter {
	constructor(base) {
		super();
		this.base = base;
	}
	reqExpFill(from, to, obj) {
		const r = new RegExp('fill:' + from);
		if (r.test(obj.attrs.style)) obj.attrs.style = obj.attrs.style.replace(r, `fill:${to}`);
	}
	replaceFill(from, to, obj = this.base) {
		obj.g.forEach(x => {
			if (x.path) x.path.forEach(y => {
				this.reqExpFill(from, to, y);
			});
			if (x.g) this.replaceFill(from, to, x);
		});
	}
	getElementById(id, obj = this.base) {
		const keys = Object.keys(obj),
			l = keys.length;
		if (obj.attrs && obj.attrs.id === id) return obj;
		for (let i = 0; i < l; i++) {
			if (keys[i] === 'attrs') continue;
			const is = this.getElementById(id, obj[keys[i]]);
			if (is) return is;
		}
	}
	getElementByIdWith(id, obj = this.base, a = []) {
		const keys = Object.keys(obj),
			l = keys.length;
		if (obj.attrs && obj.attrs.id.startsWith(id)) a.push(obj);
		for (let i = 0; i < l; i++) {
			if (keys[i] === 'attrs') continue;
			const is = this.getElementByIdWith(id, obj[keys[i]]);
			if (is) a = a.concat(is);
		}
		return a;
	}
	hslToStringRgb(hsl) {
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

		  let rgb = [ r, g, b ].map(i => Math.round(i * 255));
		  return '#' + rgb.map(x => {
			let buffer = '';
			if (x < 16) buffer += '0';
			return buffer += Number(x).toString(16);
		  }).join('');
	}
	cookCharacter(fromUser) {
		try {
			const S = 8,
				l = (128 - fromUser[1]) / S,
				k = fromUser[3] ? (128 - fromUser[3]) / S : 0,
				n = colorsOfBase.colorsWool[fromUser[0]];
			let	body = [n[0],
					  fromUser[0] == 4 ? 0 : n[1] + l,
					  fromUser[1]],
				pattern = [n[0],
					     fromUser[0] == 4 ? 0 : n[1] + l + k + 64 / S,
					     fromUser[3] ? fromUser[3] : fromUser[1] - 64],
				shadow = [n[0],
					    fromUser[0] == 4 ? 0 : n[1] + l + 32 / S,
					    fromUser[1] - 32],
				eyes = colorsOfBase.colorsEyes[fromUser[5]], skin;
			function validate(v) {
				v[0] = v[0] < 0 ? 0 : v[0] > 255 ? 255 : v[0];
				v[1] = v[1] < 0 ? 0 : v[1] > 255 ? 255 : v[1];
				v[2] = v[2] < 0 ? 0 : v[2];
				return v;
			}
			body = validate(body); pattern = validate(pattern); shadow = validate(shadow);
			switch (fromUser[0]) {
				case 0:;
				case 4: skin = body[2] > 156 ? colorsOfBase.colorsSkin[1] : colorsOfBase.colorsSkin[0]; break;
				case 1: skin = body[2] > 156 ? colorsOfBase.colorsSkin[3] : colorsOfBase.colorsSkin[2]; break;
				case 2: skin = body[2] > 156 ? colorsOfBase.colorsSkin[5] : colorsOfBase.colorsSkin[4]; break;
				case 3: skin = body[2] > 156 ? colorsOfBase.colorsSkin[3] : colorsOfBase.colorsSkin[4]; break;
			}
			return {body: this.hslToStringRgb(body), pattern: this.hslToStringRgb(pattern), shadow: this.hslToStringRgb(shadow),
				  eyes: this.hslToStringRgb(eyes), skin: this.hslToStringRgb(skin)}
		} catch (err) {
			validator.log('ошибка в cookCharacter в lib/cch.js: ' + err);
		}
	}
	createCharacter(pn, fromUser) {
		fs.readFile(__dirname + '/../img/base.svg', 'utf8', (err, data) => {
			if (err) {
				validator.log('ошибка в createCharacter в lib/cch.js ' +
				`при чтении директории ${__dirname + '/img/base.svg'}: ${err}`);
				return this.emit('finishCreateCharacter', true, null);
			}
			parserSVG.parseString(data, (err, res) => {
				if (err) {
					validator.log('ошибка в createCharacter в lib/cch.js при анализе svg: ' + err);
					return this.emit('finishCreateCharacter', true, null);
				}
				else {
					this.base = res.svg;
					const eyes = this.getElementByIdWith('iris'),
						insideEars = this.getElementByIdWith('inside'),
						nose = this.getElementByIdWith('nose'),
						newCharacter = this.cookCharacter(fromUser);

					this.replaceFill('#df7921', newCharacter.body);
					this.replaceFill('#b75c0d', newCharacter.shadow);
					this.replaceFill('#803d00', newCharacter.pattern);
					eyes.forEach(x => {
						this.reqExpFill('#37845e', newCharacter.eyes, x);
					});
					insideEars.forEach(x => {
						this.reqExpFill('#8b483d', newCharacter.skin, x);
					});
					nose.forEach(x => {
						this.reqExpFill('#8b483d', newCharacter.skin, x);
					});
					const thePathIsExist = () => {
						const spath = '/img/players/' + Math.round(Math.random() * 10000000000) + '.svg';
						fs.access(__dirname + '/..' + spath, fs.constants.F_OK, err => {
							if (!err) thePathIsExist()
							else {
								fs.writeFile(__dirname + '/..' + spath, builderSVG.buildObject(res), err => {
									if (err) {
										validator.log('ошибка в createCharacter в lib/cch.js при записи скина персонажа ' + pn + ': ' + err);
										return this.emit('finishCreateCharacter', true, null);
									} else return this.emit('finishCreateCharacter', null, spath);
								});
							}
						});
					}
					thePathIsExist();
				}
			});
		});
	}
}

module.exports = new CharacterCreator(null);
