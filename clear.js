const MAP_OF_TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	L_MAP = MAP_OF_TOKEN.length,
	fs = require('fs');

function generateCookie () {
      let key = 'cwGame-';
      for(let i = 0; i < 32; i++) {
            let index = Math.floor(Math.random() * L_MAP);
            key += MAP_OF_TOKEN[index];
      }
      return key;
}


const dbclear = {
      info: {
            totalCats: 1,
            admins: [1],
      },
      1: {
                  catName: 'Рыболов',
                  password: 'MIKIcatsKatya36',
                  gender: 1,
                  alias: 'Котик Эдварда',
                  devices: [],
                  cookie: generateCookie(),
                  dateOfReg: Date.now(),
                  lastVisitOfSite: Date.now(),
                  infractions: {},
                  game: {
                                    health: 100,
				    moons: 0,
				    speed: 50,
                                    lastPlace: [0, 30, 10, 1],
                                    status: 'unactiv',
                  }
      },
}
fs.writeFile('./databases/cats.js', 'module.exports = ' + JSON.stringify(dbclear), (err) => { console.log(err); });

