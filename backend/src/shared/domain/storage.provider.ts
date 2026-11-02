export interface UploadFileParams {
    key: string;
    buffer: Buffer;
    mimeType: string;
}

export interface UploadFileResult {
    url: string;
    key: string;
}

export interface StorageProvider {
    upload(params: UploadFileParams): Promise<UploadFileResult>;
    delete(key: string): Promise<void>;
    deleteMany(keys: string[]): Promise<void>;
    copy(sourceKey: string, destinationKey: string): Promise<UploadFileResult>;
    move(sourceKey: string, destinationKey: string): Promise<UploadFileResult>;
    replace(params: UploadFileParams): Promise<UploadFileResult>;
    getUrl(key: string): string;
    extractKeyFromUrl(url: string): string;
}

