'use strict'

class ControlActivs {
	constructor(talks) {
		this.talks = talks;
	}

	hTalk(id) {
		++this.talks.cache[id].activ;
		setTimeout(() => {
			if (this.talks.cache[id]) --this.talks.cache[id].activ;
		}, 600000); //раз в десять минут
	}
	static include(talks) {
		return new ControlActivs(talks);
	}
}

module.exports = ControlActivs;
