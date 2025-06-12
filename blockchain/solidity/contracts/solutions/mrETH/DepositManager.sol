// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Guardian} from "./../../common/pausable/Guardian.sol";
import {DepositManagerStorage, IDelegationManager, IStrategyFactory, IStrategy} from "./DepositManagerStorage.sol";
import {IStrategyManager} from "./external/interfaces/IStrategyManager.sol";
import {IWETH} from "./external/interfaces/IWETH.sol";
import {IBufferInteractor} from "./interfaces/IBufferInteractor.sol";
import {IDepositManager, BeaconChainProofs} from "./interfaces/IDepositManager.sol";

// TO:DO extend IMoleculaPoolV2 after adding eth to corev2
/// @title Deposit Manager.
/// @notice Manages the deposits and pool data.
contract DepositManager is DepositManagerStorage, IDepositManager, Ownable2Step, Guardian {
    using SafeERC20 for IERC20;
    using Address for address;

    /// @dev Throws an error if called with the wrong sender.
    /// @param expectedSender Expected sender.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert EBadSender();
        }
        _;
    }

    /// @dev Check that stake functionality not paused.
    modifier stakeNotPaused() {
        if (isStakePaused) {
            revert EStakePaused();
        }
        _;
    }

    /**
     * @dev Constructor.
     * @param initialOwner_ Smart contract owner address.
     * @param authorizedStaker_ Authorized Staker and Restaker address.
     * @param guardian_ Guardian address that can pause the contract.
     * @param supplyManager_ Address of Supply Manager contract.
     * @param weth_ Wrapped ETH contract address.
     * @param strategyFactory_ Address of StrategyFactory contract.
     * @param delegationManager_ Address of DelegationManager contract.
     */
    constructor(
        address initialOwner_,
        address authorizedStaker_,
        address guardian_,
        address supplyManager_,
        address weth_,
        address strategyFactory_,
        address delegationManager_
    )
        notZeroAddress(initialOwner_)
        notZeroAddress(authorizedStaker_)
        notZeroAddress(guardian_)
        notZeroAddress(supplyManager_)
        notZeroAddress(weth_)
        notZeroAddress(strategyFactory_)
        notZeroAddress(delegationManager_)
        Ownable(initialOwner_)
        Guardian(guardian_)
    {
        authorizedStaker = authorizedStaker_;

        SUPPLY_MANAGER = supplyManager_;
        WETH = weth_;

        STRATEGY_FACTORY = IStrategyFactory(strategyFactory_);
        DELEGATION_MANAGER = IDelegationManager(delegationManager_);

        // slither-disable-next-line unused-return
        DELEGATION_MANAGER.eigenPodManager().createPod();
    }

    /**
     * @dev Initialize function.
     * @param bufferPercent_ Percentage from TVL to be stored in Pools.
     * @param pools_ Array of pools addresses.
     * @param poolData_ Array of PoolData structs.
     * @param auth_ Array of boolean add types.
     */
    function initialize(
        uint32 bufferPercent_,
        address[] calldata pools_,
        PoolData[] calldata poolData_,
        bool[] calldata auth_
    ) external onlyOwner {
        if (initialized) {
            revert EInitialized();
        }

        initialized = true;

        // Set initial buffer percentage.
        _checkPercentage(bufferPercent_);
        bufferPercentage = bufferPercent_;

        _setPools(pools_, poolData_, auth_);
    }

    /// @inheritdoc IDepositManager
    function deposit(
        uint256,
        address token,
        address vault,
        uint256 value
    ) external payable only(SUPPLY_MANAGER) returns (uint256) {
        if (msg.value > 0) {
            if (msg.value != value) {
                revert EIncorrectNativeValue();
            }

            // Convert ETH to WETH
            IWETH(WETH).deposit{value: msg.value}();

            // Call the Pool to deposit the value.
            _depositIntoPools(value);
        } else {
            // Transfer from token vault
            // slither-disable-next-line arbitrary-send-erc20
            IERC20(token).safeTransferFrom(vault, address(this), value);

            if (token == WETH) {
                // Call the Pool to deposit the value.
                _depositIntoPools(value);
            } else {
                // Get strategy manager  contract.
                IStrategyManager strategyManager = DELEGATION_MANAGER.strategyManager();

                // Approve to the Strategy manager contract.
                IERC20(token).forceApprove(address(strategyManager), value);

                // Deposit only whitelisted LRT tokens into the EigenLayer.
                // slither-disable-next-line unused-return
                strategyManager.depositIntoStrategy(getStrategy(token), IERC20(token), value);
            }
        }

        // Emit the request deposit event.
        emit Deposit(token, vault, value);

        return value;
    }

    /// @dev receive ETH function.
    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    /// @inheritdoc IDepositManager
    function stakeNative(
        uint256 value,
        bytes calldata pubkey,
        bytes calldata signature,
        bytes32 depositDataRoot
    ) external only(authorizedStaker) stakeNotPaused {
        // Calculate the actual buffered supply.
        uint256 actualBufferedSupply = _totalBufferedSupply();

        // Revert if the value is greater than the actual buffered supply.
        if (value > actualBufferedSupply) {
            revert ETooHighDepositValue();
        }

        // If the buffer percentage is greater than 0, calculate the max value to deposit.
        if (bufferPercentage > 0) {
            // Calculate the desired allocation to stay in the buffer.
            uint256 desiredAllocationToStayInBuffer = (totalSupply() * bufferPercentage) /
                PERCENTAGE_FACTOR;

            // Check if there is any value to stake available.
            if (actualBufferedSupply < desiredAllocationToStayInBuffer) {
                revert ENoNeedToStake();
            }

            // Calculate the maximum value to deposit.
            uint256 maxValueToDeposit = actualBufferedSupply - desiredAllocationToStayInBuffer;

            // Ensure we can deposit the value.
            if (value > maxValueToDeposit) {
                revert ETooHighDepositValue();
            }
        }

        // Call to withdraw the value from Pools.
        _withdrawFromPools(value);

        // convert WETH amount of value into ETH
        IWETH(WETH).withdraw(value);

        // stake ETH in EigenPod contract
        DELEGATION_MANAGER.eigenPodManager().stake{value: value}(
            pubkey,
            signature,
            depositDataRoot
        );

        // Emit the deposit event.
        emit StakeNative(value, pubkey, signature, depositDataRoot);
    }

    /// @inheritdoc IDepositManager
    function verifyWithdrawalCredentials(
        uint64 beaconTimestamp,
        BeaconChainProofs.StateRootProof calldata stateRootProof,
        uint40[] calldata validatorIndices,
        bytes[] calldata validatorFieldsProofs,
        bytes32[][] calldata validatorFields
    ) external only(authorizedStaker) stakeNotPaused {
        DELEGATION_MANAGER.eigenPodManager().getPod(address(this)).verifyWithdrawalCredentials(
            beaconTimestamp,
            stateRootProof,
            validatorIndices,
            validatorFieldsProofs,
            validatorFields
        );
    }

    /// @inheritdoc IDepositManager
    function delegateTo(
        address operator,
        IDelegationManager.SignatureWithExpiry calldata approverSignatureAndExpiry,
        bytes32 approverSalt
    ) external only(authorizedStaker) stakeNotPaused {
        DELEGATION_MANAGER.delegateTo(operator, approverSignatureAndExpiry, approverSalt);
    }

    /// @inheritdoc IDepositManager
    function redelegate(
        address operator,
        IDelegationManager.SignatureWithExpiry calldata approverSignatureAndExpiry,
        bytes32 approverSalt
    ) external only(authorizedStaker) stakeNotPaused {
        DELEGATION_MANAGER.delegateTo(operator, approverSignatureAndExpiry, approverSalt);
    }

    /// @inheritdoc IDepositManager
    function undelegate()
        external
        only(authorizedStaker)
        returns (bytes32[] memory withdrawalRoots)
    {
        withdrawalRoots = DELEGATION_MANAGER.undelegate(address(this));
    }

    // TO:DO add requestRedeem and redeem

    /// @dev deposits ETH into Pools.
    /// @param value Amount of ETH to deposit.
    function _depositIntoPools(uint256 value) internal {
        uint256 length = poolsArray.length;

        for (uint256 i = 0; i < length; ++i) {
            PoolData memory _poolData = poolData[poolsArray[i]];

            if (_poolData.poolPortion > 0) {
                // calculate amount to deposit to pool by distribution deposit portions.
                uint256 depositValue = (value * _poolData.poolPortion) / PERCENTAGE_FACTOR;

                // Call the Pool to deposit the value.
                _executeDeposit(poolsArray[i], depositValue);
            }
        }
    }

    /// @dev withdraws ETH from Pools.
    /// @param value Amount of ETH to withdraw.
    function _withdrawFromPools(uint256 value) internal {
        uint256 length = poolsArray.length;

        // TODO: calculate the required amount to withdraw from each pool
        // to keep the desired pool proportion allocation.

        // To achieve it you can use the ETH balance of the pool.

        // Once calculated, withdraw the required amount from each pool.
        // TODO: implement it.

        for (uint256 i = 0; i < length; ++i) {
            PoolData memory _poolData = poolData[poolsArray[i]];

            if (_poolData.poolPortion > 0) {
                // calculate amount to withdraw from pool by distribution deposit portions.
                uint256 withdrawValue = (value * _poolData.poolPortion) / PERCENTAGE_FACTOR;

                // Call the Pool to withdraw the value.
                _executeWithdraw(poolsArray[i], withdrawValue);
            }
        }

        // TODO: include any possible remains in the last pool (?).
        // in order to avoid rounding issues.
    }

    /**
     * @dev Getter for the Strategy contract deployed for token.
     * @param token Address of Strategy contract token.
     * @return strategy Address of Strategy contract.
     */
    function getStrategy(address token) public view returns (IStrategy strategy) {
        if (address(strategies[token]) == address(0)) {
            return STRATEGY_FACTORY.deployedStrategies(IERC20(token));
        }
        return strategies[token];
    }

    /// @dev calculates the yield of the .
    /// @return res Total ETH supply.
    function totalSupply() public view returns (uint256) {
        return _totalBufferedSupply() + _totalRestakedSupply();
    }

    /// @dev Calculates the total buffered supply including the yield gained with the increased balances of LP tokens.
    /// @return bufferedTvl Total ETH supply in buffer.
    function _totalBufferedSupply() internal view returns (uint256 bufferedTvl) {
        uint256 length = poolsArray.length;

        // gets all withdrawable tokens from LP
        for (uint256 i = 0; i < length; ++i) {
            address pool = poolsArray[i];
            PoolData memory _poolData = poolData[pool];

            bufferedTvl += IBufferInteractor(_poolData.poolLib).getEthBalance(
                pool,
                _poolData.poolToken,
                address(this)
            );
        }
    }

    /// @dev calculates the yield on the increased balances of staked .
    /// @return restakedTvl Total ETH supply in EigenLayer.
    function _totalRestakedSupply() internal view returns (uint256 restakedTvl) {
        // Get strategy manager  contract.
        IStrategyManager strategyManager = DELEGATION_MANAGER.strategyManager();

        // gets all deposited strategies
        // slither-disable-next-line unused-return
        (IStrategy[] memory _strategies, ) = strategyManager.getDeposits(address(this));

        // length of strategies array
        uint256 length = _strategies.length;

        // Get all withdrawable tokens from EigenLayer
        // TO:DO rewrite to work with reward bearing assets
        for (uint256 i = 0; i < length; ++i) {
            restakedTvl += _strategies[i].userUnderlyingView(address(this));
        }
    }

    /**
     * @dev Validate Percentage.
     * @param percentage All needed percentages.
     */
    function _checkPercentage(uint32 percentage) internal pure {
        if (percentage > PERCENTAGE_FACTOR) {
            revert EInvalidPercentage();
        }
    }

    /**
     * @dev Getter for the Withdrawal Credentials variable.
     * @return withdrawalCredentials bytes.
     */
    function getWithdrawalCredentials() external view returns (bytes memory) {
        return
            abi.encodePacked(
                bytes1(0x01),
                bytes11(0),
                DELEGATION_MANAGER.eigenPodManager().getPod(address(this))
            );
    }

    /**
     * @dev Setter for the Authorized Staker and Restaker in EigenLayer address.
     * @param newAuthorizedStaker New authorized Staker and Restaker address.
     */
    function setAuthorizedStaker(
        address newAuthorizedStaker
    ) external onlyOwner notZeroAddress(newAuthorizedStaker) {
        authorizedStaker = newAuthorizedStaker;
    }

    /**
     * @dev Authorizes a new Pools.
     * @param pools Pool's addresses array.
     * @param newPoolsData array of new pools data.
     * @param auth Array of boolean flags indicating for adding or removing Pool.
     */
    function setPools(
        address[] calldata pools,
        PoolData[] calldata newPoolsData,
        bool[] calldata auth
    ) external onlyOwner {
        uint256 balanceEthToRebalance = _setPools(pools, newPoolsData, auth);
        _rebalanceBuffer(newPoolsData, balanceEthToRebalance);
    }

    /**
     * @dev Authorizes a new Pool.
     * @param pool Pool's address.
     * @param newPoolData PoolData of new pool.
     * @param auth Boolean flag indicating for adding or removing Pool.
     * @return balanceEthToRebalance Amount of ETH withdrawn from the LP.
     */
    function _setPool(
        address pool,
        PoolData memory newPoolData,
        bool auth
    ) internal returns (uint256 balanceEthToRebalance) {
        if (auth) {
            if (poolData[pool].poolPortion == 0) {
                poolsArray.push(pool);
            }

            poolData[pool] = newPoolData;
        } else {
            PoolData memory _poolData = poolData[pool];

            poolsArray[_poolData.poolId] = poolsArray[poolsArray.length - 1];
            // slither-disable-next-line costly-loop
            poolsArray.pop();

            // get actual balance of pool
            balanceEthToRebalance = IBufferInteractor(_poolData.poolLib).getEthBalance(
                pool,
                _poolData.poolToken,
                address(this)
            );

            // withdraws all deleted pool balance
            _executeWithdraw(pool, balanceEthToRebalance);

            delete poolData[pool];
        }
    }

    /**
     * @dev Authorizes a new Pools.
     * @param pools actual Pool's addresses array.
     * @param newPoolsData array of new pools data.
     * @param auth Array of boolean flags indicating for adding or removing Pool.
     * @return balanceEthToRebalance Total amount of ETH withdrawn from the LPs.
     */
    function _setPools(
        address[] memory pools,
        PoolData[] memory newPoolsData,
        bool[] memory auth
    ) internal returns (uint256 balanceEthToRebalance) {
        // length of new poolsArray
        uint256 length = pools.length;

        // validate length of newPoolsData
        if (length != newPoolsData.length || length != auth.length) {
            revert EIncorrectLength();
        }

        // slither-disable-next-line uninitialized-local
        uint256 percentagesSum;

        for (uint256 i = 0; i < length; ++i) {
            balanceEthToRebalance += _setPool(pools[i], newPoolsData[i], auth[i]);

            percentagesSum += newPoolsData[i].poolPortion;

            // poolId must match the position in the array
            if (newPoolsData[i].poolId != i) {
                revert EWrongPoolId();
            }
        }

        // percentagesSum should be equal 100%
        if (percentagesSum > PERCENTAGE_FACTOR) {
            revert EWrongPortion();
        }
    }

    /**
     * @dev Changes poolPortions and rebalance Buffer.
     * @param newPoolsData array of new pools data.
     */
    function rebalanceBuffer(PoolData[] calldata newPoolsData) external onlyOwner {
        _rebalanceBuffer(newPoolsData, 0);
    }

    /**
     * @dev Changes poolPortions and rebalance Buffer.
     * @param newPoolsData array of new pools data.
     * @param extraValue extra value for rebalance.
     */
    function _rebalanceBuffer(PoolData[] calldata newPoolsData, uint256 extraValue) internal {
        // length of new poolsArray
        uint256 length = poolsArray.length;

        // calculate actual buffer tvl
        uint256 bufferTvl = extraValue + totalSupply();

        // create arrays for rebalance calculation
        uint256[] memory expectedPoolsBalances = new uint256[](length);
        uint256[] memory actualPoolsBalances = new uint256[](length);

        for (uint256 i = 0; i < length; ++i) {
            address pool = poolsArray[i];

            // rewrite new poolData
            poolData[pool] = newPoolsData[i];

            // calculate amount to deposit to pool by distribution deposit portions.
            expectedPoolsBalances[i] =
                (bufferTvl * newPoolsData[i].poolPortion) /
                PERCENTAGE_FACTOR;

            actualPoolsBalances[i] = IBufferInteractor(newPoolsData[i].poolLib).getEthBalance(
                pool,
                newPoolsData[i].poolToken,
                address(this)
            );

            // withdraw extra balance of pool
            if (actualPoolsBalances[i] > expectedPoolsBalances[i]) {
                _executeWithdraw(pool, actualPoolsBalances[i] - expectedPoolsBalances[i]);
            }
        }

        // deposit into pools after withdrawing all extra balances
        for (uint256 i = 0; i < length; ++i) {
            if (expectedPoolsBalances[i] > actualPoolsBalances[i]) {
                _executeDeposit(poolsArray[i], expectedPoolsBalances[i] - actualPoolsBalances[i]);
            }
        }
    }

    /**
     * @dev Setter for the bufferPercentage.
     * @param newBufferPercentage Number of new bufferPercentage.
     */
    function setBufferPercentage(uint32 newBufferPercentage) external onlyOwner {
        _checkPercentage(newBufferPercentage);
        bufferPercentage = newBufferPercentage;
    }

    /**
     * @dev Setter Strategy contract for token.
     * @param tokens array of LRT tokens addresses.
     * @param _strategies array of Strategy contracts addresses.
     */
    function addStrategies(
        address[] calldata tokens,
        IStrategy[] calldata _strategies
    ) external onlyOwner {
        uint256 length = tokens.length;

        if (length != _strategies.length) {
            revert EIncorrectLength();
        }

        for (uint256 i = 0; i < length; ++i) {
            strategies[tokens[i]] = _strategies[i];
        }
    }

    // TO:DO remove after eigenlayer integration
    /**
     * @dev Process withdraw ETH from contract.
     * @param amount Amount of ETH to withdraw.
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Process a deposit into LP protocols.
     * @param pool LP protocol address.
     * @param value Deposit value.
     */
    function _executeDeposit(address pool, uint256 value) internal {
        // Approve to the AAVE Pool.
        IERC20(WETH).forceApprove(pool, value);

        // gets calldata for deposit into Pool
        bytes memory data = IBufferInteractor(poolData[pool].poolLib).encodeSupply(
            WETH,
            address(this),
            value
        );

        // slither-disable-next-line unused-return
        pool.functionCall(data);
    }

    /**
     * @dev Process withdraw from LP protocols.
     * @param pool LP protocol address.
     * @param value Amount to withdraw.
     */
    function _executeWithdraw(address pool, uint256 value) internal {
        // gets calldata for withdraw from Pool
        bytes memory data = IBufferInteractor(poolData[pool].poolLib).encodeWithdraw(
            WETH,
            address(this),
            value
        );
        // slither-disable-next-line unused-return
        pool.functionCall(data);
    }

    // should be removed or reorganized
    /**
     * @dev Setter a vault for new added token.
     * @param tokenVault Address of TokenVault contract.
     */
    // solhint-disable-next-line no-empty-blocks
    function addTokenVault(address tokenVault) external {
        // do nothing, need for SupplyManagerV2
    }

    // should be removed or reorganized
    /**
     * @dev Process remove a vault for deleted token.
     * @param tokenVault Address of TokenVault contract.
     */
    // solhint-disable-next-line no-empty-blocks
    function removeTokenVault(address tokenVault) external {
        // do nothing, need for SupplyManagerV2
    }

    /// @dev Set new value for the `isRedeemPaused` flag.
    /// @param newValue New value.
    function _setStakePaused(bool newValue) private {
        if (isStakePaused != newValue) {
            isStakePaused = newValue;
            emit IsStakePausedChanged(newValue);
        }
    }

    /// @dev Pause the `stake` and `delegate` functions.
    function pauseStake() external onlyAuthForPause {
        _setStakePaused(true);
    }

    /// @dev Unpause the `stake` and `delegate` functions.
    function unpauseStake() external onlyOwner {
        _setStakePaused(false);
    }

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        // Transfer ownership to the new owner.
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) {
        // Initiate ownership transfer.
        super.transferOwnership(newOwner);
    }
}
