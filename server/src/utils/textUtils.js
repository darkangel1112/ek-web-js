/**
 * Cleans text with Hungarian character issues often found in PDF extractions.
 * @param {string} text 
 * @returns {string}
 */
const cleanText = (text) => {
    if (!text) return "";

    const replacements = {
        'È': 'é', 'Û': 'ő', '·': 'á', 'ı': 'í', 'Ì': 'í', '¸': 'ü', 'ˆ': 'ö',
        '†': '', '£': 'Á', 'ÈrintÈs': 'érintés', 'k·r': 'kár', 'ter¸let': 'terület',
        'sorsz·ma': 'sorszáma', 'tÌpusa': 'típusa', 'idıpontja': 'időpontja',
        'alkalmaz·sa': 'alkalmazása', 'kÈszÌtmÈny': 'készítmény',
        'megnevezÈse': 'megnevezése', 'Kasz·l·s': 'Kaszálás', 'M·sodvetÈs': 'Másodvetés',
        'Agrotechnika': 'Agrotechnika', 'gyepesÌtÈssel': 'gyepesítéssel',
        'Sorkˆztakar·s': 'Sorköztakarás', 'KondÌcion·lÛ': 'Kondicionáló',
        'NitrogÈnmegkˆtı': 'Nitrogénmegkötő', 'kÈszÌtmÈnyek': 'készítmények',
        'sz·rsÈrtı': 'szársértő', 'nÈlk¸li': 'nélküli', 'haszn·lat·val': 'használatával',
        'altern·lÛ': 'alternáló', 'tervezett': 'tervezett', 'vetÈsi': 'vetési',
        'hasznosÌt·si': 'hasznosítási', 'form·ja': 'formája', 'jelentısÈg˚': 'jelentőségű',
        '÷kolÛgiai': 'Ökológiai', 'laz·s': 'lazítás', 'KˆzÈpmÈly': 'Középmély',
        'lazÌt·s': 'lazítás', 'MellÈktermÈk': 'Melléktermék',
        'visszaforgatasa': 'visszaforgatása', 'Ist·llÛtr·gya': 'Istállótrágya',
        'kijuttat·sa': 'kijuttatása'
    };

    let cleaned = text;
    for (const [oldChar, newChar] of Object.entries(replacements)) {
        cleaned = cleaned.split(oldChar).join(newChar);
    }
    return cleaned;
};

module.exports = { cleanText };
