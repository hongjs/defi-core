// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BEP20.sol";
import "../tokens/DefiToken.sol";

contract KennelClub is BEP20("KennelClub", "KENNEL"), ReentrancyGuard {
    using SafeMath for uint256;
    DefiToken public defi;

    constructor(DefiToken _defi) {
        defi = _defi;
    }

    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).
    function mint(address _to, uint256 _amount) external onlyOwner nonReentrant {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external onlyOwner nonReentrant {
        _burn(_from, _amount);
    }

    // Safe defi transfer function, just in case if rounding error causes pool to not have enough KennelClubs.
    function safeDefiTransfer(address _to, uint256 _amount) external onlyOwner nonReentrant {
        uint256 defiBal = defi.balanceOf(address(this));
        if (_amount > defiBal) {
            defi.transfer(_to, defiBal);
        } else {
            defi.transfer(_to, _amount);
        }
    }
}
