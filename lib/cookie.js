'use strict'
const MAP_OF_TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	L_MAP = MAP_OF_TOKEN.length,
	validator = require('./validators.js');

class Cookie {
	constructor(db) {
		this.db = db;
	}

	generateCookie() {
      	let key = 'cwGame-';
      	for(let i = 0; i < 32; i++) {
            	let index = Math.floor(Math.random() * L_MAP);
           		key += MAP_OF_TOKEN[index];
     		}
	      const lastCat = this.db.info.totalCats;
	      for(let i = 1; i <= lastCat; i++) if (this.db.cats[i].cookie === key) return generateCookie();
	      return key;
	}

	parseCookie(rawCookie) {
		try {
			if (!rawCookie) return -1;
		      const cookie = {
		            auth: undefined,
		            alias: undefined,
		      };
		      cookie.auth = rawCookie.match(/auth=([\w\d\-\?]{39})/);
		      cookie.alias = rawCookie.match(/alias=.*/);
		      if (cookie.auth) cookie.auth = cookie.auth[0].replace(/auth=/, '');
		     	if (cookie.alias) cookie.alias = cookie.alias[0].replace(/alias=/, '');
		      return cookie;
		} catch (err) {
			validator.log(err);
		}
	}
	existingCookie(rawCookie, rawData) {
		try {
	      if (!rawCookie) return 0;
	      const {auth, alias} = this.parseCookie(rawCookie);
	      let i = 1, lastCat = this.db.info.totalCats;

	      if (auth && alias) {
	            for(; i <= lastCat; i++) {
	                  if (this.db.cats[i].cookie === auth) break;
	            }
	            if (i !== ++lastCat) return i; //Существует
	      }
	      if (auth && !alias) {
	            i = 1;
	            for(; i <= lastCat; i++) {
	                  if (this.db.cats[i].cookie === auth) break;
	            }
	            if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	      }
	      if (!auth && rawData) {
	            i = 1;
	            for(; i <= lastCat; i++) {
				if (this.db.cats[i].alias === rawData.alias && this.db.cats[i].password === rawData.password);
	            }
	            if (i !== ++lastCat) return -i; //Существует, но не авторизирован
	      }
	      return 0; //Не существует
		} catch (err) {
			validator.log(err);
		}
	}

	setCookie(rawData, res, onlyset) {
		try {
	      	const {alias, password} = rawData;
	      	let lastCat = this.db.info.totalCats, i = 1;
	      	for (; i <= lastCat; i++) {
	      	      if (password === this.db.cats[i].password && alias === this.db.cats[i].alias) break;
	      	}
	      	if (i !== ++lastCat) {
				const expires = new Date(Date.UTC(new Date().getFullYear() + 5, 0, 0, 0, 0, 0)).toUTCString();
				res.setHeader('set-cookie', [`auth=${this.db.cats[i].cookie};expires=${expires};httponly=true`,
				`alias=${encodeURI(this.db.cats[i].alias)};expires=${expires};httponly=true`]);
	            	if (!onlyset) {
		            	res.setHeader('content-type', 'application/json;charset=utf-8');
					res.end(JSON.stringify({res: 1}));
				}
	      	} else if (!onlyset) {
	            	res.setHeader('content-type', 'application/json;charset=utf-8');
	            	res.end(JSON.stringify({res: 0}));
	      	}
		} catch (err) {
			validator.log(err);
		}
	}

	deleteCookie(res, onlydel) {
		res.setHeader('set-cookie', ['alias=;max-age=0', 'timealias=;max-age=0']);
		if (!onlydel) res.end();
	}

	static include(db) {
		return new Cookie(db);
	}
}

module.exports = Cookie;
