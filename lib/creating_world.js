class CreatingWorld {
	constructor(db, world) {
		this.db = db;
		this.world = world;
	}
/*	//l - массив с номерами локаций
	changeWeather(change, ...l) {
		for(let i = 0; i < l.length; i++) {
			world.nosort[l[i]].public.weather = change;
		}
	} */
	addLocation(name, surface) {
		this.world.locs[++this.world.info.totalLocs] = {
			public: {
				name: name,
				weather: 'sun',
				fill: [],
				landscape: [],
				surface: surface || '/img/textures/0.svg',
			},
			paths: [],
		}
	}
	static include(db, world) {
		return new CreatingWorld(db, world);
	}
}

module.exports = CreatingWorld;
