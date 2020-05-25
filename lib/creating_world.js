//все происходящее здесь вносит лишь изменения в базу данных, но не в игру непосредственно

const fs = require('fs');

class CreatingWorld {
	constructor(db, world) {
		this.db = db;
		this.world = world;
	}
	save(db, world) {
		if (db) {
			fs.writeFile('./../databases/cats.js', 'module.exports = ' + JSON.stringify(this.db), (err) => {
				if (err) console.log(err); //залогинируй ошибку
			});
		}
		if (world) {
			fs.writeFile('./../databases/world.js', 'module.exports = ' + JSON.stringify(this.world), (err) => {
				if (err) console.log(err); //залогинируй ошибку
			});
		}
	}
	//l - массив с номерами локаций
	changeWeather(change, ...l) {
		for(let i = 0; i < l.length; i++) {
			world.nosort[l[i]].public.weather = change;
		}
		this.save(false, true);
	}
	addLocation(name, type, surface) {
		world.nosort.push({
			public: {
				name = name,
				weather = 'sun',
				fill = [],
				landscape = [],
				surface = surface || '/img/textures/0.svg',
			},
		});
		this.save(false, true);
	}
	static include(db, world) {
		return new CreatingWorld(db, world);
	}
}

module.exports = CreatingWorld;
