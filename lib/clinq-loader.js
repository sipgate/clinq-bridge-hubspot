const ClinqTools = require("./clinq-tools");

class ClinqLoader {
	constructor(adapter) {
		this.adapter = adapter;
		this.cache = [];
		this.fetchContacts = this.fetchContacts.bind(this);
		this.loadPage = this.loadPage.bind(this);
		this.loadList = this.loadList.bind(this);
		this.populateCache = this.populateCache.bind(this);
	}

	async loadPage(page, buffer, client) {
		const { contacts, more, nextPage } = await client.getContacts(page);

		if (!nextPage) {
			nextPage++;
		}

		const mapped = client.mapContacts(contacts).concat(buffer);
		if (more) {
			return this.loadPage(nextPage, mapped, client);
		} else {
			return mapped;
		}
	}

	loadList(client) {
		return this.loadPage(0, [], client);
	}

	async populateCache(client, apiKey) {
		if (!this.cache[apiKey]) {
			this.cache[apiKey] = {
				loaded: true,
				list: []
			};
		}
		const cacheEntry = this.cache[apiKey];
		if (!cacheEntry || !cacheEntry.loaded) {
			return;
		}

		try {
			cacheEntry.loaded = false;

			const list = await this.loadList(client);

			console.log(`Filled cache: ${ClinqTools.anonymizeKey(apiKey)} (${list.length} contacts)`);

			this.cache[apiKey] = {
				loaded: true,
				list
			};
		} catch (error) {
			console.error(error);
			delete this.cache[apiKey];
		}
	}

	async fetchContacts(apiKey, apiUrl) {
		const client = new this.adapter(apiUrl, apiKey);

		// TODO: check login

		const anonKey = ClinqTools.anonymizeKey(apiKey);

		if (Object.keys(this.cache).includes(apiKey)) {
			console.log(`Responding from cache: ${anonKey} (${this.cache[apiKey].list.length} contacts)`);
			this.populateCache(client, apiKey);
			return this.cache[apiKey].list;
		}

		console.log(`Preparing empty cache: ${anonKey}`);

		this.populateCache(client, apiKey);
		return [];
	}
}

module.exports = ClinqLoader;
