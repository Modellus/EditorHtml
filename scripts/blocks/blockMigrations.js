class BlockMigrations {
    static currentVersion = "1.0.0";
    static steps = [];

    static registerMigration(fromVersion, toVersion, migrate) {
        BlockMigrations.steps.push({ fromVersion: fromVersion, toVersion: toVersion, migrate: migrate });
    }

    static getSupportedVersions() {
        const versions = new Set([BlockMigrations.currentVersion]);
        for (const step of BlockMigrations.steps) {
            versions.add(step.fromVersion);
            versions.add(step.toVersion);
        }
        return Array.from(versions);
    }

    static isSupportedVersion(version) {
        return BlockMigrations.getSupportedVersions().includes(version);
    }

    static findStep(version) {
        return BlockMigrations.steps.find(step => step.fromVersion === version) ?? null;
    }

    static migrate(definition) {
        const applied = [];
        if (!definition || typeof definition !== "object")
            return { definition: definition, applied: applied, valid: false };
        let migrated = definition;
        let guard = 0;
        while (migrated.schemaVersion !== BlockMigrations.currentVersion && guard < 32) {
            const step = BlockMigrations.findStep(migrated.schemaVersion);
            if (!step)
                break;
            migrated = step.migrate(BlockMigrations.clone(migrated));
            migrated.schemaVersion = step.toVersion;
            applied.push(`${step.fromVersion}→${step.toVersion}`);
            guard++;
        }
        return { definition: migrated, applied: applied, valid: migrated.schemaVersion === BlockMigrations.currentVersion };
    }

    static clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    static createDefinition(options = {}) {
        return {
            schemaVersion: BlockMigrations.currentVersion,
            id: options.id ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `object-${Date.now()}`),
            type: options.type ?? "object",
            name: options.name ?? "Object",
            preset: options.preset ?? "standard",
            root: options.root ?? { id: "root", type: "group", children: [] },
            parameters: options.parameters ?? [],
            metadata: Object.assign({
                source: options.source ?? "developer",
                createdAt: new Date().toISOString(),
                blocksUsed: [],
                edited: false
            }, options.metadata ?? {})
        };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockMigrations;
