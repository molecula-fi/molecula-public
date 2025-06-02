/* eslint-disable camelcase, max-lines, no-await-in-loop, no-restricted-syntax, no-bitwise, no-plusplus */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';

import { deployNitrogenV11WithTokenVault } from '../../utils/NitrogenCommonV1.1';

describe('RebaseTokenOwner', () => {
    it('Test RebaseTokenOwner errors', async () => {
        const { rebaseTokenOwner, user0 } = await loadFixture(deployNitrogenV11WithTokenVault);

        // Test pause/pause mint
        await rebaseTokenOwner.pauseMint();
        await expect(rebaseTokenOwner.connect(user0).mint(user0, 1)).to.be.rejectedWith(
            'EFunctionPaused',
        );
        await rebaseTokenOwner.unpauseMint();
        await expect(rebaseTokenOwner.connect(user0).mint(user0, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );

        // Test pause/pause burn
        await rebaseTokenOwner.pauseBurn();
        await expect(rebaseTokenOwner.connect(user0).burn(user0, 1)).to.be.rejectedWith(
            'EFunctionPaused',
        );
        await rebaseTokenOwner.unpauseBurn();
        await expect(rebaseTokenOwner.connect(user0).burn(user0, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );

        // Test pause/pause all
        await rebaseTokenOwner.pauseAll();
        await expect(rebaseTokenOwner.connect(user0).mint(user0, 1)).to.be.rejectedWith(
            'EFunctionPaused',
        );
        await expect(rebaseTokenOwner.connect(user0).burn(user0, 1)).to.be.rejectedWith(
            'EFunctionPaused',
        );
        await rebaseTokenOwner.unpauseAll();
        await expect(rebaseTokenOwner.connect(user0).mint(user0, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );
        await expect(rebaseTokenOwner.connect(user0).burn(user0, 1)).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );

        // Test distribute errors
        await expect(rebaseTokenOwner.connect(user0).distribute([], [])).to.be.rejectedWith(
            'TokenVaultNotAllowed',
        );
    });
});
