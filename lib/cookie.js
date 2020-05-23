'use strict'
const MAP_OF_TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	L_MAP = MAP_OF_TOKEN.length;

class Cookie {
	constructor(db) {
		this.db = db;
	}

	generateCookie () {
      	let key = 'cwGame-';
      	for(let i = 0; i < 32; i++) {
            	let index = Math.floor(Math.random() * L_MAP);
           		key += MAP_OF_TOKEN[index];
     		}
	      const lastCat = this.db.info.totalCats;
	      for(let i = 1; i <= lastCat; i++) if (this.db[i].cookie === key) return generateCookie();
	      return key;
	}

	parseCookie(rawCookie) {
	      const cookie = {
	            auth: undefined,
	            alias: undefined,
	      };
	      cookie.auth = rawCookie.match(/auth=([\w\d\-]{39})/);
	      cookie.alias = rawCookie.match(/alias=.*/);
	      if (cookie.auth) cookie.auth = cookie.auth[0].replace(/auth=/, '');
	     	if (cookie.alias) cookie.alias = cookie.alias[0].replace(/alias=/, '');
	      return cookie;

	}
	existingCookie(rawCookie, rawData) {
	      const {auth, alias} = this.parseCookie(rawCookie);
	      let i = 1, lastCat = this.db.info.totalCats;

	      if (auth && alias) {
	            for(; i <= lastCat; i++) {
	                  if (this.db[i].cookie === auth) break;
	            }
	            if (i !== ++lastCat) return i; //Существует
	      }
	      if (auth && !alias) {
	            i = 1;
	            for(; i <= lastCat; i++) {
	                  if (this.db[i].cookie === auth) break;
	            }
	            if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	      }
	      if (!auth && rawData) {
	            i = 1;
	            for(; i <= lastCat; i++) {
				if (this.db[i].alias === rawData.alias && this.db[i].password === rawData.password);
	            }
	            if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	      }
	      return 0; //Не существует
	}

	setCookie(rawData, res) {
      	const {alias, password} = rawData;
      	let lastCat = this.db.info.totalCats, i = 1;
      	for (; i <= lastCat; i++) {
      	      if (password === this.db[i].password && alias === this.db[i].alias) break;
      	}
      	if (i !== ++lastCat) {
            	res.setHeader('content-type', 'application/json;charset=utf-8');
            	res.end(JSON.stringify({res: 1, token: this.db[i].cookie}));
      	} else {
            	res.setHeader('content-type', 'application/json;charset=utf-8');
            	res.end(JSON.stringify({res: 0}));
      	}
	}


	static include(db) {
		return new Cookie(db);
	}
}

module.exports = Cookie;
