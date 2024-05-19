// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract Woox {
    string public name = "Woox";
    string public symbol = "WOOX";
    string public standard = "Woox v.0.1";
    uint256 public totalSupply;
    address public ownerOfcontract;
    uint256 public userId;

    address[] public holderToken;

    // events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    //mapping
    mapping(address => TokenHolderInfo) public tokenHolderInfos;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // struct
    struct TokenHolderInfo {
        uint256 tokenId;
        address from;
        address to;
        uint256 totalToken;
        bool tokenHolder;
    }

    // constructor

    constructor(uint256 _initialSupply) {
        ownerOfcontract = msg.sender;
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
    }

    // functions

    function increment() internal {
        userId++;
    }

    function transfer(
        address _to,
        uint256 _value
    ) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);
        increment();

        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;

        TokenHolderInfo storage tokenHolderInfo = tokenHolderInfos[_to];

        tokenHolderInfo.to = _to;
        tokenHolderInfo.from = msg.sender;
        tokenHolderInfo.totalToken = _value;
        tokenHolderInfo.tokenHolder = true;
        tokenHolderInfo.tokenId = userId;

        holderToken.push(_to);

        emit Transfer(msg.sender, _to, _value);

        return true;
    }

    function approve(
        address _spender,
        uint256 _value
    ) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;

        emit Approval(msg.sender, _spender, _value);

        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        require(_value <= balanceOf[_from]);
        require(_value <= allowance[_from][msg.sender]);

        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;

        allowance[_from][msg.sender] -= _value;

        emit Transfer(_from, _to, _value);

        return true;
    }

    function getTokenHolderData(
        address _address
    ) public view returns (uint256, address, address, uint256, bool) {
        return (
            tokenHolderInfos[_address].tokenId,
            tokenHolderInfos[_address].to,
            tokenHolderInfos[_address].from,
            tokenHolderInfos[_address].totalToken,
            tokenHolderInfos[_address].tokenHolder
        );
    }

    function getTokenHolder() public view returns (address[] memory) {
        return holderToken;
    }
}
