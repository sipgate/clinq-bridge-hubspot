class ClinqPhonenumber {
	constructor(raw) {
		if (!raw.match(/[0-9]/)) throw new Error("Not a valid phone number");
		var phoneNumber = raw.replace(/[^0-9\+]/gi, "");
		phoneNumber = phoneNumber.replace(/^00/, "");
		phoneNumber = phoneNumber.replace(/^\+/, "");
		phoneNumber = phoneNumber.replace(/^0/, "49");
		this.e164Number = phoneNumber;
	}

	e164Number() {
		return this.e164Number;
	}

	e123Number() {
		return "+" + this.e164Number;
	}
}

module.exports = ClinqPhonenumber;
