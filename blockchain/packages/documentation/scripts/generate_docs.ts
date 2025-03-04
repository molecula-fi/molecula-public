import { generateDocs } from '../src';

generateDocs().catch(error => {
    console.error('Failed to generate docs for contracts with error:', error);
    process.exit(1);
});
