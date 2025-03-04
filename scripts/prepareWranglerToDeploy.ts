import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

interface TFOutputVariable {
    value: string;
}

interface TFState {
    outputs: Record<string, TFOutputVariable>;
}

async function main() {
    try {
        const tfStateFile = readFileSync(resolvePath(__dirname, '../tfState.json'), {
            encoding: 'utf-8',
        });
        const tfState = JSON.parse(tfStateFile) as TFState;

        const outputs = Object.keys(tfState.outputs).reduce((acc, key) => {
            const record = tfState.outputs[key];

            if (record != null) {
                // to make `export MY_VAR="Value"`
                acc.push(`export ${key}="${record.value}"`);
            }

            return acc;
        }, [] as string[]);

        execSync(`eval ${outputs.join('; ')}`, { stdio: 'inherit' });

        console.log(outputs.join('; '));
    } catch (err) {
        console.error(`Can't prepare wrangler for deploy, because of: ${err.message}`);

        // @ts-ignore
        process.exit(0);
    }
}

main();
