const ClinqTools = require("./clinq-tools");

const CACHE_LIFETIME_MS = 60 * 60 * 1000;

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
		const anonKey = ClinqTools.anonymizeKey(apiKey);

		if (!this.cache[apiKey]) {
			this.cache[apiKey] = {
				loaded: true,
				list: [],
				timestamp: 0
			};
		}

		const cacheEntry = this.cache[apiKey];

		const isCacheValid = Date.now() - cacheEntry.timestamp < CACHE_LIFETIME_MS;

		if (isCacheValid) {
			console.log(`Cache is still valid for ${anonKey} (${cacheEntry.list.length} contacts)`);
			return;
		}

		if (!cacheEntry.loaded) {
			console.log(`Contacts already loading for ${anonKey} (currently ${cacheEntry.list.length} contacts)`);
			return;
		}

		cacheEntry.loaded = false;

		try {

			const list = await this.loadList(client);

			console.log(`Filled cache for ${anonKey} (${list.length} contacts)`);

			this.cache[apiKey] = {
				loaded: true,
				timestamp: Date.now(),
				list
			};
		} catch (error) {
			console.error(error.message);
			delete this.cache[apiKey];
		}
	}

	async fetchContacts(apiKey, apiUrl) {
		const client = new this.adapter(apiUrl, apiKey);

		// TODO: check login

		const anonKey = ClinqTools.anonymizeKey(apiKey);

		if (Object.keys(this.cache).includes(apiKey)) {
			console.log(`Responding from cache for ${anonKey} (${this.cache[apiKey].list.length} contacts)`);
			this.populateCache(client, apiKey);
			return this.cache[apiKey].list;
		}

		console.log(`Preparing empty cache for ${anonKey}`);

		this.populateCache(client, apiKey);
		return [];
	}
}

module.exports = ClinqLoader;
