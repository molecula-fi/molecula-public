// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;
/// @title Restaking Supply Managers's Interface
/// @notice Defines the functions and events required for pool data management.
interface IRTSupplyManager {
    /**
     * @dev Emitted when processing deposits.
     * @param requestId Deposit operation unique identifier.
     * @param user Users's address.
     * @param value A deposited amount.
     * @param shares Shares' amount to mint.
     */
    event RequestDeposit(uint256 requestId, address user, uint256 value, uint256 shares);

    /**
     * @dev Emitted when processing deposits into EigenLayer.
     * @param value Deposit value.
     * @param pubkey Deposit value.
     * @param signature Deposit value.
     * @param depositDataRoot The SHA-256 hash of the SSZ-encoded DepositData object.
     */
    event Deposit(uint256 value, bytes pubkey, bytes signature, bytes32 depositDataRoot);

    /**
     * @dev Emitted when a user processing a withdrawal.
     * @param requestId Withdrawal operation unique identifier.
     * @param agent Agent's address.
     * @param value A withdrawn value.
     * @param shares A withdrawn shares.
     */
    event RedeemRequest(uint256 indexed requestId, address agent, uint256 shares, uint256 value);

    /**
     * @dev Event emitted when the redeem operation is executed.
     * @param requestIds Array of the request IDs.
     * @param values Array of the corresponding values.
     */
    event Redeem(uint256[] requestIds, uint256[] values);

    /**
     * @dev Event emitted when distributing yield.
     * @param users Array of user addresses.
     * @param shares Array of shares.
     */
    event DistributeYield(address[] users, uint256[] shares);

    /// @dev Emitted when the `isDepositPaused` flag is changed.
    /// @param newValue New value.
    event IsDepositPausedChanged(bool newValue);

    /// @dev Emitted when the `isRedeemPaused` flag is changed.
    /// @param newValue New value.
    event IsRedeemPausedChanged(bool newValue);

    // @dev Error indicating incorrect array length.
    error EIncorrectLength();

    /// @dev Error indicating Deposit Manager is already initialized.
    error EInitialized();

    /// @dev Error indicating no shares are available.
    error ENoShares();

    /// @dev Error indicating that the share has a too low price when withdrawing the value.
    error ETooLowSharePrice();

    /// @dev Error indicating that the share has a too high price when withdrawing the value.
    error ETooHighSharePrice();

    /// @dev Error indicating that the value amount not enough for deposit into EignenLayer.
    error ETooHighDepositValue();

    /// @dev Error indicating that the pool total supply equals zero.
    error EZeroTotalSupply();

    /// @dev Error: `msg.sender` is not authorized for some function.
    error EBadSender();

    /// @dev Throws an error if the operation status is incorrect.
    error EBadOperationStatus();

    /// @dev Throws an error if the poolId doesn't match the position in the array
    error EWrongPoolId();

    /// @dev Throws an error if the sum of portion is not equal to `1`.
    error EWrongPortion();

    /// @dev Throws an error if the parties' list is empty.
    error EEmptyParties();

    /// @dev Throws an error if the APY is invalid.
    error EInvalidAPY();

    /// @dev Throws an error if the yield amount is not a positive value.
    error ENoRealYield();

    /// @dev Error: The `deposit` function is called while being paused as the `isDepositPaused` flag is set.
    error EDepositPaused();

    /// @dev Error: The `redeem` function is called while being paused as the `isRedeemPaused` flag is set.
    error ERedeemPaused();

    /// @dev Error: The `requestDeposit` function is called with error in buffer deposit.
    error EDepositInBuffer();

    /// @dev Error: The `deposit` function is called with error in buffer withdraw.
    error EWithdrawFromBuffer();

    /**
     * @dev Process a deposit into the Pools.
     * @param user Depositer address.
     * @param requestId Deposit operation unique identifier.
     * @param value Deposit value.
     */
    function requestDeposit(address user, uint256 requestId, uint256 value) external payable;

    /**
     * @dev Process a deposit into the EigenLayer.
     * @param value Deposit value.
     * @param pubkey Deposit value.
     * @param signature Deposit value.
     * @param depositDataRoot The SHA-256 hash of the SSZ-encoded DepositData object.
     */
    function deposit(
        uint256 value,
        bytes calldata pubkey,
        bytes calldata signature,
        bytes32 depositDataRoot
    ) external;

    /**
     * @dev Returns the formatted total supply of the protocol ETH (TVL).
     * @return res Total ETH supply.
     */
    function totalSupply() external view returns (uint256 res);
}
