# Molecula monorepo

#### Global packages

We use `yarn` v1 to manage dependencies.

If you don't have it, use `curl --compressed -o- -L https://yarnpkg.com/install.sh | bash` to install.

It might be necessary to install `npx` globally, if you still haven't just run:

```sh
yarn global add npx
```

This project has some sensitive data including configuration keys. To encrypt it we use [git-secret](https://git-secret.io). A recommended way to install it on Mac is using **Homebrew**:

```sh
brew install git-secret
```

Install the Terraform CLI with **Homebrew** to run **website** package:

```sh
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

_N.B. Before the next step, please ensure you have access to encrypted data by giving your [GPG public key](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key) and a USER_ID (such as a key ID, a full fingerprint, an email address, or anything else that uniquely identifies that key to GPG) to any project contributor who can provide such access._

Besides, you should have [Docker](https://hub.docker.com/) installed for your operating system to run the server locally

#### Setup

-   Now you are ready to clone the project:

```sh
git clone git@github.com:molecula-io/molecula-public.git --recurse-submodules
```

-   Install all the required dependencies using:

```sh
yarn install
python3 -m pip install slither-analyzer
```

-   To read the sensitive data you will need to run the following command:

```sh
yarn secret:reveal
```

-   To compile the smart-contracts and deal with them using TypeScript run the following:

```sh
yarn turbo run compile
```

-   Finally generate the types for GraphQL schemes:

```sh
yarn turbo run gql:generate
```

#### Reinstallation

There is also a shortcut script to reinstall all the dependencies, to decrypt the sensitive project data and to generate the types:

```sh
yarn reinstall
```
