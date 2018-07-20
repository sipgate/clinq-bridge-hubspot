class ClinqPhonenumber {
	constructor(number) {
		if (!number.match(/[0-9]/)) throw new Error("Not a valid phone number");
		var p = number.replace(/[^0-9\+]/gi, "");
		p = p.replace(/^00/, "");
		p = p.replace(/^\+/, "");
		p = p.replace(/^0/, "49");
		this.e164Number = p;
	}

	e164Number() {
		return this.e164Number;
	}

	e123Number() {
		return "+" + this.e164Number;
	}
}

module.exports = ClinqPhonenumber;
