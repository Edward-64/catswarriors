'use strict'
const MAP_OF_TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	L_MAP = MAP_OF_TOKEN.length;

class Cookie {
	constructor(db, validator) {
		this.db = db;
		this.validator = validator;
	}

	generateCookie() {
      	let key = 'cwGame-';
      	for(let i = 0; i < 32; i++) {
            	let index = Math.floor(Math.random() * L_MAP);
           		key += MAP_OF_TOKEN[index];
     		}
	      for(let i = 1; i < this.db.totalCats; i++) if (this.db.cats[i].cookie === key) return generateCookie();
	      return key;
	}

	parseCookie(rawCookie) {
		try {
			if (!rawCookie) return -1;
		      const cookie = {
		            auth: null,
		            alias: null,
		      };
		      cookie.auth = rawCookie.match(/auth=([\w\d\-\?]{39})/);
		      cookie.alias = rawCookie.match(/alias=.*/);
		      if (cookie.auth) cookie.auth = cookie.auth[0].replace(/auth=/, '');
		     	if (cookie.alias) cookie.alias = cookie.alias[0].replace(/alias=/, '');
		      return cookie;
		} catch (err) {
			this.validator.log(err);
		}
	}
	existingCookie(rawCookie, rawData) {
		try {
		      if (!rawCookie) return 0;
		      const {auth, alias} = this.parseCookie(rawCookie);

		      if (auth && alias) {
		            for(let i = 1; i <= this.db.totalCats; i++) {
					if (this.db.cats[i].cookie === auth) return i; //Существует
		            }
		      }
		      if (auth && !alias) {
		            for(let i = 1; i <= this.db.totalCats; i++) {
		                  if (this.db.cats[i].cookie === auth) return -i; //Существует, но не авторизирован
		            }
		      }
		      if (!auth && rawData) {
		            for(let i = 1; i <= this.db.totalCats; i++) {
					if (this.db.cats[i].alias === rawData.alias && this.db.cats[i].password === rawData.password) return -i;;
		            }
		      }
		      return 0;
		} catch (err) {
			this.validator.log(err); return 0;
		}
	}

	setCookie(rawData, res, onlyset) {
		try {
	      	const {alias, password} = rawData;

	      	for (let i = 1; i <= this.db.totalCats; i++) {
	      	      if (password === this.db.cats[i].password && alias === this.db.cats[i].alias) {
					const expires = new Date(Date.UTC(new Date().getFullYear() + 5, 0, 0, 0, 0, 0)).toUTCString();
					res.setHeader('set-cookie', [`auth=${this.db.cats[i].cookie};expires=${expires};httponly=true;SameSite`,
					`alias=${encodeURI(this.db.cats[i].alias)};expires=${expires};httponly=true;SameSite`]);
		            	if (!onlyset) {
			            	res.setHeader('content-type', 'application/json;charset=utf-8');
						res.end(JSON.stringify({res: 1}));
					}
					return;
		      	}
	      	}
	      	if (!onlyset) {
	            	res.setHeader('content-type', 'application/json;charset=utf-8');
	            	res.end(JSON.stringify({res: 0}));
	      	}
		} catch (err) {
			this.validator.log(err);
		}
	}

	deleteCookie(res, onlydel) {
		res.setHeader('set-cookie', ['alias=;max-age=0', 'timealias=;max-age=0']);
		if (!onlydel) res.end();
	}

	static include(db, validator) {
		return new Cookie(db, validator);
	}
}

module.exports = Cookie;
