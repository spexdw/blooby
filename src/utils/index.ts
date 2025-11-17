// Blooby Utilities

// Library Imports
import * as fs from 'fs';
import * as path from 'path';

// Utility Functions
export function printInfo(str: string,type: "info" | "warn" | "error" = "info") {
    const colorCodes: { [key: string]: string } = {
      info: "\x1b[36m", // Cyan
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m" // Red
    };
    const resetCode = "\x1b[0m";

    console.log(`${colorCodes[type]}[Blooby] ${str}${resetCode}`);
}

export function initalizePath(pathName: string) {
    if (!fs.existsSync(pathName)) {
        fs.mkdirSync(path.resolve(pathName), { recursive: true });
        printInfo(`Storage path initialized at: ${pathName}`);
    }
}