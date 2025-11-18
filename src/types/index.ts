// Blooby Types

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Main configuration for Blooby instance
 */
export interface BloobyConfig {
    /** Path where database files are stored */
    storagePath: string;
    /** Auto-save interval in ms (optional) */
    autoSaveInterval?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Default chunk size for all databases */
    defaultChunkSize?: number;
}

/**
 * Database metadata and configuration
 */
export interface BloobyDatabase {
    /** Database filename (without .bob extension) */
    filename: string;
    /** Enable compression for data */
    compression: boolean;
    /** Collections/tables in this database */
    collections: Record<string, Collection>;
    /** Database metadata */
    _meta: DatabaseMetadata;
}

/**
 * Database metadata
 */
export interface DatabaseMetadata {
    /** Database creation timestamp */
    createdAt: Date;
    /** Last modification timestamp */
    modifiedAt: Date;
    /** Magic number for file validation */
    magicNumber: string;
    /** Chunk size in bytes */
    chunkSize: number;
    /** Database version (for migrations) */
    version?: number;
    /** Custom metadata */
    custom?: Record<string, any>;
}

// ============================================================================
// COLLECTION TYPES
// ============================================================================

/**
 * Collection (table) structure
 */
export interface Collection {
    /** Collection name */
    name: string;
    /** Documents in this collection */
    documents: Record<string, Document>;
    /** Collection indexes for fast querying */
    indexes: Index[];
    /** Collection metadata */
    _meta: CollectionMetadata;
}

/**
 * Collection metadata
 */
export interface CollectionMetadata {
    /** Creation timestamp */
    createdAt: Date;
    /** Last modification timestamp */
    modifiedAt: Date;
    /** Total document count */
    documentCount: number;
    /** Schema validation rules (optional) */
    schema?: Schema;
    /** Auto-increment counter for IDs */
    autoIncrementId?: number;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/**
 * Document (record) with metadata
 */
export interface Document<T = any> {
    /** Unique document ID */
    _id: string;
    /** Document data */
    data: T;
    /** Document metadata */
    _meta: DocumentMetadata;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** Document version (for conflict resolution) */
    version: number;
    /** Soft delete flag */
    deleted?: boolean;
    /** Custom metadata */
    custom?: Record<string, any>;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Query operators for filtering
 */
export type QueryOperator =
    | '$eq'      // Equal
    | '$ne'      // Not equal
    | '$gt'      // Greater than
    | '$gte'     // Greater than or equal
    | '$lt'      // Less than
    | '$lte'     // Less than or equal
    | '$in'      // In array
    | '$nin'     // Not in array
    | '$regex'   // Regex match
    | '$exists'  // Field exists
    | '$type'    // Type check
    | '$size'    // Array size
    | '$all';    // Array contains all

/**
 * Logical operators
 */
export type LogicalOperator =
    | '$and'
    | '$or'
    | '$not'
    | '$nor';

/**
 * Query condition
 */
export type QueryCondition<T = any> = {
    [K in keyof T]?: T[K] | {
        [op in QueryOperator]?: any;
    };
} & {
    [op in LogicalOperator]?: QueryCondition<T>[];
};

/**
 * Query options
 */
export interface QueryOptions {
    /** Sort order */
    sort?: Record<string, 1 | -1>; // 1 = ascending, -1 = descending
    /** Limit results */
    limit?: number;
    /** Skip results (for pagination) */
    skip?: number;
    /** Project specific fields */
    projection?: string[] | Record<string, boolean>;
    /** Include soft-deleted documents */
    includeDeleted?: boolean;
}

/**
 * Find query
 */
export interface FindQuery<T = any> {
    /** Query conditions */
    where?: QueryCondition<T>;
    /** Query options */
    options?: QueryOptions;
}

// ============================================================================
// CRUD OPERATION TYPES
// ============================================================================

/**
 * Insert operation
 */
export interface InsertOperation<T = any> {
    /** Collection name */
    collection: string;
    /** Document(s) to insert */
    data: T | T[];
    /** Custom document ID (optional) */
    _id?: string;
}

/**
 * Update operation
 */
export interface UpdateOperation<T = any> {
    /** Collection name */
    collection: string;
    /** Query to find documents */
    where: QueryCondition<T>;
    /** Update data */
    data: Partial<T> | UpdateModifiers<T>;
    /** Update options */
    options?: UpdateOptions;
}

/**
 * Update modifiers
 */
export interface UpdateModifiers<T = any> {
    /** Set field values */
    $set?: Partial<T>;
    /** Unset (remove) fields */
    $unset?: Record<keyof T, any>;
    /** Increment numeric fields */
    $inc?: Partial<Record<keyof T, number>>;
    /** Multiply numeric fields */
    $mul?: Partial<Record<keyof T, number>>;
    /** Push to array fields */
    $push?: Partial<T>;
    /** Pull from array fields */
    $pull?: Partial<T>;
    /** Add to set (unique array) */
    $addToSet?: Partial<T>;
}

/**
 * Update options
 */
export interface UpdateOptions {
    /** Update multiple documents (default: false) */
    multi?: boolean;
    /** Create document if not found */
    upsert?: boolean;
}

/**
 * Delete operation
 */
export interface DeleteOperation<T = any> {
    /** Collection name */
    collection: string;
    /** Query to find documents */
    where: QueryCondition<T>;
    /** Delete options */
    options?: DeleteOptions;
}

/**
 * Delete options
 */
export interface DeleteOptions {
    /** Hard delete (true) or soft delete (false) */
    hard?: boolean;
    /** Delete multiple documents (default: false) */
    multi?: boolean;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Generic operation result
 */
export interface OperationResult<T = any> {
    /** Operation succeeded */
    success: boolean;
    /** Result data */
    data?: T;
    /** Error message if failed */
    error?: string;
    /** Additional metadata */
    meta?: {
        /** Number of documents affected */
        affected?: number;
        /** Execution time in ms */
        executionTime?: number;
        /** Custom metadata */
        [key: string]: any;
    };
}

/**
 * Insert result
 */
export interface InsertResult<T = any> extends OperationResult<T[]> {
    /** Inserted document IDs */
    insertedIds: string[];
    /** Number of documents inserted */
    insertedCount: number;
}

/**
 * Update result
 */
export interface UpdateResult extends OperationResult {
    /** Number of documents matched */
    matchedCount: number;
    /** Number of documents modified */
    modifiedCount: number;
    /** Upserted document ID (if upsert: true) */
    upsertedId?: string;
}

/**
 * Delete result
 */
export interface DeleteResult extends OperationResult {
    /** Number of documents deleted */
    deletedCount: number;
}

/**
 * Find result
 */
export interface FindResult<T = any> extends OperationResult<T[]> {
    /** Total count (ignoring limit/skip) */
    totalCount: number;
    /** Has more results */
    hasMore: boolean;
}

// ============================================================================
// INDEX TYPES
// ============================================================================

/**
 * Index configuration
 */
export interface Index {
    /** Index name */
    name: string;
    /** Indexed fields */
    fields: IndexField[];
    /** Index is unique */
    unique?: boolean;
    /** Index is sparse (ignore null values) */
    sparse?: boolean;
    /** Index metadata */
    _meta: IndexMetadata;
}

/**
 * Index field
 */
export interface IndexField {
    /** Field name */
    field: string;
    /** Sort order (1 = asc, -1 = desc) */
    order: 1 | -1;
}

/**
 * Index metadata
 */
export interface IndexMetadata {
    /** Creation timestamp */
    createdAt: Date;
    /** Number of indexed documents */
    documentCount: number;
    /** Index size in bytes */
    size?: number;
}

// ============================================================================
// SCHEMA VALIDATION TYPES
// ============================================================================

/**
 * Schema definition
 */
export interface Schema {
    /** Schema fields */
    fields: Record<string, SchemaField>;
    /** Require all fields */
    strict?: boolean;
    /** Allow additional fields */
    additionalFields?: boolean;
}

/**
 * Schema field definition
 */
export interface SchemaField {
    /** Field type */
    type: SchemaFieldType;
    /** Field is required */
    required?: boolean;
    /** Default value */
    default?: any;
    /** Validation function */
    validate?: (value: any) => boolean | string;
    /** Min value (for numbers) */
    min?: number;
    /** Max value (for numbers) */
    max?: number;
    /** Min length (for strings/arrays) */
    minLength?: number;
    /** Max length (for strings/arrays) */
    maxLength?: number;
    /** Regex pattern (for strings) */
    pattern?: RegExp | string;
    /** Enum values */
    enum?: any[];
    /** Nested schema (for objects) */
    schema?: Schema;
    /** Array item schema */
    items?: SchemaField;
}

/**
 * Schema field types
 */
export type SchemaFieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'array'
    | 'object'
    | 'null'
    | 'any';

/**
 * Validation result
 */
export interface ValidationResult {
    /** Validation passed */
    valid: boolean;
    /** Validation errors */
    errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
    /** Field path */
    field: string;
    /** Error message */
    message: string;
    /** Error code */
    code?: string;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Transaction
 */
export interface Transaction {
    /** Transaction ID */
    id: string;
    /** Operations in this transaction */
    operations: TransactionOperation[];
    /** Transaction state */
    state: TransactionState;
    /** Start timestamp */
    startedAt: Date;
    /** Commit/rollback timestamp */
    completedAt?: Date;
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
    /** Operation type */
    type: 'insert' | 'update' | 'delete';
    /** Collection name */
    collection: string;
    /** Operation data */
    data: any;
    /** Rollback data (for undo) */
    rollback?: any;
}

/**
 * Transaction state
 */
export type TransactionState = 'pending' | 'committed' | 'rolled_back' | 'failed';

// ============================================================================
// ENCRYPTION TYPES (Re-exported from encryption feature)
// ============================================================================

/**
 * Encryption metadata
 */
export interface EncryptionMetadata {
    /** Salt used for key derivation */
    salt: Buffer;
    /** Algorithm used */
    algorithm: 'aes-256-gcm' | 'aes-256-cbc';
    /** Number of chunks */
    chunkCount?: number;
    /** Chunk size in bytes */
    chunkSize?: number;
}

/**
 * Encrypted chunk
 */
export interface EncryptedChunk {
    /** Chunk index */
    index: number;
    /** Initialization vector */
    iv: Buffer;
    /** Encrypted data */
    data: Buffer;
    /** Authentication tag */
    authTag?: Buffer;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
    /** Encryption metadata */
    metadata: EncryptionMetadata;
    /** Encrypted chunks */
    chunks: EncryptedChunk[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial (makes all nested fields optional)
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Pagination options
 */
export interface PaginationOptions {
    /** Page number (1-based) */
    page: number;
    /** Items per page */
    pageSize: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T = any> {
    /** Result data */
    data: T[];
    /** Pagination info */
    pagination: {
        /** Current page */
        page: number;
        /** Page size */
        pageSize: number;
        /** Total items */
        totalItems: number;
        /** Total pages */
        totalPages: number;
        /** Has next page */
        hasNext: boolean;
        /** Has previous page */
        hasPrevious: boolean;
    };
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc' | 1 | -1;

/**
 * Field path (for nested fields: "user.address.city")
 */
export type FieldPath = string;

/**
 * Timestamp
 */
export type Timestamp = Date | number | string;

// ============================================================================
// BACKUP & EXPORT TYPES
// ============================================================================

/**
 * Backup options
 */
export interface BackupOptions {
    /** Include soft-deleted documents */
    includeDeleted?: boolean;
    /** Compress backup */
    compress?: boolean;
    /** Encrypt backup */
    encrypt?: boolean;
    /** Encryption key (if encrypt: true) */
    encryptionKey?: string;
}

/**
 * Export format
 */
export type ExportFormat = 'json' | 'csv' | 'xml' | 'sql';

/**
 * Export options
 */
export interface ExportOptions {
    /** Export format */
    format: ExportFormat;
    /** Collections to export (empty = all) */
    collections?: string[];
    /** Export options */
    options?: BackupOptions;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Database statistics
 */
export interface DatabaseStats {
    /** Total collections */
    collectionCount: number;
    /** Total documents across all collections */
    totalDocuments: number;
    /** Database size in bytes */
    size: number;
    /** Average document size */
    avgDocumentSize: number;
    /** Collection statistics */
    collections: Record<string, CollectionStats>;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
    /** Collection name */
    name: string;
    /** Document count */
    documentCount: number;
    /** Collection size in bytes */
    size: number;
    /** Index count */
    indexCount: number;
    /** Average document size */
    avgDocumentSize: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Database events
 */
export type DatabaseEvent =
    | 'database:created'
    | 'database:loaded'
    | 'database:saved'
    | 'database:deleted'
    | 'collection:created'
    | 'collection:deleted'
    | 'document:inserted'
    | 'document:updated'
    | 'document:deleted'
    | 'index:created'
    | 'index:deleted'
    | 'transaction:started'
    | 'transaction:committed'
    | 'transaction:rolled_back'
    | 'error';

/**
 * Event listener callback
 */
export type EventListener<T = any> = (event: DatabaseEventData<T>) => void;

/**
 * Event data
 */
export interface DatabaseEventData<T = any> {
    /** Event type */
    event: DatabaseEvent;
    /** Event data */
    data: T;
    /** Event timestamp */
    timestamp: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Blooby error codes
 */
export enum BloobyErrorCode {
    DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
    DATABASE_ALREADY_EXISTS = 'DATABASE_ALREADY_EXISTS',
    COLLECTION_NOT_FOUND = 'COLLECTION_NOT_FOUND',
    COLLECTION_ALREADY_EXISTS = 'COLLECTION_ALREADY_EXISTS',
    DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
    INVALID_QUERY = 'INVALID_QUERY',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
    DECRYPTION_ERROR = 'DECRYPTION_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR',
    INDEX_ERROR = 'INDEX_ERROR',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Blooby error
 */
export interface BloobyError {
    /** Error code */
    code: BloobyErrorCode;
    /** Error message */
    message: string;
    /** Additional details */
    details?: any;
    /** Original error */
    originalError?: Error;
}
