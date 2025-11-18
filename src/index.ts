/**
 *
 * Blooby - A modern database solution for Next.js
 *  
 * @author SpeX
 * 
**/

// Library Imports
import { version } from '../package.json';
import * as Utils from './utils';
import * as Bob from './types';
import * as Encryption from './features/encryption';
import * as fs from 'fs';

// ============================================================================
// BLOOBY DATABASE CLASS
// ============================================================================

/**
 * Main Blooby Database Class
 */
export class Blooby {
    private config: Bob.BloobyConfig;
    private databases: Map<string, DatabaseInstance> = new Map();

    constructor(config?: Partial<Bob.BloobyConfig>) {
        this.config = {
            storagePath: config?.storagePath || './blooby_data',
            debug: config?.debug || false,
            defaultChunkSize: config?.defaultChunkSize || 1024 * 1024
        };

        Utils.initalizePath(this.config.storagePath);
        Utils.logger.success(`Blooby v${version} initialized`);

        if (this.config.debug) {
            Utils.logger.debug(`Storage path: ${this.config.storagePath}`);
        }
    }

    // ========================================================================
    // DATABASE MANAGEMENT
    // ========================================================================

    /**
     * Creates a new database
     * @param fileName - Database filename (without .bob extension)
     * @param encryptionKey - Master encryption key
     * @param options - Database options
     */
    public createDatabase(
        fileName: string,
        encryptionKey: string,
        options?: { compression?: boolean; chunkSize?: number }
    ): DatabaseInstance {
        const dbPath = Utils.resolveDatabasePath(this.config.storagePath, fileName);

        // Validate
        if (fs.existsSync(dbPath)) {
            throw Utils.createError('DATABASE_ALREADY_EXISTS', `Database '${fileName}' already exists`);
        }

        const validation = Encryption.validateEncryptionKey(encryptionKey);
        if (!validation.valid) {
            throw Utils.createError('INVALID_ENCRYPTION_KEY', validation.errors.join(', '));
        }

        // Create database structure
        const database: Bob.BloobyDatabase = {
            filename: fileName,
            compression: options?.compression || false,
            collections: {},
            _meta: {
                createdAt: new Date(),
                modifiedAt: new Date(),
                magicNumber: 'BLOOBYDB',
                chunkSize: options?.chunkSize || this.config.defaultChunkSize || 1024 * 1024,
                version: 1
            }
        };

        // Save to disk (encrypted)
        this.saveDatabase(database, encryptionKey);

        // Create instance
        const instance = new DatabaseInstance(database, encryptionKey, dbPath, this.config);
        this.databases.set(fileName, instance);

        Utils.logger.success(`Database '${fileName}' created successfully`);
        return instance;
    }

    /**
     * Opens an existing database
     * @param fileName - Database filename (without .bob extension)
     * @param encryptionKey - Master encryption key
     */
    public openDatabase(fileName: string, encryptionKey: string): DatabaseInstance {
        const dbPath = Utils.resolveDatabasePath(this.config.storagePath, fileName);

        if (!fs.existsSync(dbPath)) {
            throw Utils.createError('DATABASE_NOT_FOUND', `Database '${fileName}' not found`);
        }

        // Check if already open
        if (this.databases.has(fileName)) {
            Utils.logger.warn(`Database '${fileName}' is already open`);
            return this.databases.get(fileName)!;
        }

        // Load and decrypt
        const database = this.loadDatabase(dbPath, encryptionKey);

        // Verify magic number
        if (database._meta.magicNumber !== 'BLOOBYDB') {
            throw Utils.createError('INVALID_DATABASE', 'Invalid database file or wrong encryption key');
        }

        // Create instance
        const instance = new DatabaseInstance(database, encryptionKey, dbPath, this.config);
        this.databases.set(fileName, instance);

        Utils.logger.success(`Database '${fileName}' opened successfully`);
        return instance;
    }

    /**
     * Closes a database
     * @param fileName - Database filename
     */
    public closeDatabase(fileName: string): void {
        const instance = this.databases.get(fileName);
        if (!instance) {
            throw Utils.createError('DATABASE_NOT_FOUND', `Database '${fileName}' is not open`);
        }

        instance.close();
        this.databases.delete(fileName);
        Utils.logger.info(`Database '${fileName}' closed`);
    }

    /**
     * Deletes a database file
     * @param fileName - Database filename
     */
    public deleteDatabase(fileName: string): void {
        const dbPath = Utils.resolveDatabasePath(this.config.storagePath, fileName);

        if (!fs.existsSync(dbPath)) {
            throw Utils.createError('DATABASE_NOT_FOUND', `Database '${fileName}' not found`);
        }

        // Close if open
        if (this.databases.has(fileName)) {
            this.closeDatabase(fileName);
        }

        fs.unlinkSync(dbPath);
        Utils.logger.success(`Database '${fileName}' deleted successfully`);
    }

    /**
     * Checks if a database exists
     * @param fileName - Database filename
     */
    public databaseExists(fileName: string): boolean {
        const dbPath = Utils.resolveDatabasePath(this.config.storagePath, fileName);
        return fs.existsSync(dbPath);
    }

    /**
     * Lists all database files
     */
    public listDatabases(): string[] {
        if (!fs.existsSync(this.config.storagePath)) {
            return [];
        }

        return fs.readdirSync(this.config.storagePath)
            .filter(file => file.endsWith('.bob'))
            .map(file => file.replace('.bob', ''));
    }

    // ========================================================================
    // INTERNAL METHODS
    // ========================================================================

    /**
     * Saves database to disk (encrypted)
     */
    private saveDatabase(database: Bob.BloobyDatabase, encryptionKey: string): void {
        const dbPath = Utils.resolveDatabasePath(this.config.storagePath, database.filename);

        // Serialize
        const serialized = Buffer.from(JSON.stringify(database), 'utf-8');

        // Encrypt
        const encrypted = Encryption.encryptAuto(serialized, encryptionKey, database._meta.chunkSize);

        // Write to file
        fs.writeFileSync(dbPath, encrypted);
    }

    /**
     * Loads database from disk (encrypted)
     */
    private loadDatabase(dbPath: string, encryptionKey: string): Bob.BloobyDatabase {
        // Read file
        const encrypted = fs.readFileSync(dbPath);

        // Decrypt
        const decrypted = Encryption.decryptAuto(encrypted, encryptionKey);

        // Deserialize
        const database = JSON.parse(decrypted.toString('utf-8')) as Bob.BloobyDatabase;

        // Parse dates (JSON.parse converts dates to strings)
        database._meta.createdAt = new Date(database._meta.createdAt);
        database._meta.modifiedAt = new Date(database._meta.modifiedAt);

        return database;
    }

    /**
     * Get version
     */
    public getVersion(): string {
        return `v${version}`;
    }
}

// ============================================================================
// DATABASE INSTANCE CLASS
// ============================================================================

/**
 * Database Instance - Represents an open database
 */
export class DatabaseInstance {
    private database: Bob.BloobyDatabase;
    private encryptionKey: string;
    private dbPath: string;
    private config: Bob.BloobyConfig;
    private autoSaveEnabled: boolean = true;

    constructor(
        database: Bob.BloobyDatabase,
        encryptionKey: string,
        dbPath: string,
        config: Bob.BloobyConfig
    ) {
        this.database = database;
        this.encryptionKey = encryptionKey;
        this.dbPath = dbPath;
        this.config = config;
    }

    // ========================================================================
    // COLLECTION OPERATIONS
    // ========================================================================

    /**
     * Creates a new collection
     * @param name - Collection name
     * @param schema - Optional schema for validation
     */
    public createCollection(name: string, schema?: Bob.Schema): Bob.Collection {
        if (this.database.collections[name]) {
            throw Utils.createError('COLLECTION_ALREADY_EXISTS', `Collection '${name}' already exists`);
        }

        const collection: Bob.Collection = {
            name,
            documents: {},
            indexes: [],
            _meta: {
                createdAt: new Date(),
                modifiedAt: new Date(),
                documentCount: 0,
                schema,
                autoIncrementId: 0
            }
        };

        this.database.collections[name] = collection;
        this.save();

        Utils.logger.success(`Collection '${name}' created`);
        return collection;
    }

    /**
     * Gets a collection
     * @param name - Collection name
     */
    public getCollection(name: string): Bob.Collection {
        const collection = this.database.collections[name];
        if (!collection) {
            throw Utils.createError('COLLECTION_NOT_FOUND', `Collection '${name}' not found`);
        }
        return collection;
    }

    /**
     * Deletes a collection
     * @param name - Collection name
     */
    public deleteCollection(name: string): void {
        if (!this.database.collections[name]) {
            throw Utils.createError('COLLECTION_NOT_FOUND', `Collection '${name}' not found`);
        }

        delete this.database.collections[name];
        this.save();

        Utils.logger.success(`Collection '${name}' deleted`);
    }

    /**
     * Lists all collections
     */
    public listCollections(): string[] {
        return Object.keys(this.database.collections);
    }

    /**
     * Checks if collection exists
     * @param name - Collection name
     */
    public collectionExists(name: string): boolean {
        return !!this.database.collections[name];
    }

    // ========================================================================
    // DOCUMENT OPERATIONS (CRUD)
    // ========================================================================

    /**
     * Inserts a document into a collection
     * @param collectionName - Collection name
     * @param data - Document data
     * @param customId - Optional custom ID
     */
    public insert<T = any>(
        collectionName: string,
        data: T,
        customId?: string
    ): Bob.InsertResult<T> {
        const collection = this.getCollection(collectionName);

        // Generate ID
        const _id = customId || Utils.generateShortId();

        // Check for duplicate ID
        if (collection.documents[_id]) {
            throw Utils.createError('DUPLICATE_ID', `Document with ID '${_id}' already exists`);
        }

        // Validate against schema if exists
        if (collection._meta.schema) {
            // TODO: Implement schema validation
        }

        // Create document
        const document: Bob.Document<T> = {
            _id,
            data,
            _meta: {
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            }
        };

        // Insert
        collection.documents[_id] = document;
        collection._meta.documentCount++;
        collection._meta.modifiedAt = new Date();

        this.save();

        return {
            success: true,
            data: [data],
            insertedIds: [_id],
            insertedCount: 1
        };
    }

    /**
     * Inserts multiple documents
     * @param collectionName - Collection name
     * @param dataArray - Array of documents
     */
    public insertMany<T = any>(
        collectionName: string,
        dataArray: T[]
    ): Bob.InsertResult<T> {
        const collection = this.getCollection(collectionName);
        const insertedIds: string[] = [];
        const insertedData: T[] = [];

        for (const data of dataArray) {
            const _id = Utils.generateShortId();

            const document: Bob.Document<T> = {
                _id,
                data,
                _meta: {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    version: 1
                }
            };

            collection.documents[_id] = document;
            insertedIds.push(_id);
            insertedData.push(data);
        }

        collection._meta.documentCount += dataArray.length;
        collection._meta.modifiedAt = new Date();

        this.save();

        return {
            success: true,
            data: insertedData,
            insertedIds,
            insertedCount: dataArray.length
        };
    }

    /**
     * Finds documents in a collection
     * @param collectionName - Collection name
     * @param query - Query conditions
     */
    public find<T = any>(
        collectionName: string,
        query?: Bob.FindQuery<T>
    ): Bob.FindResult<T> {
        const collection = this.getCollection(collectionName);
        let documents = Object.values(collection.documents) as Bob.Document<T>[];

        // Filter by query
        if (query?.where) {
            documents = documents.filter(doc => this.matchesQuery(doc.data, query.where!));
        }

        // Filter deleted documents
        if (!query?.options?.includeDeleted) {
            documents = documents.filter(doc => !doc._meta.deleted);
        }

        const totalCount = documents.length;

        // Sort
        if (query?.options?.sort) {
            documents = this.sortDocuments(documents, query.options.sort);
        }

        // Pagination
        const skip = query?.options?.skip || 0;
        const limit = query?.options?.limit;

        if (skip > 0) {
            documents = documents.slice(skip);
        }

        if (limit) {
            documents = documents.slice(0, limit);
        }

        // Projection
        let results: any[] = documents.map(doc => ({
            _id: doc._id,
            ...doc.data
        }));

        if (query?.options?.projection) {
            results = this.applyProjection(results, query.options.projection);
        }

        return {
            success: true,
            data: results,
            totalCount,
            hasMore: skip + documents.length < totalCount
        };
    }

    /**
     * Finds a single document
     * @param collectionName - Collection name
     * @param query - Query conditions
     */
    public findOne<T = any>(
        collectionName: string,
        query?: Bob.FindQuery<T>
    ): T | null {
        const result = this.find<T>(collectionName, {
            ...query,
            options: { ...query?.options, limit: 1 }
        });

        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    /**
     * Finds a document by ID
     * @param collectionName - Collection name
     * @param id - Document ID
     */
    public findById<T = any>(collectionName: string, id: string): T | null {
        const collection = this.getCollection(collectionName);
        const document = collection.documents[id] as Bob.Document<T> | undefined;

        if (!document || document._meta.deleted) {
            return null;
        }

        return { _id: document._id, ...document.data } as T;
    }

    /**
     * Updates documents in a collection
     * @param collectionName - Collection name
     * @param where - Query to find documents
     * @param data - Update data
     * @param options - Update options
     */
    public update<T = any>(
        collectionName: string,
        where: Bob.QueryCondition<T>,
        data: Partial<T> | Bob.UpdateModifiers<T>,
        options?: Bob.UpdateOptions
    ): Bob.UpdateResult {
        const collection = this.getCollection(collectionName);
        let documents = Object.values(collection.documents) as Bob.Document<T>[];

        // Filter matching documents
        documents = documents.filter(doc =>
            !doc._meta.deleted && this.matchesQuery(doc.data, where)
        );

        let modifiedCount = 0;

        for (const document of documents) {
            this.applyUpdate(document, data);
            document._meta.updatedAt = new Date();
            document._meta.version++;
            modifiedCount++;

            if (!options?.multi) {
                break; // Update only first match
            }
        }

        if (modifiedCount > 0) {
            collection._meta.modifiedAt = new Date();
            this.save();
        }

        return {
            success: true,
            matchedCount: documents.length,
            modifiedCount
        };
    }

    /**
     * Updates a document by ID
     * @param collectionName - Collection name
     * @param id - Document ID
     * @param data - Update data
     */
    public updateById<T = any>(
        collectionName: string,
        id: string,
        data: Partial<T>
    ): Bob.UpdateResult {
        const collection = this.getCollection(collectionName);
        const document = collection.documents[id] as Bob.Document<T> | undefined;

        if (!document || document._meta.deleted) {
            return {
                success: false,
                error: 'Document not found',
                matchedCount: 0,
                modifiedCount: 0
            };
        }

        Object.assign(document.data as object, data);
        document._meta.updatedAt = new Date();
        document._meta.version++;

        collection._meta.modifiedAt = new Date();
        this.save();

        return {
            success: true,
            matchedCount: 1,
            modifiedCount: 1
        };
    }

    /**
     * Deletes documents from a collection
     * @param collectionName - Collection name
     * @param where - Query to find documents
     * @param options - Delete options
     */
    public delete<T = any>(
        collectionName: string,
        where: Bob.QueryCondition<T>,
        options?: Bob.DeleteOptions
    ): Bob.DeleteResult {
        const collection = this.getCollection(collectionName);
        let documents = Object.values(collection.documents) as Bob.Document<T>[];

        // Filter matching documents
        documents = documents.filter(doc =>
            !doc._meta.deleted && this.matchesQuery(doc.data, where)
        );

        let deletedCount = 0;

        for (const document of documents) {
            if (options?.hard) {
                // Hard delete - remove from collection
                delete collection.documents[document._id];
                collection._meta.documentCount--;
            } else {
                // Soft delete - mark as deleted
                document._meta.deleted = true;
                document._meta.updatedAt = new Date();
            }

            deletedCount++;

            if (!options?.multi) {
                break; // Delete only first match
            }
        }

        if (deletedCount > 0) {
            collection._meta.modifiedAt = new Date();
            this.save();
        }

        return {
            success: true,
            deletedCount
        };
    }

    /**
     * Deletes a document by ID
     * @param collectionName - Collection name
     * @param id - Document ID
     * @param hard - Hard delete (true) or soft delete (false)
     */
    public deleteById(collectionName: string, id: string, hard: boolean = false): Bob.DeleteResult {
        const collection = this.getCollection(collectionName);
        const document = collection.documents[id];

        if (!document || document._meta.deleted) {
            return {
                success: false,
                error: 'Document not found',
                deletedCount: 0
            };
        }

        if (hard) {
            delete collection.documents[id];
            collection._meta.documentCount--;
        } else {
            document._meta.deleted = true;
            document._meta.updatedAt = new Date();
        }

        collection._meta.modifiedAt = new Date();
        this.save();

        return {
            success: true,
            deletedCount: 1
        };
    }

    /**
     * Counts documents in a collection
     * @param collectionName - Collection name
     * @param where - Query conditions
     */
    public count<T = any>(
        collectionName: string,
        where?: Bob.QueryCondition<T>
    ): number {
        const collection = this.getCollection(collectionName);
        let documents = Object.values(collection.documents);

        // Filter deleted
        documents = documents.filter(doc => !doc._meta.deleted);

        // Filter by query
        if (where) {
            documents = documents.filter(doc => this.matchesQuery(doc.data, where));
        }

        return documents.length;
    }

    // ========================================================================
    // DATABASE OPERATIONS
    // ========================================================================

    /**
     * Saves database to disk
     */
    public save(): void {
        if (!this.autoSaveEnabled) return;

        this.database._meta.modifiedAt = new Date();

        const serialized = Buffer.from(JSON.stringify(this.database), 'utf-8');
        const encrypted = Encryption.encryptAuto(
            serialized,
            this.encryptionKey,
            this.database._meta.chunkSize
        );

        fs.writeFileSync(this.dbPath, encrypted);

        if (this.config.debug) {
            Utils.logger.debug(`Database saved: ${Utils.formatBytes(encrypted.length)}`);
        }
    }

    /**
     * Gets database metadata
     */
    public getMetadata(): Bob.DatabaseMetadata {
        return { ...this.database._meta };
    }

    /**
     * Gets database statistics
     */
    public getStats(): Bob.DatabaseStats {
        const collections: Record<string, Bob.CollectionStats> = {};
        let totalDocuments = 0;

        for (const [name, collection] of Object.entries(this.database.collections)) {
            const stats: Bob.CollectionStats = {
                name,
                documentCount: collection._meta.documentCount,
                size: 0, // TODO: Calculate
                indexCount: collection.indexes.length,
                avgDocumentSize: 0 // TODO: Calculate
            };

            collections[name] = stats;
            totalDocuments += collection._meta.documentCount;
        }

        return {
            collectionCount: Object.keys(this.database.collections).length,
            totalDocuments,
            size: Utils.getFileSize(this.dbPath),
            avgDocumentSize: 0, // TODO: Calculate
            collections
        };
    }

    /**
     * Closes the database
     */
    public close(): void {
        this.save();
        Utils.logger.info(`Database '${this.database.filename}' closed`);
    }

    /**
     * Enable/disable auto-save
     */
    public setAutoSave(enabled: boolean): void {
        this.autoSaveEnabled = enabled;
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Checks if data matches query conditions
     */
    private matchesQuery(data: any, where: Bob.QueryCondition): boolean {
        for (const [key, condition] of Object.entries(where)) {
            // Logical operators
            if (key === '$and') {
                return (condition as any[]).every(q => this.matchesQuery(data, q));
            }
            if (key === '$or') {
                return (condition as any[]).some(q => this.matchesQuery(data, q));
            }
            if (key === '$not') {
                return !(condition as any[]).every(q => this.matchesQuery(data, q));
            }

            // Field conditions
            const value = Utils.getNestedValue(data, key);

            if (Utils.isObject(condition)) {
                for (const [op, condValue] of Object.entries(condition)) {
                    switch (op) {
                        case '$eq':
                            if (value !== condValue) return false;
                            break;
                        case '$ne':
                            if (value === condValue) return false;
                            break;
                        case '$gt':
                            if (value <= condValue) return false;
                            break;
                        case '$gte':
                            if (value < condValue) return false;
                            break;
                        case '$lt':
                            if (value >= condValue) return false;
                            break;
                        case '$lte':
                            if (value > condValue) return false;
                            break;
                        case '$in':
                            if (!Array.isArray(condValue) || !condValue.includes(value)) return false;
                            break;
                        case '$nin':
                            if (!Array.isArray(condValue) || condValue.includes(value)) return false;
                            break;
                        case '$regex':
                            const regex = new RegExp(condValue);
                            if (!regex.test(String(value))) return false;
                            break;
                        case '$exists':
                            if (condValue && value === undefined) return false;
                            if (!condValue && value !== undefined) return false;
                            break;
                    }
                }
            } else {
                // Simple equality
                if (value !== condition) return false;
            }
        }

        return true;
    }

    /**
     * Sorts documents
     */
    private sortDocuments<T>(documents: Bob.Document<T>[], sort: Record<string, 1 | -1>): Bob.Document<T>[] {
        return [...documents].sort((a, b) => {
            for (const [key, order] of Object.entries(sort)) {
                const aVal = Utils.getNestedValue(a.data, key);
                const bVal = Utils.getNestedValue(b.data, key);

                if (aVal < bVal) return order === 1 ? -1 : 1;
                if (aVal > bVal) return order === 1 ? 1 : -1;
            }
            return 0;
        });
    }

    /**
     * Applies projection to results
     */
    private applyProjection(results: any[], projection: string[] | Record<string, boolean>): any[] {
        if (Array.isArray(projection)) {
            return results.map(doc => Utils.pick(doc, projection as any));
        } else {
            const includeKeys = Object.keys(projection).filter(k => projection[k]);
            return results.map(doc => Utils.pick(doc, includeKeys as any));
        }
    }

    /**
     * Applies update modifiers to a document
     */
    private applyUpdate<T>(document: Bob.Document<T>, data: Partial<T> | Bob.UpdateModifiers<T>): void {
        if ('$set' in data) {
            // Update modifiers
            const modifiers = data as Bob.UpdateModifiers<T>;

            if (modifiers.$set) {
                Object.assign(document.data as object, modifiers.$set);
            }

            if (modifiers.$unset) {
                for (const key of Object.keys(modifiers.$unset)) {
                    delete (document.data as any)[key];
                }
            }

            if (modifiers.$inc) {
                for (const [key, value] of Object.entries(modifiers.$inc)) {
                    (document.data as any)[key] = ((document.data as any)[key] || 0) + value;
                }
            }

            // TODO: Implement $push, $pull, $addToSet, etc. :p
        } else {
            // Simple update
            Object.assign(document.data as object, data);
        }
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Blooby;
export * from './types';
export * as Encryption from './features/encryption';
export * as Utils from './utils';
