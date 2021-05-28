export class BotUtilities {
    static generateUUID() {
        let i = 0;
        let generatedUUID = "";
        let baseString = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        while (i++ < 38) {
            let c = baseString[i - 1], r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            generatedUUID += (c == '-' || c == '4') ? c : v.toString(16)
        }

        return generatedUUID;
    }
}