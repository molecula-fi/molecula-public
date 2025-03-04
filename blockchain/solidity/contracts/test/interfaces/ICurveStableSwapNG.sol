/* solhint-disable */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICurveStableSwapNG {
    // Pool Getters
    function A() external view returns (uint256);
    function A_precise() external view returns (uint256);
    function asset_types(uint256 index) external view returns (uint8);
    function coins(uint256 index) external view returns (address);
    function get_virtual_price() external view returns (uint256);
    function fee() external view returns (uint256);
    function balances(uint256 i) external view returns (uint256);
    function get_balances() external view returns (uint256[] memory);
    function stored_rates() external view returns (uint256[] memory);
    function dynamic_fee(int128 i, int128 j) external view returns (uint256);
    function get_dx(int128 i, int128 j, uint256 dy) external view returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function calc_withdraw_one_coin(uint256 _burn_amount, int128 i) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function price_oracle(uint256 i) external view returns (uint256);
    function D_oracle() external view returns (uint256);
    function get_p(uint256 i) external view returns (uint256);
    function last_price(uint256 i) external view returns (uint256);
    function ema_price(uint256 i) external view returns (uint256);
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    // AMM Functions
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function exchange_received(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy,
        address receiver
    ) external returns (uint256);
    function add_liquidity(
        uint256[] memory amounts,
        uint256 min_mint_amount,
        address receiver
    ) external returns (uint256);
    function remove_liquidity(
        uint256 burn_amount,
        uint256[] memory min_amounts,
        address receiver,
        bool claim_admin_fees
    ) external returns (uint256[] memory);
    function remove_liquidity_one_coin(
        uint256 burn_amount,
        int128 i,
        uint256 min_received,
        address receiver
    ) external returns (uint256);
    function remove_liquidity_imbalance(
        uint256[] memory amounts,
        uint256 max_burn_amount,
        address receiver
    ) external returns (uint256);
    function withdraw_admin_fees() external;

    // Admin Functions
    function ramp_A(uint256 future_A, uint256 future_time) external;
    function stop_ramp_A() external;
    function set_new_fee(uint256 new_fee, uint256 new_offpeg_fee_multiplier) external;
    function set_ma_exp_time(uint256 ma_exp_time, uint256 D_ma_time) external;

    // ERC20 Functions
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool);
}
