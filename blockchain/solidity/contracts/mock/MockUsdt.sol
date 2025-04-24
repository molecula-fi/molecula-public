// SPDX-License-Identifier: MIT
/* solhint-disable */
pragma solidity ^0.8.22;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    // For testing, you might want to mint tokens.
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function decimals() public pure override(ERC20) returns (uint8) {
        return 6;
    }
}
