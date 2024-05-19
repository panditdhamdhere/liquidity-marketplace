// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Woox.sol";

contract ICOWoox {
    // state variables
    address admin;
    Woox public tokenContract;
    uint256 public tokenPrice;
    uint256 public tokenSold;

    // events
    event Sell(address buyer, uint256 amount);

    // constructor
    constructor(Woox _tokenContract, uint256 _tokenPrice) {
        admin = msg.sender;
        tokenContract = _tokenContract;
        tokenPrice = _tokenPrice;
    }

    // functions
    function multiply(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    function buyTokens(uint256 _numberOfTokens) public payable {
        require(msg.value == multiply(_numberOfTokens, tokenPrice));
        require(tokenContract.balanceOf(address(this)) >= _numberOfTokens);
        require(
            tokenContract.transfer(
                msg.sender,
                _numberOfTokens * 1000000000000000000
            )
        );
        tokenSold += _numberOfTokens;
        emit Sell(msg.sender, _numberOfTokens);
    }

    function endSale() public {
        require(msg.sender == admin);
        require(
            tokenContract.transfer(
                admin,
                tokenContract.balanceOf(address(this))
            )
        );
        payable(admin).transfer(address(this).balance);
    }
}
