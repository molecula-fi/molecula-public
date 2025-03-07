/* eslint-disable no-restricted-syntax, no-await-in-loop */
import fs, { existsSync, mkdirSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import path, { join, extname } from 'path';
import { docgen } from 'solidity-docgen';

/**
 * Function to load the data from the last modified artifacts file within a folder.
 */
async function getArtifactsFromLastestJson(directoryPath: string) {
    try {
        // Read the directory to get a list of JSON files
        const files = await readdir(directoryPath);
        // Get file's path and stats
        const jsonFiles = await Promise.all(
            files.map(async file => {
                const filePath = join(directoryPath, file);
                const fileStat = await stat(filePath);
                return { filePath, fileStat };
            }),
        );
        // Find the latest modified JSON file
        const latestModifiedFile = jsonFiles.reduce(
            (latestFile, file) => {
                if (
                    file.fileStat.isFile() &&
                    extname(file.filePath).toLowerCase() === '.json' &&
                    file.fileStat.mtimeMs > latestFile.fileStat.mtimeMs
                ) {
                    return file;
                }
                return latestFile;
            },
            { filePath: '', fileStat: { mtimeMs: 0 } },
        );

        if (latestModifiedFile.filePath === '') {
            console.error('No JSON files found in the directory');
            return null;
        }
        // Load the content of the latest modified file
        const data = await readFile(latestModifiedFile.filePath, 'utf8');
        const jsonContent = JSON.parse(data);
        const { input, output } = jsonContent;
        console.log('Latest Modified File:', latestModifiedFile.filePath);

        return { input, output };
    } catch (error) {
        console.error('Error:', error);
    }

    return null;
}

async function processContractDoc(docText: string) {
    // Remove first line from contract's md file
    const linesOfContract = docText.split('\n').slice(1);

    // Remove '_' if it is the first or last symbol on every line
    // Replace `##...` to `#...`
    const processedLines = linesOfContract.map(line => {
        return line.replace(/^_/, '').replace(/_$/, '').replace(/^#/, '');
    });

    return processedLines;
}

export function ensureDirectoryExists(directory: string) {
    if (existsSync(directory)) {
        return;
    }
    mkdirSync(directory, { recursive: true });
}

export function ensurePathToFileExists(filePath: string) {
    const dirname = path.dirname(filePath);
    ensureDirectoryExists(dirname);
}

export async function prepareDocsForGithub() {
    const contracts = [
        {
            inFiles: ['solutions/Nitrogen/AccountantAgent.md'],
            outFile: 'nitrogen-accountant-agent.md',
        },
        { inFiles: ['core/MoleculaPoolTreasury.md'], outFile: 'moleculapooltreasury.md' },
        { inFiles: ['core/SupplyManager.md'], outFile: 'supplymanager.md' },
        {
            inFiles: [
                'solutions/Nitrogen/RebaseToken.md',
                'common/rebase/RebaseTokenCommon.md',
                'common/rebase/RebaseERC20Permit.md',
                'common/rebase/RebaseERC20.md',
            ],
            outFile: 'musdvault.md',
        },
    ];

    for (const { inFiles, outFile } of contracts) {
        const resultDocText: string[] = [];
        for (const file of inFiles) {
            const docPath = path.resolve(__dirname, '..', 'docs', file);
            const docText = await readFile(docPath, 'utf8');
            const newDocText = await processContractDoc(docText);
            resultDocText.push(...newDocText);
        }

        const outPath = path.resolve(__dirname, '..', 'github-docs', outFile);
        ensurePathToFileExists(outPath);
        fs.writeFileSync(outPath, resultDocText.join('\n'));
    }
}

/**
 * Function to generate the docs for the contracts.
 */
export async function generateDocs() {
    const buildInfoPath = path.resolve(__dirname, '../artifacts/build-info');
    const artifacts = await getArtifactsFromLastestJson(buildInfoPath);
    if (artifacts === null || artifacts === undefined) {
        throw new Error('Failed to get build info');
    }

    await docgen([artifacts], {
        outputDir: path.resolve(__dirname, '../docs'),
        exclude: ['./mock/', './test/'],
        pages: 'files',
    });
    await prepareDocsForGithub();
}

generateDocs().catch(error => {
    console.error('Failed to generate docs for contracts with error:', error);
    process.exit(1);
});
