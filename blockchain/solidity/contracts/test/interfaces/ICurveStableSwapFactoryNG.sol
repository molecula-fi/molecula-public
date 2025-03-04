/* solhint-disable */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICurveStableSwapFactoryNG {
    struct PoolArray {
        address base_pool;
        address implementation;
        address liquidity_gauge;
        address[] coins;
        uint256[] decimals;
        uint256 n_coins;
        uint8[] asset_types;
    }

    struct BasePoolArray {
        address lp_token;
        address[] coins;
        uint256 decimals;
        uint256 n_coins;
        uint8[] asset_types;
    }

    // Events
    event BasePoolAdded(address indexed base_pool);
    event PlainPoolDeployed(address[] coins, uint256 A, uint256 fee, address indexed deployer);
    event MetaPoolDeployed(
        address indexed coin,
        address indexed base_pool,
        uint256 A,
        uint256 fee,
        address indexed deployer
    );
    event LiquidityGaugeDeployed(address indexed pool, address indexed gauge);
    event PoolImplementationSet(uint256 indexed index, address implementation);
    event MetaPoolImplementationSet(uint256 indexed index, address implementation);
    event MathImplementationSet(address implementation);
    event GaugeImplementationSet(address implementation);
    event ViewsImplementationSet(address implementation);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event FeeReceiverUpdated(address indexed pool, address indexed feeReceiver);
    event AssetTypeAdded(uint8 indexed id, string name);

    // View functions
    function admin() external view returns (address);
    function future_admin() external view returns (address);
    function fee_receiver() external view returns (address);
    function pool_list(uint256 index) external view returns (address);
    function pool_count() external view returns (uint256);
    function base_pool_list(uint256 index) external view returns (address);
    function base_pool_count() external view returns (uint256);

    function get_base_pool(address _pool) external view returns (address);
    function get_n_coins(address _pool) external view returns (uint256);
    function get_meta_n_coins(address _pool) external view returns (uint256, uint256);
    function get_coins(address _pool) external view returns (address[] memory);
    function get_underlying_coins(address _pool) external view returns (address[] memory);
    function get_decimals(address _pool) external view returns (uint256[] memory);
    function get_underlying_decimals(address _pool) external view returns (uint256[] memory);
    function get_metapool_rates(address _pool) external view returns (uint256[] memory);
    function get_balances(address _pool) external view returns (uint256[] memory);
    function get_underlying_balances(address _pool) external view returns (uint256[] memory);
    function get_A(address _pool) external view returns (uint256);
    function get_fees(address _pool) external view returns (uint256, uint256);
    function get_admin_balances(address _pool) external view returns (uint256[] memory);
    function get_coin_indices(
        address _pool,
        address _from,
        address _to
    ) external view returns (int128, int128, bool);
    function get_gauge(address _pool) external view returns (address);
    function get_implementation_address(address _pool) external view returns (address);
    function is_meta(address _pool) external view returns (bool);
    function get_pool_asset_types(address _pool) external view returns (uint8[] memory);

    function find_pool_for_coins(
        address _from,
        address _to,
        uint256 i
    ) external view returns (address);

    // Pool deployers
    function deploy_plain_pool(
        string memory _name,
        string memory _symbol,
        address[] memory _coins,
        uint256 _A,
        uint256 _fee,
        uint256 _offpeg_fee_multiplier,
        uint256 _ma_exp_time,
        uint256 _implementation_idx,
        uint8[] memory _asset_types,
        bytes4[] memory _method_ids,
        address[] memory _oracles
    ) external returns (address);

    function deploy_metapool(
        address _base_pool,
        string memory _name,
        string memory _symbol,
        address _coin,
        uint256 _A,
        uint256 _fee,
        uint256 _offpeg_fee_multiplier,
        uint256 _ma_exp_time,
        uint256 _implementation_idx,
        uint8 _asset_type,
        bytes4 _method_id,
        address _oracle
    ) external returns (address);

    function deploy_gauge(address _pool) external returns (address);

    // Admin functions
    function add_base_pool(
        address _base_pool,
        address _base_lp_token,
        uint8[] memory _asset_types,
        uint256 _n_coins
    ) external;
    function set_pool_implementations(uint256 _index, address _implementation) external;
    function set_metapool_implementations(uint256 _index, address _implementation) external;
    function set_math_implementation(address _implementation) external;
    function set_gauge_implementation(address _implementation) external;
    function set_views_implementation(address _implementation) external;
    function commit_transfer_ownership(address _addr) external;
    function accept_transfer_ownership() external;
    function set_fee_receiver(address _pool, address _fee_receiver) external;
    function add_asset_type(uint8 _id, string memory _name) external;
}
