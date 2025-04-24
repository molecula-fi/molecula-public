# Solidity contracts

## Installing Forge

Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust. It includes forge, a tool for building, testing, and deploying smart contracts. Follow these steps to install Foundry/Forge:

### Install Foundryup (the Foundry installer/updater):

Run the following command in your terminal:

```
curl -L https://foundry.paradigm.xyz | bash
```

Restart your terminal session or source your profile script (e.g., source ~/.bashrc, source ~/.zshrc) to update your PATH with the foundry binaries.

Run foundryup to install or update to the latest version of Forge:

```
foundryup
```

For more detailed installation and configuration instructions, see Foundry's official documentation.

### Running Tests with Forge

After compiling your contracts, you can run the tests with Forge. To do so, execute the following command in your project’s root directory:

```
yarn test:forge
```

This command will compile your contracts, run the tests, and output the results in your terminal.

## Contracts compilation

To compile contracts run:

```
yarn compile
```

## Get coverage table

Use `yarn coverage` to create folder coverage

In terminal you can see the table and you can run local host for ./coverage/index.html

## Contracts deployment

### How to deploy contracts to ethereum (mainnet/sepolia) and tron (mainnet/shasta) networks.

1.  Set `POOL_KEEPER`, `OWNER` and `GUARDIAN_ADDRESS` in [eth sepolia config](./configs/ethereum/sepoliaTyped.ts),
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
    yarn migrate:nitrogen:pool:[test|beta]
    ```

### How to deploy and setup Router and RouterAgent

1. Deploy Router:

    ```
    yarn deploy:router:test
    ```

2. Deploy RouterAgent and set ERC20 token address :

    ```
    yarn deploy:routerAgent:test --token-name <TOKEN_NAME> --token <TOKEN_ADDRESS>
    ```

3. Set correct owner in RouterAgent and Router

    ```
    yarn set:nitrogen:owner:[test|beta|production]
    ```

4. Add RouterAgent in Router and SupplyManager and set Router as owner in RebaseToken

    ```
    yarn set:nitrogen:setupRouter:test --min-deposit-value <minDepositValue> --min-redeem-shares <minRedeemShares> --token-name <TokenName>
    ```

    `--min-deposit-value` - Minimal deposit value set in Router for the token that RouterAgent work with.
    `--min-redeem-shares` - Minimal redeem shares (in mUSD).
    `--token-name` - Token name that RouterAgent work with.

### How to migrate from `AgentAccountant` to `AccountantAgent` contract.

1. Deploy `AccountantAgent` contract.

    ```
    yarn deploy:agent:[test|beta|production]
    ```

2. Migrate from `AgentAccountant` to `AccountantAgent` contract.

    ```
    yarn migrate:nitrogen:agent:[test|beta] --mpv [1.0|1.1]
    ```

    In version 1.0 `MoleculaPool` contract is used.  
    In version 1.1 `MoleculaPoolTreasury` contract is used.

### How to deploy wmUSD and lmUSD contracts.

    ```
    yarn deploy:wmUSD:lmUSD:test
    ```
