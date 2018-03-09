var ClinqTools = require("./clinq-tools")

class ClinqLoader {
    constructor(adapter) {
        this.adapter = adapter
        this.cache = []
        this.fetchContacts = this.fetchContacts.bind(this)
        this.loadPage = this.loadPage.bind(this)
        this.loadList = this.loadList.bind(this)
    }

    async loadPage(page, buffer, client) {
        return client.getContacts(page).then(({contacts, more, next_page}) => {
            if (!next_page) next_page++

            var mapped = client.mapContacts(contacts).concat(buffer)
            if (more) {
                return this.loadPage(next_page, mapped, client)
            } else {
                return mapped
            }
        })
    }

    async loadList(apiKey, apiUrl, client) {
        return this.loadPage(0, [], client)
    }

    async fetchContacts(apiKey, apiUrl) {
        if (Object.keys(this.cache).includes(apiKey)) {
            console.log("Responding from cache: "+ClinqTools.anonymizeKey(apiKey)+" ("+this.cache[apiKey].length+" contacts)")
            return this.cache[apiKey]
        }

        console.log("Preparing empty cache: "+ClinqTools.anonymizeKey(apiKey))
        this.cache[apiKey] = []
        var client = new this.adapter(apiUrl, apiKey);
        return client.login().then(() => {
            this.loadList(apiKey, apiUrl, client).then((apiResponse) => {
                console.log("Filled cache: "+ClinqTools.anonymizeKey(apiKey)+" ("+apiResponse.length+" contacts)")
                this.cache[apiKey] = apiResponse
                return apiResponse
            })
            return []
        }).catch((e) => {
            delete this.cache[apiKey]
            throw(e)
        })
    }
}

module.exports = ClinqLoader
