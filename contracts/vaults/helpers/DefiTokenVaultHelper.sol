//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../../interfaces/IWETH.sol";
import "../interfaces/IDefiVault.sol";
import "../interfaces/IVaultHelperBase.sol";

contract DefiTokenVaultHelper is ReentrancyGuard, IVaultHelperBase {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for IDefiVault;

    IUniswapV2Router02 public immutable router;
    IWETH public immutable WETH;
    uint256 public constant minimumAmount = 1000;
    address[] private wbnbToTokenRoute;

    constructor(address _router, address _WETH) {
        // Safety checks to ensure WETH token address
        IWETH(_WETH).deposit{value: 0}();
        IWETH(_WETH).withdraw(0);

        router = IUniswapV2Router02(_router);
        WETH = IWETH(_WETH);
    }

    // Deposit Prize from Lotto Pot
    function depositWETHFromPrize(
        address vault,
        uint256 wethAmount,
        uint256 tokenAmountOutMin
    ) external override nonReentrant {
        require(wethAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        (, address _token) = _getVaultPair(vault);
        require(_token != address(0), "VaultHelper: Invalid token");
        require(
            IERC20(address(WETH)).allowance(msg.sender, address(this)) >= wethAmount,
            "VaultHelper: WETH token is not approved"
        );
        IERC20(address(WETH)).safeTransferFrom(msg.sender, address(this), wethAmount);

        wbnbToTokenRoute = [address(WETH), _token];
        _approveTokenIfNeeded(address(WETH), address(router));
        IUniswapV2Router02(router).swapExactTokensForTokens(
            wethAmount,
            tokenAmountOutMin,
            wbnbToTokenRoute,
            address(this),
            block.timestamp
        );
        uint256 _balance = IERC20(_token).balanceOf(address(this));
        _depositPrizeFromToken(vault, _balance);
    }

    function _depositPrizeFromToken(address vault, uint256 tokenInAmount) internal {
        require(tokenInAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        (IDefiVault _vault, address token) = _getVaultPair(vault);
        uint256 _wantBalance = IERC20(token).balanceOf(address(this));
        IERC20(_vault.want()).transfer(vault, _wantBalance);
        _vault.earn();
    }

    function _getVaultPair(address vault) private view returns (IDefiVault _vault, address _want) {
        _vault = IDefiVault(vault);
        _want = address(_vault.want());
    }

    function _approveTokenIfNeeded(address token, address spender) private {
        if (IERC20(token).allowance(address(this), spender) == 0) {
            IERC20(token).safeApprove(spender, type(uint256).max);
        }
    }
}
