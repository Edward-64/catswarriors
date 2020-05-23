//все происходящее тут вновит изменения в базу данных, но не влияет непосредственно на игру
const fs = require('fs');

class CreatingWorld {
	constructor(db, world) {
		this.db = db;
		this.world = world;
	}

	save(db, world) {
		if (db) {
			fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(this.db), (err) => {
				//залогинируй ошибку
			});
		}
		if (world) {
			fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(this.world), (err) => {
				//залогинируй ошибку
			});
		}
	}

	// l - массив с номерами локаци
	changeWeather(change, ...l) {
		for(let i = 0; i < l.length; i++) {
			this.world.nosort[l[i]].weather = change;
		}
	}


	static include(db, world) {
		return new CreatingWorld(db, world);
	}
}

module.exports = CreatingWorld;
