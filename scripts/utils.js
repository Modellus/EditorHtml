class Utils {
    static mergeProperties(source, target) {
        for (const key in source) {
            if (source[key] instanceof Object) {
                target[key] = target[key] || {};
                Utils.mergeProperties(source[key], target[key]);
            } else
                target[key] = source[key];
        }
    }

    static cloneProperties(properties) {
        return JSON.parse(JSON.stringify(properties));
    }

    static setProperty(name, value, properties) {
        const parts = name.split(".");
        let target = properties;
        for (let index = 0; index < parts.length - 1; index++) {
            target[parts[index]] = target[parts[index]] || {};
            target = target[parts[index]];
        }
        target[parts[parts.length - 1]] = value;
    }
}