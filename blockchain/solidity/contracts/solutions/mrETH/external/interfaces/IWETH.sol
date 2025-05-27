// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

interface IWETH {
    /// ========================== FUNCTIONS =====================================

    /**
     * @dev Moves a `msg.value` amount of ETH tokens msg.sender to WETH amount.
     *
     * Emits a {Deposit} event.
     */
    function deposit() external payable;

    /**
     * @dev Moves a `wad` amount of WETH tokens msg.sender to ETH amount.
     *
     * Emits a {Withdrawal} event.
     */
    function withdraw(uint256 wad) external;

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `wad` amount of tokens from the caller's account to `dst`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address dst, uint256 wad) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `wad` amount of tokens as the allowance of `guy` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the guy's allowance to 0 and set the
     * desired wad afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address guy, uint256 wad) external returns (bool);

    /**
     * @dev Moves a `wad` amount of tokens src `src` to `dst` using the
     * allowance mechanism. `wad` is then deducted src the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address src, address dst, uint256 wad) external returns (bool);
}
