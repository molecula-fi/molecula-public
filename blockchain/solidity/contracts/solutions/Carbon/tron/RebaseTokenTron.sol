// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {RebaseTokenCommon} from "../../../common/rebase/RebaseTokenCommon.sol";

contract RebaseTokenTron is RebaseTokenCommon {
    /// @dev Rebase token contract's tokenName.
    string public constant TOKEN_NAME = "Molecula USD";

    /// @dev Rebase token contract's tokenSymbol.
    string public constant TOKEN_SYMBOL = "mUSD";

    /**
     * @dev Constructor for initializing the contract.
     * @param initialOwner Smart contract owner address.
     * @param accountantAddress Accountant address.
     * @param initialShares Shares' amount to mint.
     * @param oracleAddress Oracle contract address.
     * @param tokenDecimals Token decimals.
     * @param minDeposit Minimum deposit value.
     * @param minRedeem Minimum redeem operation value.
     */
    constructor(
        address initialOwner,
        address accountantAddress,
        uint256 initialShares,
        address oracleAddress,
        uint8 tokenDecimals,
        uint256 minDeposit,
        uint256 minRedeem
    )
        RebaseTokenCommon(
            initialOwner,
            accountantAddress,
            initialShares,
            oracleAddress,
            TOKEN_NAME,
            TOKEN_SYMBOL,
            tokenDecimals,
            minDeposit,
            minRedeem
        )
    {}
}
