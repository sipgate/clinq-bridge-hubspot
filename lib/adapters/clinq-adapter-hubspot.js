const Hubspot = require('hubspot')
const ClinqPhonenumber = require('../clinq-phonenumber')

class HubspotAdapter {
    constructor(apiUrl, apiKey) {
        this.apiClient = new Hubspot({ apiKey: apiKey })
        this.getContacts = this.getContacts.bind(this)
        this.mapContacts = this.mapContacts.bind(this)
    }

    login() {
        return new Promise((resolve, reject) => {
            resolve()
            /*return this.apiClient.api("branding/view", {}).then((data) => {
                if (data.success == 1) {
                    resolve()
                } else {
                    reject(new Error(401))
                }
            })*/
        })
    }

    getContacts(page) {
        var options = {
            count:100,
            property:["phone", "mobilephone", "firstname", "lastname"],
            vidOffset:page}
        return this.apiClient.contacts.get(options).then((data) => {
            return {"contacts":data.contacts, "more":data["has-more"], "next_page":data["vid-offset"]}
        })
    }

    mapContacts(input) {
        var data =[];
        input.forEach(contact => {
            if (typeof contact.properties.firstname !=="undefined" &&
                typeof contact.properties.lastname !=="undefined") {
                var mapped = {
                    "name":contact.properties.firstname.value+" "+contact.properties.lastname.value
                }
                mapped.phoneNumbers=[]
                if (typeof contact.properties.phone!=="undefined") {
                    var landline = new ClinqPhonenumber(contact.properties.phone.value)
                    mapped.phoneNumbers.push({"label":"Landline", "phoneNumber":landline.e123Number()})
                }
                if (typeof contact.properties.mobilephone!=="undefined") {
                    var mobile = new ClinqPhonenumber(contact.properties.mobilephone.value)
                    mapped.phoneNumbers.push({"label":"Mobile", "phoneNumber":mobile.e123Number()})
                }
                if (mapped.phoneNumbers.length > 0) data.push(mapped)
            }
        })
        return data
    }
}

module.exports = HubspotAdapter