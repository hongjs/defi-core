// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Adminable is Ownable {
    address private _admin;

    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    constructor() {
        _transferAdmin(msg.sender);
    }

    function admin() public view virtual returns (address) {
        return _admin;
    }

    modifier onlyAdmin() {
        require(admin() == msg.sender, "Adminable: caller is not the admin");
        _;
    }

    function transferAdmin(address newAdmin) external virtual onlyOwner {
        require(newAdmin != address(0), "Ownable: new owner is the zero address");
        _transferAdmin(newAdmin);
    }

    function _transferAdmin(address newAdmin) internal virtual {
        address oldAdmin = _admin;
        _admin = newAdmin;
        emit OwnershipTransferred(oldAdmin, _admin);
    }
}
