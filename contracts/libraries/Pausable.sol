// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
abstract contract Pausable {
    bool private _paused;
    address public admin;

    /**
     * @dev Throws if called by any account other than the admin.
     */
    modifier onlyAdmin() {
        require(admin == msg.sender, "Pausable: caller is not the admin");
        _;
    }

    event Pause(address account);
    event Unpause(address account);

    constructor() {
        _paused = false;
        admin = msg.sender;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev modifier to allow actions only when the contract IS paused
     */
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    /**
     * @dev modifier to allow actions only when the contract IS NOT paused
     */
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    /**
     * @dev called by the admin to pause, triggers stopped state
     */
    function pause() external onlyAdmin whenNotPaused {
        _paused = true;
        emit Pause(admin);
    }

    /**
     * @dev called by the admin to unpause, returns to normal state
     */
    function unpause() external onlyAdmin whenPaused {
        _paused = false;
        emit Unpause(admin);
    }

    /**
     * @dev called by the admin to change new pausable's admin
     */
    function updateAdmin(address _newAdmin) external virtual onlyAdmin {
        admin = _newAdmin;
    }
}
