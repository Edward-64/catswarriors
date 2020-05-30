const fs = require('fs');
const dbclear = {
      info: {
            totalCats: 1,
      },
      cats: {
	      1: {
      	          catName: 'Рыболов',
		  role: 'useradmincreater',
            	  password: 'mikimiki99',
        	  gender: 1,
         	  alias: 'Котик Эдварда',
                  devices: [],
                  cookie: 'cwGame-specialCookieOfAdmin????????????',
                  dateOfReg: Date.now(),
                  lastVisitOfSite: Date.now(),
                  infractions: {},
		  servInfractions: [],
                  game: {
			public: {
				  pn: 1;
	        	          health: 100,
				  moons: 0,
				  speed: 50,
	                          lastPlace: [1, 30, 10, 1],
				  size: 1,
	                          status: 'unactiv',
				  last: Date.now(),
			}
                      }
		},
      },
}
fs.writeFile('./databases/cats.js', JSON.stringify(dbclear), (err) => { console.log(err); });

