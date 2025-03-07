# @molecula-monorepo/solidity

## Get coverage table

Use `yarn coverage` to create folder coverage

In terminal you can see the table and you can run local host for ./coverage/index.html

## Contracts deployment

### How to deploy contracts to ethereum (mainnet/sepolia) and tron (mainnet/shasta) networks.

1.  Set `POOL_KEEPER`, `DEPLOYER_ADDRESS`, `OWNER` and `GUARDIAN_ADDRESS` in [eth sepolia config](./configs/ethereum/sepoliaTyped.ts),
    [eth mainnet prod config](./configs/ethereum/mainnetProdTyped.ts) or
    [eth mainnet beta config](./configs/ethereum/mainnetBetaTyped.ts) configs.

    Set `OWNER` in [tron shasta config](./configs/tron/shastaTyped.ts),
    [tron mainnet prod config](./configs/tron/mainnetProdTyped.ts) or
    [tron mainnet beta config](./configs/tron/mainnetBetaTyped.ts)configs.

    To generate ethereum and tron wallet with the same mnemonic you can use [yarn generate:wallet](./package.json).

2.  Deploy core.

    ```
    yarn deploy:core:[test|beta|production] [--nomusde]
    ```

    Use `--nomusde` flag not to deploy mUSDe contract.

    > Note: set a production environment in [.env.production](./.env.production) if needed.

3.  Deploy nitrogen:

    ```
    yarn deploy:nitrogen:[test|beta|production]
    ```

    > Note: set a production environment in [.env.production](./.env.production) if needed.

4.  Deploy carbon: needs to be fixed after carbon contracts refactor

    ```
    yarn deploy:carbon:[test|beta|production]
    ```

    > Note: set a production environment in [.env.production](./.env.production) if needed.

5.  Set correct `owner`, that was set on the first step, in core, nitrogen and carbon solutions:

    ```
    yarn set:core:owner:[test|beta|production]
    yarn set:nitrogen:owner:[test|beta|production]
    yarn set:carbon:owner:[test|beta|production]
    ```

    > Note: set a production environment in [.env.production](./.env.production) if needed.

### How to migrate from `MoleculaPool` to `MoleculaPoolTreasury` contract.

1. Deploy `MoleculaPoolTreasury` contract
    ```
    yarn deploy:pool:[test|beta|production]
    ```
2. `PoolKeeper` should set infinite allowance for `MoleculaPoolTreasury` contract for all tokens from old `MoleculaPool`
   contract.

3. Set new molecula pool in `SupplyManager` contract.
    ```
    yarn migrate:nitrogen:pool:test
    ```

### How to migrate from `AgentAccountant` to `AccountantAgent` contract.

1. Deploy `AccountantAgent` contract.

    ```
    yarn deploy:agent:[test|beta|production]
    ```

2. Migrate from `AgentAccountant` to `AccountantAgent` contract.

    ```
    yarn migrate:nitrogen:agent:test --mpv [1.0|1.1]
    ```

    In version 1.0 `MoleculaPool` contract is used.  
    In version 1.1 `MoleculaPoolTreasury` contract is used.
