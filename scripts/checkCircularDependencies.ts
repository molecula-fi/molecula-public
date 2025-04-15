/* eslint-disable import/no-extraneous-dependencies */
import { parseCircular, parseDependencyTree, prettyCircular } from 'dpdm';
import fs from 'fs';

const checkCircularDependencies = async () => {
    console.log('Testing for circular dependencies using "DPDM"...');
    const sources = [
        './backend/evm-confirmer-evm-retail/src/index.ts',
        './backend/evm-tracker-evm-retail/src/index.ts',
        './backend/evm-token-tracker-retail/src/index.ts',
        './backend/packages/contracts/src/index.ts',
        './backend/packages/graphql/src/index.ts',
        './backend/packages/hashicorp/src/index.ts',
        './backend/packages/layer-zero/src/index.ts',
        './backend/packages/metrics/src/index.ts',
        './backend/packages/mongo/src/index.ts',
        './backend/packages/notifications/src/index.ts',
        './backend/packages/routes/src/index.ts',
        './backend/packages/sentry/src/index.ts',
        './backend/packages/utilities/src/index.ts',
        './backend/packages/swagger/src/index.ts',
        './backend/ton-exchanger-evm-manual/src/index.ts',
        './backend/ton-pool-evm-total/src/index.ts',
        './backend/tron-confirmer-evm-retail/src/index.ts',
        './backend/tron-exchanger-evm-retail/src/index.ts',
        './backend/tron-pool-evm-retail/src/index.ts',
        './backend/tron-tracker-evm-retail/src/index.ts',
        './backend/info-service/src/index.ts',
        './backend/pool-service/src/index.ts',
        './backend/rebalance-service/src/index.ts',
        './backend/rpc-proxy/src/index.ts',
        './backend/atoms-service/src/index.ts',
        './backend-nest/_template/src/main.ts',
        './backend-nest/packages/app/src/index.ts',
        './backend-nest/packages/common/src/index.ts',
        './backend-nest/packages/database/src/index.ts',
        './backend-nest/packages/types/src/index.ts',
        './blockchain/packages/addresses/src/index.ts',
        './common/evm-utilities/src/index.ts',
        './common/server-connector/src/index.ts',
        './common/ton-utilities/src/index.ts',
        './common/tron-utilities/src/index.ts',
        './common/evm-contracts/src/index.ts',
        './common/tron-contracts/src/index.ts',
        './common/utilities/src/index.ts',
        './configs/eslint/index.json',
        './configs/tailwind/index.ts',
        './configs/environments/src/index.ts',
        './frontend/dev-expo/src/index.tsx',
        './frontend/dev-expo-pool-admin/src/index.tsx',
        './frontend/packages/dev-app/src/index.ts',
        './frontend/packages/dev-app-configs/src/index.ts',
        './frontend/packages/dev-app-pool-admin/src/index.ts',
        './frontend/packages/operations-service/src/index.ts',
        './frontend/packages/deposit-service/src/index.ts',
        './frontend/packages/dev-ui/src/index.ts',
        './frontend/packages/cookie-banner/src/index.tsx',
        './frontend/packages/next/src/index.tsx',
        './frontend/packages/sanity/index.ts',
        './frontend/packages/external-wallets/src/index.ts',
        './frontend/packages/pool-service/src/index.ts',
        './frontend/packages/atoms-service/src/index.ts',
        './frontend/packages/swap-service/src/index.ts',
        './frontend/packages/monitoring-service/src/index.ts',
        './frontend/packages/extensions-test-helpers/src/index.ts',
        './frontend/packages/test-ids/src/index.ts',
        './middleware/packages/deposit-solutions/src/index.ts',
        './middleware/packages/evm-deposit-manager/src/index.ts',
        './middleware/packages/evm-eip6963-adapter/src/index.ts',
        './middleware/packages/aml-manager/src/index.ts',
        './middleware/packages/atoms-manager/src/index.ts',
        './middleware/packages/contracts/src/index.ts',
        './middleware/packages/monitoring-manager/src/index.ts',
        './middleware/packages/info-viewer/src/index.ts',
        './middleware/packages/operations-viewer/src/index.ts',
        './middleware/packages/pool-manager/src/index.ts',
        './middleware/packages/swap-manager/src/index.ts',
        './middleware/packages/token-operations-viewer/src/index.ts',
        './middleware/packages/tron-deposit-manager/src/index.ts',
        './middleware/packages/solutions-governance/src/index.ts',
        './middleware/sdk/src/index.ts',
        './tests/src/configs/index.ts',
    ];
    for (let i = 0; i < sources.length; i += 1) {
        const f = sources[i]!;
        const fileExists = fs.existsSync(f);
        if (!fileExists) {
            throw new Error(`${f} is not exist`);
        }
    }
    const extensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.native.ts',
        '.native.tsx',
        '.native.js',
        '.native.jsx',
        '.web.ts',
        '.web.tsx',
        '.web.js',
        '.web.jsx',
        '.ios.ts',
        '.ios.tsx',
        '.ios.js',
        '.ios.jsx',
        '.android.ts',
        '.android.tsx',
        '.android.js',
        '.android.jsx',
        '.mjs',
        '.json',
    ];

    const tree = await parseDependencyTree(sources, { extensions });
    const circulars = parseCircular(tree);

    if (circulars.length > 0) {
        console.log(
            '\x1b[33m%s\x1b[0m', // yellow
            `Circular dependencies were found by "DPDM" (${circulars.length}):\n`,
            prettyCircular(circulars),
        );
        process.exit(1);
    } else {
        console.info(
            '\x1b[32m%s\x1b[0m', // green
            'Congratulations! "DPDM" haven\'t found any circular dependencies in your code!',
        );
    }
};

checkCircularDependencies().catch(error => {
    console.error(
        '\x1b[31m%s\x1b[0m', // red
        'Failed to find circular dependencies with error:',
        error,
    );
    process.exit(1);
});
