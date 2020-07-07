function cacheControl(req, res, path) {
	req = req.headers['if-none-match'];
	cnfg = {
		['/css/img/']: {
			include: true,
			etag: '0.0.1',
			age: 604800
		},
		['/css/']: {
			include: true,
			etag: '0.0.1',
			age: 86400
		},
//		['/']: {
//			include: true,
//			etag: '0.0.1',
//			age: 604800
//		},
		['/js/handlerRequires.js']: {
			include: true,
			etag: '0.0.1',
			age: 86400
		},
		['/js/play.js']: {
			include: true,
			etag: '0.0.2',
			age: 86400
		},
		['/js/']: {
			include: true,
			etag: '0.0.1',
			age: 86400
		},
		['/img/']: {
			include: true,
			etag: '0.0.1',
			age: 604800
		}
	}
	if (!cnfg[path]) {
		path = path.startsWith('/js/') ? '/js/' : path;
		path = path.startsWith('/css/img/') ? '/css/img/' : path.startsWith('/css/') ? '/css/' : path;
		path = path.startsWith('/img/') ? '/img/' : path;
	}
	if (cnfg[path] && cnfg[path].include) {
		if (req === cnfg[path].etag) {
			res.statusCode = 304;
			res.end();
			return true;
		} else {
			res.setHeader('cache-control', `public, max-age=${cnfg[path].age}`);
			res.setHeader('etag', cnfg[path].etag);
			return false;
		}
	} else {
		res.setHeader('cache-control', 'no-cache, no-store');
		return false;
	}
}

module.exports = cacheControl;
