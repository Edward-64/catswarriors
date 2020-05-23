class Test {
	constructor(db) {
		this.db = db;
	}
	static include(db) {
		return new Test(db);
	}
}

module.exports = Test;
