/* solhint-disable, prettier-ignore*/
// SPDX-License-Identifier: MIT

/**
 * link to original contract https://tronscan.io/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t/code
 */

// solhint-disable-next-line compiler-version
pragma solidity ^0.4.18;

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

contract Migrations {
    address public owner;
    // solhint-disable-next-line var-name-mixedcase
    uint256 public last_completed_migration;

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function Migrations() public {
        owner = msg.sender;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }

    function upgrade(address newAddress) public restricted {
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(last_completed_migration);
    }
}

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    function Ownable() public {
        owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        // solhint-disable-next-line reason-string
        require(msg.sender == owner);
        _;
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        // solhint-disable-next-line reason-string
        require(newOwner != address(0));
        OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is Ownable {
    event Pause();
    event Unpause();

    bool public paused = false;

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        // solhint-disable-next-line reason-string
        require(!paused);
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        // solhint-disable-next-line reason-string
        require(paused);
        _;
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() public onlyOwner whenNotPaused {
        paused = true;
        Pause();
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() public onlyOwner whenPaused {
        paused = false;
        Unpause();
    }
}

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
    function totalSupply() public constant returns (uint256);
    function balanceOf(address who) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
    using SafeMath for uint256;

    // solhint-disable-next-line private-vars-leading-underscore, state-visibility
    mapping(address => uint256) balances;

    /**
     * @dev transfer token for a specified address
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value) public returns (bool) {
        // solhint-disable-next-line reason-string
        require(_to != address(0));
        // solhint-disable-next-line reason-string
        require(_value <= balances[msg.sender]);

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _owner The address to query the the balance of.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }
}

contract BlackList is Ownable {
    /////// Getter to allow the same blacklist to be used also by other contracts (including upgraded Tether) ///////
    function getBlackListStatus(address _maker) external constant returns (bool) {
        return isBlackListed[_maker];
    }

    mapping(address => bool) public isBlackListed;

    function addBlackList(address _evilUser) public onlyOwner {
        isBlackListed[_evilUser] = true;
        AddedBlackList(_evilUser);
    }

    function removeBlackList(address _clearedUser) public onlyOwner {
        isBlackListed[_clearedUser] = false;
        RemovedBlackList(_clearedUser);
    }

    event AddedBlackList(address indexed _user);

    event RemovedBlackList(address indexed _user);
}

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {
    // solhint-disable-next-line private-vars-leading-underscore
    mapping(address => mapping(address => uint256)) internal allowed;

    /**
     * @dev Transfer tokens from one address to another
     * @param _from address The address which you want to send tokens from
     * @param _to address The address which you want to transfer to
     * @param _value uint256 the amount of tokens to be transferred
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        // solhint-disable-next-line reason-string
        require(_to != address(0));
        // solhint-disable-next-line reason-string
        require(_value <= balances[_from]);
        // solhint-disable-next-line private-vars-leading-underscore, reason-string
        require(_value <= allowed[_from][msg.sender]);

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        Transfer(_from, _to, _value);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     *
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param _spender The address which will spend the funds.
     * @param _value The amount of tokens to be spent.
     */
    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * @param _owner address The address which owns the funds.
     * @param _spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed[_owner][_spender];
    }

    /**
     * approve should be called when allowed[_spender] == 0. To increment
     * allowed value is better to use this function to avoid 2 calls (and wait until
     * the first transaction is mined)
     * From MonolithDAO Token.sol
     */
    function increaseApproval(address _spender, uint256 _addedValue) public returns (bool) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }
}

contract StandardTokenWithFees is StandardToken, Ownable {
    // Additional variables for use if transaction fees ever became necessary
    uint256 public basisPointsRate = 0;
    uint256 public maximumFee = 0;
    // solhint-disable-next-line private-vars-leading-underscore, state-visibility
    uint256 constant MAX_SETTABLE_BASIS_POINTS = 20;
    // solhint-disable-next-line private-vars-leading-underscore, state-visibility
    uint256 constant MAX_SETTABLE_FEE = 50;

    string public name;
    string public symbol;
    uint8 public decimals;
    // solhint-disable-next-line private-vars-leading-underscore
    uint256 public _totalSupply;

    uint256 public constant MAX_UINT = 2 ** 256 - 1;

    // solhint-disable-next-line private-vars-leading-underscore, func-visibility
    function calcFee(uint256 _value) public constant returns (uint256) {
        uint256 fee = (_value.mul(basisPointsRate)).div(10000);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        return fee;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        // solhint-disable-next-line private-vars-leading-underscore
        uint256 fee = calcFee(_value);
        uint256 sendAmount = _value.sub(fee);

        super.transfer(_to, sendAmount);
        if (fee > 0) {
            super.transfer(owner, fee);
        }
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        // solhint-disable-next-line reason-string
        require(_to != address(0));
        // solhint-disable-next-line reason-string
        require(_value <= balances[_from]);
        // solhint-disable-next-line reason-string
        require(_value <= allowed[_from][msg.sender]);

        // solhint-disable-next-line private-vars-leading-underscore
        uint256 fee = calcFee(_value);
        uint256 sendAmount = _value.sub(fee);

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(sendAmount);
        if (allowed[_from][msg.sender] < MAX_UINT) {
            allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        }
        Transfer(_from, _to, sendAmount);
        if (fee > 0) {
            balances[owner] = balances[owner].add(fee);
            Transfer(_from, owner, fee);
        }
        return true;
    }

    function setParams(uint256 newBasisPoints, uint256 newMaxFee) public onlyOwner {
        // Ensure transparency by hardcoding limit beyond which fees can never be added
        // solhint-disable-next-line private-vars-leading-underscore, reason-string
        require(newBasisPoints < MAX_SETTABLE_BASIS_POINTS);
        // solhint-disable-next-line private-vars-leading-underscore, reason-string
        require(newMaxFee < MAX_SETTABLE_FEE);

        basisPointsRate = newBasisPoints;
        maximumFee = newMaxFee.mul(uint256(10) ** decimals);

        Params(basisPointsRate, maximumFee);
    }

    // Called if contract ever adds fees
    event Params(uint256 feeBasisPoints, uint256 maxFee);
}

contract UpgradedStandardToken is StandardToken {
    // those methods are called by the legacy contract
    // and they must ensure msg.sender to be the contract address
    // solhint-disable-next-line private-vars-leading-underscore
    uint256 public _totalSupply;
    function transferByLegacy(address from, address to, uint256 value) public returns (bool);
    function transferFromByLegacy(
        address sender,
        address from,
        address spender,
        uint256 value
    ) public returns (bool);
    function approveByLegacy(address from, address spender, uint256 value) public returns (bool);
    function increaseApprovalByLegacy(
        address from,
        address spender,
        uint256 addedValue
    ) public returns (bool);
    function decreaseApprovalByLegacy(
        address from,
        address spender,
        uint256 subtractedValue
    ) public returns (bool);
}

contract MockUsdtTron is Pausable, StandardTokenWithFees, BlackList {
    address public upgradedAddress;
    bool public deprecated;

    //  The contract can be initialized with a number of tokens
    //  All the tokens are deposited to the owner address
    //
    // @param _balance Initial supply of the contract
    // @param _name Token Name
    // @param _symbol Token symbol
    // @param _decimals Token decimals
    // solhint-disable-next-line func-name-mixedcase
    function TetherToken(
        uint256 _initialSupply,
        string _name,
        string _symbol,
        uint8 _decimals
    ) public {
        // solhint-disable-next-line private-vars-leading-underscore
        _totalSupply = _initialSupply;
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        balances[owner] = _initialSupply;
        deprecated = false;
    }

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
        // solhint-disable-next-line reason-string
        require(!isBlackListed[msg.sender]);
        if (deprecated) {
            return UpgradedStandardToken(upgradedAddress).transferByLegacy(msg.sender, _to, _value);
        } else {
            return super.transfer(_to, _value);
        }
    }

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public whenNotPaused returns (bool) {
        // solhint-disable-next-line reason-string
        require(!isBlackListed[_from]);
        if (deprecated) {
            return
                UpgradedStandardToken(upgradedAddress).transferFromByLegacy(
                    msg.sender,
                    _from,
                    _to,
                    _value
                );
        } else {
            return super.transferFrom(_from, _to, _value);
        }
    }

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function balanceOf(address who) public constant returns (uint256) {
        if (deprecated) {
            return UpgradedStandardToken(upgradedAddress).balanceOf(who);
        } else {
            return super.balanceOf(who);
        }
    }

    // Allow checks of balance at time of deprecation
    function oldBalanceOf(address who) public constant returns (uint256) {
        if (deprecated) {
            return super.balanceOf(who);
        }
    }

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function approve(address _spender, uint256 _value) public whenNotPaused returns (bool) {
        if (deprecated) {
            return
                UpgradedStandardToken(upgradedAddress).approveByLegacy(
                    msg.sender,
                    _spender,
                    _value
                );
        } else {
            return super.approve(_spender, _value);
        }
    }

    function increaseApproval(
        address _spender,
        uint256 _addedValue
    ) public whenNotPaused returns (bool) {
        if (deprecated) {
            return
                UpgradedStandardToken(upgradedAddress).increaseApprovalByLegacy(
                    msg.sender,
                    _spender,
                    _addedValue
                );
        } else {
            return super.increaseApproval(_spender, _addedValue);
        }
    }

    function decreaseApproval(
        address _spender,
        uint256 _subtractedValue
    ) public whenNotPaused returns (bool) {
        if (deprecated) {
            return
                UpgradedStandardToken(upgradedAddress).decreaseApprovalByLegacy(
                    msg.sender,
                    _spender,
                    _subtractedValue
                );
        } else {
            return super.decreaseApproval(_spender, _subtractedValue);
        }
    }

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function allowance(
        address _owner,
        address _spender
    ) public constant returns (uint256 remaining) {
        if (deprecated) {
            return StandardToken(upgradedAddress).allowance(_owner, _spender);
        } else {
            return super.allowance(_owner, _spender);
        }
    }

    // deprecate current contract in favour of a new one
    function deprecate(address _upgradedAddress) public onlyOwner {
        // solhint-disable-next-line reason-string
        require(_upgradedAddress != address(0));
        deprecated = true;
        upgradedAddress = _upgradedAddress;
        Deprecate(_upgradedAddress);
    }

    // deprecate current contract if favour of a new one
    function totalSupply() public constant returns (uint256) {
        if (deprecated) {
            return StandardToken(upgradedAddress).totalSupply();
        } else {
            // solhint-disable-next-line private-vars-leading-underscore
            return _totalSupply;
        }
    }

    // Issue a new amount of tokens
    // these tokens are deposited into the owner address
    //
    // @param _amount Number of tokens to be issued
    function issue(address to, uint256 amount) public {
        balances[to] = balances[to].add(amount);
        // solhint-disable-next-line private-vars-leading-underscore
        _totalSupply = _totalSupply.add(amount);
        Issue(amount);
        Transfer(address(0), to, amount);
    }

    // Redeem tokens.
    // These tokens are withdrawn from the owner address
    // if the balance must be enough to cover the redeem
    // or the call will fail.
    // @param _amount Number of tokens to be issued
    function redeem(uint256 amount) public onlyOwner {
        // solhint-disable-next-line private-vars-leading-underscore
        _totalSupply = _totalSupply.sub(amount);
        balances[owner] = balances[owner].sub(amount);
        Redeem(amount);
        Transfer(owner, address(0), amount);
    }

    function destroyBlackFunds(address _blackListedUser) public onlyOwner {
        // solhint-disable-next-line reason-string
        require(isBlackListed[_blackListedUser]);
        uint256 dirtyFunds = balanceOf(_blackListedUser);
        balances[_blackListedUser] = 0;
        // solhint-disable-next-line private-vars-leading-underscore
        _totalSupply = _totalSupply.sub(dirtyFunds);
        DestroyedBlackFunds(_blackListedUser, dirtyFunds);
    }

    event DestroyedBlackFunds(address indexed _blackListedUser, uint256 _balance);

    // Called when new token are issued
    event Issue(uint256 amount);

    // Called when tokens are redeemed
    event Redeem(uint256 amount);

    // Called when contract is deprecated
    event Deprecate(address newAddress);
}
