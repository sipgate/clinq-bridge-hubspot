class ClinqTools {
    static anonymizeKey(apiKey) {
        return "********" +apiKey.substr(apiKey.length - 5)
    }
}

module.exports = ClinqTools