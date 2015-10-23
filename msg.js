function Msg(proto, data, realm) {
	this.proto = proto;
	this.data = data;
	this.realm = realm;
}

Msg.prototype.prep = function() {
	return JSON.stringify({
		'proto': this.proto,
		'data': this.data,
		'realm': this.realm
	});
};