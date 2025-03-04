import fs from 'fs';
import path from 'path';

function searchFile(dir: string): string[] {
    // Read the contents of the directory
    const files = fs.readdirSync(dir);
    const answer: string[] = [];

    // Search through the files
    files.forEach(file => {
        // Build the full path of the file
        const filePath = path.join(dir, file);

        // Get the file stats
        const fileStat = fs.statSync(filePath);

        // If the file is a directory, recursively search the directory
        if (fileStat.isDirectory()) {
            answer.push(...searchFile(filePath));
        } else {
            answer.push(filePath);
        }
    });

    return answer;
}

function run() {
    const solutionFiles: string[] = [
        ...searchFile('./contracts/common'),
        ...searchFile('./contracts/core'),
        ...searchFile('./contracts/solutions/Nitrogen'),
        ...searchFile('./contracts/solutions/Carbon'),
    ];
    console.log('Solution files:');
    let totalLinesIgnoreEmpty = 0;
    let totalLines = 0;
    solutionFiles.forEach(file => {
        const lines = fs.readFileSync(file, 'utf-8').split('\n');
        let fileLines = 0;
        let fileLinesIgnoreEmpty = 0;
        lines.forEach(line => {
            fileLines += 1;
            if (line.trim().length > 0) {
                fileLinesIgnoreEmpty += 1;
            }
        });
        totalLines += fileLines;
        totalLinesIgnoreEmpty += fileLinesIgnoreEmpty;
        console.log(`${file}, lines: ${fileLines}, without empty lines: ${fileLinesIgnoreEmpty}`);
    });
    console.log(`Total lines                : ${totalLines}`);
    console.log(`Total lines (without empty): ${totalLinesIgnoreEmpty}`);
}

run();
