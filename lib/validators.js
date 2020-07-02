const fs = require('fs'),
	lastLog = fs.readdirSync(__dirname + '/../errs').length;

class Validators {
	constructor(lastLog) {
		this.lastLog = lastLog;
	}
	log(err) {
		console.log(err);
		const date = new Date().toString(),
			item = date + '\n\n' + err;
		fs.writeFile(__dirname + '/../errs/' + ++this.lastLog, item, (err) => {
			if (err) console.log('happened error in error, lol');
		});
	}
	msg(pn, cat, type, msg) {
	      try {
	            if (pn <= 0 || !cat[0] || !cat[1]) throw new Error(`Ошибка авторизации: ${pn} || ${!!cat[0]} || ${!!cat[1]}`);
	            let q;
	            if (msg) q = Object.keys(msg)
	            else return true;

	            const errs = {
	                  excess() { throw new Error(`Лишние свойства в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`); },
	                  noProp(a) { throw new Error(`Отсутствует свойство ${a} в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`); },
	                  noCurrData(a) { throw new Error(`Данные - не ${a} в ${type}: ${JSON.stringify(msg)}. Отправитель: ${pn}.`); },
	            }

	            switch (type) {
	                  case 103:
	                        if (q.length > 1) errs.excess();
	                        if (q[0] !== 'value') errs.noProp('value');
	                        if (typeof msg.value[0] !== 'number' || typeof msg.value[1] !== 'number') errs.noCurrData('число'); break;
	                  case 104:
	                        if (q.length > 1) errs.excess();
	                        if (typeof msg.value !== 'string') errs.noCurrData('строка'); break;
	                  case 108:
	                        if (q.length > 2) errs.excess();
	                        if (!q.some(x => x == 'i')) errs.noProp('i');
	                        if (typeof msg.i !== 'number') errs.noCurrData('число');
	                        if (msg.pn && typeof msg.pn !== 'number') errs.noCurrData('число');
	                        if (msg.i < 0 && !msg.pn) errs.noProp('pn'); break;
	                  case 106:
	                        if (q.length > 2) errs.excess(); //2 - динамичное значение
	                        if (!q.some(x => x == 'about')) errs.noProp('about');
	                        if (!q.some(x => x == 'to')) errs.noProp('to');
	                        if (typeof msg.to !== 'number') errs.noCurrData('число'); q = msg.about;
	                        if (q) q.forEach(x => {
	                              const w = Object.keys(x);
	                              if (!w.some(x => x == 'i') || !w.some(x => x == 'value')) errs.noProp('i или value');
	                              if (typeof x.i !== 'number') errs.noCurrData('число');
	                              if (x.value && typeof x.value !== 'string') errs.noCurrData('строка');
	                        }); break;
	                  case 109:
	                        if (q.length > 2) errs.excess();
	                        if (!q.some(x => x == 'pn')) errs.noProp('pn');
	                        if (typeof msg.pn !== 'number') errs.noCurrData('число');
	                        if (!msg.data) errs.noProp('data');
	                        q = Object.keys(msg.data);
	                        q.forEach(x => {
	                              if (+x > 2) errs.excess(); //2 - динамичное значение
	                              if (typeof +x !== 'number') errs.noCurrData('число');
	                              const w = Object.keys(msg.data[x]);
	                              if (w > 2) errs.excess();
	                              if (!w.some(x => x == 'item') || !w.some(x => x == 'value')) errs.noProp('item или value');
	                              if (typeof msg.data[x].item !== 'string' || typeof msg.data[x].value !== 'string') errs.noCurrData('строка');
	                        }); break;
	            }
	            return true;
	      } catch (err) {
			this.log(err);
	      }
	}
	cch(raw, inh, c, pn) {
		try {
			inh.colors = Object.keys(inh.colors);
			inh.patterns = Object.keys(inh.patterns);
			raw.forEach(i => {
				if (typeof i !== 'number') throw new Error();
			});
			let	colorsWool = [[143,15,128], [6,44,128], [8,90,128], [20,191,128],[0,0,128]],
				maxContrast = raw[3] ? raw[1] - 32 : colorsWool[raw[0]][2] - 32;
			maxContrast = maxContrast < 16 ? 16 : maxContrast;
			if (raw[0] < 0 || raw[0] > c.lastColor) throw new Error('raw[1]: ' + raw[1] + ' > ' + c.lastColor);
			if (raw[1] < 0 || raw[1] > 255) throw new Error('raw[1]:' + raw[1] + ' > 255');
			if (raw[2] < 0 || raw[2] > c.lastPattern) throw new Error('raw[2]: ' + raw[2] + ' > ' + c.lastPattern);
			if ((raw[3] > 0 && raw[3] < 16) || raw[3] > maxContrast) throw new Error('raw[3]: ' + raw[3] + ' > ' + maxContrast);
			if (raw[4] < 0 || raw[4] >=  Math.pow(2, c.lastWhite)) throw new Error('raw[4]: ' + raw[4] + ' >= ' + Math.pow(2, c.lastWhite));
			//проверить что белыъ элементов не более 4-х
			if (raw[5] < 0 || raw[5] > c.lastEyes) throw new Error('raw[5]: ' + raw[5] + ' > ' + c.lastEyes);
			//проверить raw[6] - розовые уши\нос из-за белых пятен
			if (!inh.colors.some(i => i == raw[0])) throw new Error('пришедшие данные не совпадают с наследованием');
			if (!inh.patterns.some(i => i == raw[2])) throw new Error('пришедшие данные не совпадают с наследованием');
			if (!inh.white && raw[4]) throw new Error('пришедшие данные не совпадают с наследованием');
			return true;
		} catch (err) {
			this.log(`отправитель ${pn} ` + err);
		}
	}
}

module.exports = new Validators(lastLog);
