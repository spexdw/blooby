// Blooby Types

export interface BloobyConfig {
    storagePath: string;
}

export interface BloobyDatabase {
    encryptionKey: string;
    filename: string;
    compression: boolean;
    _meta: {
        createdAt: Date;
        modifiedAt: Date;
        magicNumber: string;
        chunkSize: number;
    };
}