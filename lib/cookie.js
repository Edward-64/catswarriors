'use strict'

class Cookie {
	constructor(db) {
		this.db = db;
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
	static include(db) {
		return new Cookie(db);
	}
}

module.exports = Cookie;
