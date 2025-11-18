// Encryption Utilities

// Library Imports
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EncryptionMetadata {
    /** Salt used for key derivation (stored with encrypted data) */
    salt: Buffer;
    /** Algorithm used for encryption */
    algorithm: 'aes-256-gcm' | 'aes-256-cbc';
    /** Number of chunks if chunked encryption is used */
    chunkCount?: number;
    /** Individual chunk size in bytes */
    chunkSize?: number;
}

export interface EncryptedChunk {
    /** Chunk index (for ordering) */
    index: number;
    /** Initialization Vector for this chunk */
    iv: Buffer;
    /** Encrypted data */
    data: Buffer;
    /** Authentication tag (for GCM mode) */
    authTag?: Buffer;
}

export interface EncryptedData {
    /** Encryption metadata */
    metadata: EncryptionMetadata;
    /** Encrypted chunks or single encrypted buffer */
    chunks: EncryptedChunk[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM = 'aes-256-gcm'; // GCM mode provides authentication
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for AES
const SALT_LENGTH = 32; // 256 bits for key derivation
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM authentication

// ============================================================================
// MASTER KEY UTILITIES
// ============================================================================

/**
 * Normalizes a user-provided key to exactly 32 bytes using SHA-256
 * This ensures ANY string key becomes a valid AES-256 key
 *
 * @param masterKey - User's master password/key (any length)
 * @returns 32-byte normalized key
 */
export function normalizeMasterKey(masterKey: string): Buffer {
    return crypto.createHash('sha256').update(masterKey, 'utf-8').digest();
}

/**
 * Derives a unique encryption key from master key + salt + context
 * Each chunk/data piece gets a different derived key for extra security
 *
 * @param masterKey - The base master key
 * @param salt - Unique salt for this encryption operation
 * @param context - Additional context (e.g., chunk index, data type)
 * @returns Derived 32-byte key
 */
export function deriveKey(masterKey: string, salt: Buffer, context: string = ''): Buffer {
    const normalizedKey = normalizeMasterKey(masterKey);

    // Use PBKDF2 for secure key derivation
    // Context is added to make each derived key unique
    return crypto.pbkdf2Sync(
        normalizedKey,
        Buffer.concat([salt, Buffer.from(context, 'utf-8')]),
        100000, // 100k iterations (good security/performance balance)
        KEY_LENGTH,
        'sha256'
    );
}

/**
 * Generates a cryptographically secure random encryption key
 *
 * @param format - Output format: 'hex', 'base64', or 'buffer'
 * @returns Random key in specified format
 */
export function generateEncryptionKey(format: 'hex' | 'base64' | 'buffer' = 'hex'): string | Buffer {
    const key = crypto.randomBytes(KEY_LENGTH);

    switch (format) {
        case 'hex':
            return key.toString('hex'); // 64 characters
        case 'base64':
            return key.toString('base64'); // 44 characters
        case 'buffer':
            return key;
        default:
            return key.toString('hex');
    }
}

// ============================================================================
// CHUNK-BASED ENCRYPTION
// ============================================================================

/**
 * Encrypts data in chunks using AES-256-GCM with master key derivation
 * Each chunk is encrypted with a unique derived key for maximum security
 *
 * @param data - Data to encrypt (Buffer)
 * @param masterKey - Master encryption key
 * @param chunkSize - Size of each chunk in bytes (default: 1MB)
 * @returns Encrypted data with metadata
 */
export function encryptDataChunked(
    data: Buffer,
    masterKey: string,
    chunkSize: number = 1024 * 1024
): EncryptedData {
    // Generate a unique salt for this encryption operation
    const salt = crypto.randomBytes(SALT_LENGTH);
    const chunks: EncryptedChunk[] = [];

    // Calculate number of chunks needed
    const totalChunks = Math.ceil(data.length / chunkSize);

    // Encrypt each chunk with a unique derived key
    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, data.length);
        const chunkData = data.slice(start, end);

        // Derive unique key for this chunk (master key + salt + chunk index)
        const derivedKey = deriveKey(masterKey, salt, `chunk_${i}`);

        // Generate unique IV for this chunk
        const iv = crypto.randomBytes(IV_LENGTH);

        // Encrypt chunk with AES-256-GCM
        const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(chunkData),
            cipher.final()
        ]);

        // Get authentication tag (GCM mode provides integrity check)
        const authTag = cipher.getAuthTag();

        chunks.push({
            index: i,
            iv: iv,
            data: encrypted,
            authTag: authTag
        });
    }

    return {
        metadata: {
            salt: salt,
            algorithm: ALGORITHM,
            chunkCount: totalChunks,
            chunkSize: chunkSize
        },
        chunks: chunks
    };
}

/**
 * Decrypts chunked data encrypted with encryptDataChunked
 *
 * @param encryptedData - Encrypted data structure
 * @param masterKey - Master encryption key
 * @returns Decrypted data buffer
 * @throws Error if decryption fails or authentication fails
 */
export function decryptDataChunked(encryptedData: EncryptedData, masterKey: string): Buffer {
    const { metadata, chunks } = encryptedData;
    const decryptedChunks: Buffer[] = [];

    // Sort chunks by index (in case they're out of order)
    chunks.sort((a, b) => a.index - b.index);

    // Decrypt each chunk
    for (const chunk of chunks) {
        // Derive the same key used for encryption
        const derivedKey = deriveKey(masterKey, metadata.salt, `chunk_${chunk.index}`);

        // Create decipher with same IV
        const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, chunk.iv);

        // Set authentication tag for GCM mode
        if (chunk.authTag) {
            decipher.setAuthTag(chunk.authTag);
        }

        try {
            const decrypted = Buffer.concat([
                decipher.update(chunk.data),
                decipher.final()
            ]);
            decryptedChunks.push(decrypted);
        } catch (error) {
            throw new Error(`Decryption failed for chunk ${chunk.index}: Invalid key or corrupted data`);
        }
    }

    // Combine all decrypted chunks
    return Buffer.concat(decryptedChunks);
}

// ============================================================================
// SIMPLE ENCRYPTION (Non-Chunked)
// ============================================================================

/**
 * Simple encryption for small data without chunking
 *
 * @param data - Data to encrypt
 * @param masterKey - Master encryption key
 * @returns Encrypted data with metadata
 */
export function encryptData(data: Buffer, masterKey: string): EncryptedData {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const derivedKey = deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return {
        metadata: {
            salt: salt,
            algorithm: ALGORITHM
        },
        chunks: [{
            index: 0,
            iv: iv,
            data: encrypted,
            authTag: authTag
        }]
    };
}

/**
 * Simple decryption for data encrypted with encryptData
 *
 * @param encryptedData - Encrypted data structure
 * @param masterKey - Master encryption key
 * @returns Decrypted data buffer
 */
export function decryptData(encryptedData: EncryptedData, masterKey: string): Buffer {
    const { metadata, chunks } = encryptedData;
    const chunk = chunks[0]; // Single chunk for simple encryption

    const derivedKey = deriveKey(masterKey, metadata.salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, chunk.iv);

    if (chunk.authTag) {
        decipher.setAuthTag(chunk.authTag);
    }

    try {
        return Buffer.concat([
            decipher.update(chunk.data),
            decipher.final()
        ]);
    } catch (error) {
        throw new Error('Decryption failed: Invalid key or corrupted data');
    }
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Serializes encrypted data to a single Buffer for storage
 * Format: [metadata_length][metadata][chunk1][chunk2]...
 *
 * @param encryptedData - Encrypted data structure
 * @returns Serialized buffer ready for file storage
 */
export function serializeEncryptedData(encryptedData: EncryptedData): Buffer {
    const parts: Buffer[] = [];

    // Serialize metadata
    const metadataJson = JSON.stringify({
        salt: encryptedData.metadata.salt.toString('base64'),
        algorithm: encryptedData.metadata.algorithm,
        chunkCount: encryptedData.metadata.chunkCount,
        chunkSize: encryptedData.metadata.chunkSize
    });
    const metadataBuffer = Buffer.from(metadataJson, 'utf-8');

    // Add metadata length (4 bytes) + metadata
    const metadataLength = Buffer.allocUnsafe(4);
    metadataLength.writeUInt32BE(metadataBuffer.length, 0);
    parts.push(metadataLength, metadataBuffer);

    // Serialize each chunk
    for (const chunk of encryptedData.chunks) {
        // Chunk format: [index(4)][iv_length(2)][iv][authTag_length(2)][authTag][data_length(4)][data]
        const chunkParts: Buffer[] = [];

        // Index
        const indexBuf = Buffer.allocUnsafe(4);
        indexBuf.writeUInt32BE(chunk.index, 0);
        chunkParts.push(indexBuf);

        // IV
        const ivLengthBuf = Buffer.allocUnsafe(2);
        ivLengthBuf.writeUInt16BE(chunk.iv.length, 0);
        chunkParts.push(ivLengthBuf, chunk.iv);

        // Auth tag (optional)
        if (chunk.authTag) {
            const authTagLengthBuf = Buffer.allocUnsafe(2);
            authTagLengthBuf.writeUInt16BE(chunk.authTag.length, 0);
            chunkParts.push(authTagLengthBuf, chunk.authTag);
        } else {
            const authTagLengthBuf = Buffer.allocUnsafe(2);
            authTagLengthBuf.writeUInt16BE(0, 0);
            chunkParts.push(authTagLengthBuf);
        }

        // Data
        const dataLengthBuf = Buffer.allocUnsafe(4);
        dataLengthBuf.writeUInt32BE(chunk.data.length, 0);
        chunkParts.push(dataLengthBuf, chunk.data);

        parts.push(Buffer.concat(chunkParts));
    }

    return Buffer.concat(parts);
}

/**
 * Deserializes encrypted data from storage buffer
 *
 * @param buffer - Serialized encrypted data
 * @returns Encrypted data structure
 */
export function deserializeEncryptedData(buffer: Buffer): EncryptedData {
    let offset = 0;

    // Read metadata
    const metadataLength = buffer.readUInt32BE(offset);
    offset += 4;

    const metadataJson = buffer.slice(offset, offset + metadataLength).toString('utf-8');
    offset += metadataLength;

    const metadataObj = JSON.parse(metadataJson);
    const metadata: EncryptionMetadata = {
        salt: Buffer.from(metadataObj.salt, 'base64'),
        algorithm: metadataObj.algorithm,
        chunkCount: metadataObj.chunkCount,
        chunkSize: metadataObj.chunkSize
    };

    // Read chunks
    const chunks: EncryptedChunk[] = [];
    const chunkCount = metadata.chunkCount || 1;

    for (let i = 0; i < chunkCount; i++) {
        // Read index
        const index = buffer.readUInt32BE(offset);
        offset += 4;

        // Read IV
        const ivLength = buffer.readUInt16BE(offset);
        offset += 2;
        const iv = buffer.slice(offset, offset + ivLength);
        offset += ivLength;

        // Read auth tag
        const authTagLength = buffer.readUInt16BE(offset);
        offset += 2;
        let authTag: Buffer | undefined;
        if (authTagLength > 0) {
            authTag = buffer.slice(offset, offset + authTagLength);
            offset += authTagLength;
        }

        // Read data
        const dataLength = buffer.readUInt32BE(offset);
        offset += 4;
        const data = buffer.slice(offset, offset + dataLength);
        offset += dataLength;

        chunks.push({ index, iv, data, authTag });
    }

    return { metadata, chunks };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Auto-selects between simple or chunked encryption based on data size
 *
 * @param data - Data to encrypt
 * @param masterKey - Master encryption key
 * @param chunkSize - Chunk size threshold (default 1MB)
 * @returns Serialized encrypted buffer
 */
export function encryptAuto(
    data: Buffer,
    masterKey: string,
    chunkSize: number = 1024 * 1024
): Buffer {
    if (data.length <= chunkSize) {
        // Use simple encryption for small data
        return serializeEncryptedData(encryptData(data, masterKey));
    } else {
        // Use chunked encryption for large data
        return serializeEncryptedData(encryptDataChunked(data, masterKey, chunkSize));
    }
}

/**
 * Auto-decrypts data encrypted with encryptAuto
 *
 * @param encryptedBuffer - Serialized encrypted data
 * @param masterKey - Master encryption key
 * @returns Decrypted data
 */
export function decryptAuto(encryptedBuffer: Buffer, masterKey: string): Buffer {
    const encryptedData = deserializeEncryptedData(encryptedBuffer);

    if (encryptedData.metadata.chunkCount && encryptedData.metadata.chunkCount > 1) {
        return decryptDataChunked(encryptedData, masterKey);
    } else {
        return decryptData(encryptedData, masterKey);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a key is strong enough
 *
 * @param key - Key to validate
 * @returns Validation result with errors if any
 */
export function validateEncryptionKey(key: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (key.length < 16) {
        errors.push('Key must be at least 16 characters long');
    }

    if (key.length < 32) {
        errors.push('Key should be at least 32 characters for maximum security');
    }

    // Check for common weak patterns
    if (/^(.)\1+$/.test(key)) {
        errors.push('Key should not be repetitive (e.g., "aaaaaaa")');
    }

    if (/^(0123456789|abcdefgh|qwerty)/i.test(key)) {
        errors.push('Key should not contain common patterns');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Hashes data for integrity verification
 *
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export function hashData(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}
