//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/lib/contracts/libraries/Babylonian.sol";
import "../../libraries/LowGasSafeMath.sol";
import "../../interfaces/IWETH.sol";
import "../interfaces/IDefiVault.sol";
import "../interfaces/IVaultHelper.sol";

contract DefiVaultHelper is ReentrancyGuard, IVaultHelper {
    using LowGasSafeMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for IDefiVault;

    IUniswapV2Router02 public immutable router;
    IWETH public immutable WETH;
    IERC20 public immutable BUSD;
    IERC20 public immutable USDT;
    uint256 public constant minimumAmount = 1000;
    address[] private wbnbToBusdRoute;
    address[] private wbnbToUsdtRoute;

    constructor(
        address _router,
        address _WETH,
        address _BUSD,
        address _USDT
    ) {
        // Safety checks to ensure WETH token address
        IWETH(_WETH).deposit{value: 0}();
        IWETH(_WETH).withdraw(0);

        router = IUniswapV2Router02(_router);
        WETH = IWETH(_WETH);
        BUSD = IERC20(_BUSD);
        USDT = IERC20(_USDT);

        wbnbToBusdRoute = [_WETH, _BUSD];
        wbnbToUsdtRoute = [_WETH, _BUSD, _USDT];
    }

    receive() external payable {
        assert(msg.sender == address(WETH));
    }

    // Deposit
    function depositFromETH(address vault, uint256 tokenAmountOutMin) external payable override nonReentrant {
        require(msg.value >= minimumAmount, "VaultHelper: Insignificant input amount");

        WETH.deposit{value: msg.value}();

        _swapAndStake(vault, tokenAmountOutMin, address(WETH));
    }

    function depositFromToken(
        address vault,
        address tokenIn,
        uint256 tokenInAmount,
        uint256 tokenAmountOutMin
    ) public override nonReentrant {
        require(tokenInAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        require(
            IERC20(tokenIn).allowance(msg.sender, address(this)) >= tokenInAmount,
            "VaultHelper: Input token is not approved"
        );

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), tokenInAmount);
        _swapAndStake(vault, tokenAmountOutMin, tokenIn);
    }

    // Withdraw
    function withdrawToTokens(address vault, uint256 withdrawAmount) public override nonReentrant {
        (IDefiVault _vault, IUniswapV2Pair _pair) = _getVaultPair(vault);

        IERC20(_vault).safeTransferFrom(msg.sender, address(this), withdrawAmount);
        _vault.withdraw(withdrawAmount);

        if (_pair.token0() != address(WETH) && _pair.token1() != address(WETH)) {
            return _removeLiquidity(address(_pair), msg.sender);
        }

        _removeLiquidity(address(_pair), address(this));

        address[] memory tokens = new address[](2);
        tokens[0] = _pair.token0();
        tokens[1] = _pair.token1();

        _returnAssets(tokens);
    }

    function withdrawToToken(
        address vault,
        uint256 withdrawAmount,
        address desiredToken,
        uint256 desiredTokenOutMin
    ) public override nonReentrant {
        (IDefiVault _vault, IUniswapV2Pair _pair) = _getVaultPair(vault);
        address token0 = _pair.token0();
        address token1 = _pair.token1();
        require(
            token0 == desiredToken || token1 == desiredToken,
            "VaultHelper: desired token not present in liquidity pair"
        );

        _vault.safeTransferFrom(msg.sender, address(this), withdrawAmount);
        _vault.withdraw(withdrawAmount);
        _removeLiquidity(address(_pair), address(this));

        address swapToken = token1 == desiredToken ? token0 : token1;
        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = desiredToken;

        _approveTokenIfNeeded(path[0], address(router));
        router.swapExactTokensForTokens(
            IERC20(swapToken).balanceOf(address(this)),
            desiredTokenOutMin,
            path,
            address(this),
            block.timestamp
        );

        _returnAssets(path);
    }

    function withdrawAllToToken(
        address vault,
        address desiredToken,
        uint256 desiredTokenOutMin
    ) external override {
        uint256 balance = IERC20(vault).balanceOf(msg.sender);
        withdrawToToken(vault, balance, desiredToken, desiredTokenOutMin);
    }

    function withdrawAllToTokens(address vault) external override {
        uint256 balance = IERC20(vault).balanceOf(msg.sender);
        withdrawToTokens(vault, balance);
    }

    // Deposit Prize from Lotto Pot
    function depositWETHFromPrize(
        address vault,
        uint256 wethAmount,
        uint256 tokenAmountOutMin
    ) external override nonReentrant {
        require(wethAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        (, IUniswapV2Pair _pair) = _getVaultPair(vault);

        // If WBNB doesn't exist on a pair, it MUST contains BUSD or USDT,
        // So we swap WBNB from LottoPot to BUSD or USDT instead.
        if (_pair.token0() == address(WETH) || _pair.token1() == address(WETH)) {
            _depositPrizeFromWETH(vault, wethAmount, tokenAmountOutMin);
        } else {
            require(
                IERC20(address(WETH)).allowance(msg.sender, address(this)) >= wethAmount,
                "VaultHelper: WETH token is not approved"
            );
            IERC20(address(WETH)).safeTransferFrom(msg.sender, address(this), wethAmount);
            address _token = address(0);
            address[] memory _swapRoute;
            if (_pair.token0() == address(BUSD) || _pair.token1() == address(BUSD)) {
                _token = address(BUSD);
                _swapRoute = wbnbToBusdRoute;
            } else if (_pair.token0() == address(USDT) || _pair.token1() == address(USDT)) {
                _token = address(USDT);
                _swapRoute = wbnbToUsdtRoute;
            }
            require(_token != address(0), "VaultHelper: Token wasn't BUSD nor USDT");
            _approveTokenIfNeeded(address(WETH), address(router));
            IUniswapV2Router02(router).swapExactTokensForTokens(
                wethAmount,
                0,
                _swapRoute,
                address(this),
                block.timestamp
            );
            uint256 _balance = IERC20(_token).balanceOf(address(this));
            _depositPrizeFromToken(vault, _token, _balance, tokenAmountOutMin);
        }
    }

    function _depositPrizeFromWETH(
        address vault,
        uint256 tokenInAmount,
        uint256 tokenAmountOutMin
    ) internal {
        require(tokenInAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        require(
            IERC20(address(WETH)).allowance(msg.sender, address(this)) >= tokenInAmount,
            "VaultHelper: Input token is not approved"
        );

        IERC20(address(WETH)).safeTransferFrom(msg.sender, address(this), tokenInAmount);

        _swapOnlyAndAddLP(vault, tokenAmountOutMin, address(WETH));

        (IDefiVault _vault, ) = _getVaultPair(vault);
        uint256 _wantBalance = IERC20(_vault.want()).balanceOf(address(this));
        IERC20(_vault.want()).transfer(vault, _wantBalance);
        _vault.earn();
    }

    function _depositPrizeFromToken(
        address vault,
        address tokenIn,
        uint256 tokenInAmount,
        uint256 tokenAmountOutMin
    ) internal {
        require(tokenInAmount >= minimumAmount, "VaultHelper: Insignificant input amount");
        _swapOnlyAndAddLP(vault, tokenAmountOutMin, tokenIn);

        (IDefiVault _vault, ) = _getVaultPair(vault);
        uint256 _wantBalance = IERC20(_vault.want()).balanceOf(address(this));
        IERC20(_vault.want()).transfer(vault, _wantBalance);
        _vault.earn();
    }

    // Others
    function _removeLiquidity(address pair, address to) private {
        IERC20(pair).safeTransfer(pair, IERC20(pair).balanceOf(address(this)));
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pair).burn(to);

        require(amount0 >= minimumAmount, "UniswapV2Router: INSUFFICIENT_A_AMOUNT");
        require(amount1 >= minimumAmount, "UniswapV2Router: INSUFFICIENT_B_AMOUNT");
    }

    function _getVaultPair(address vault) private view returns (IDefiVault _vault, IUniswapV2Pair _pair) {
        _vault = IDefiVault(vault);

        IERC20 pairAddress = _vault.want();
        _pair = IUniswapV2Pair(address(pairAddress));

        require(_pair.factory() == router.factory(), "VaultHelper: Incompatible liquidity pair factory");
    }

    function _swapAndStake(
        address vault,
        uint256 tokenAmountOutMin,
        address tokenIn
    ) private {
        (IDefiVault _vault, IUniswapV2Pair _pair) = _getVaultPair(vault);

        (uint256 reserveA, uint256 reserveB, ) = _pair.getReserves();
        require(reserveA > minimumAmount && reserveB > minimumAmount, "VaultHelper: Liquidity pair reserves too low");

        bool isInputA = _pair.token0() == tokenIn;
        require(isInputA || _pair.token1() == tokenIn, "VaultHelper: Input token not present in liquidity pair");

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = isInputA ? _pair.token1() : _pair.token0();

        uint256 fullInvestment = IERC20(tokenIn).balanceOf(address(this));
        uint256 swapAmountIn;
        if (isInputA) {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveA, reserveB);
        } else {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveB, reserveA);
        }

        _approveTokenIfNeeded(path[0], address(router));
        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            swapAmountIn,
            tokenAmountOutMin,
            path,
            address(this),
            block.timestamp
        );

        _approveTokenIfNeeded(path[1], address(router));
        (, , uint256 amountLiquidity) = router.addLiquidity(
            path[0],
            path[1],
            fullInvestment.sub(swapedAmounts[0]),
            swapedAmounts[1],
            1,
            1,
            address(this),
            block.timestamp
        );

        _approveTokenIfNeeded(address(_pair), address(_vault));
        _vault.deposit(amountLiquidity);

        _vault.safeTransfer(msg.sender, _vault.balanceOf(address(this)));
        _returnAssets(path);
    }

    function _swapOnlyAndAddLP(
        address vault,
        uint256 tokenAmountOutMin,
        address tokenIn
    ) private returns (uint256) {
        (, IUniswapV2Pair _pair) = _getVaultPair(vault);

        (uint256 reserveA, uint256 reserveB, ) = _pair.getReserves();
        require(reserveA > minimumAmount && reserveB > minimumAmount, "VaultHelper: Liquidity pair reserves too low");

        bool isInputA = _pair.token0() == tokenIn;
        require(isInputA || _pair.token1() == tokenIn, "VaultHelper: Input token not present in liquidity pair");

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = isInputA ? _pair.token1() : _pair.token0();

        uint256 fullInvestment = IERC20(tokenIn).balanceOf(address(this));
        uint256 swapAmountIn;
        if (isInputA) {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveA, reserveB);
        } else {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveB, reserveA);
        }

        _approveTokenIfNeeded(path[0], address(router));
        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            swapAmountIn,
            tokenAmountOutMin,
            path,
            address(this),
            block.timestamp
        );

        _approveTokenIfNeeded(path[1], address(router));
        (, , uint256 amountLiquidity) = router.addLiquidity(
            path[0],
            path[1],
            fullInvestment.sub(swapedAmounts[0]),
            swapedAmounts[1],
            1,
            1,
            address(this),
            block.timestamp
        );
        return amountLiquidity;
    }

    function _returnAssets(address[] memory tokens) private {
        uint256 balance;
        for (uint256 i; i < tokens.length; i++) {
            balance = IERC20(tokens[i]).balanceOf(address(this));
            if (balance > 0) {
                if (tokens[i] == address(WETH)) {
                    WETH.withdraw(balance);
                    (bool success, ) = msg.sender.call{value: balance}(new bytes(0));
                    require(success, "VaultHelper: ETH transfer failed");
                } else {
                    IERC20(tokens[i]).safeTransfer(msg.sender, balance);
                }
            }
        }
    }

    function _getSwapAmount(
        uint256 investmentA,
        uint256 reserveA,
        uint256 reserveB
    ) private view returns (uint256 swapAmount) {
        uint256 halfInvestment = investmentA / 2;
        uint256 nominator = router.getAmountOut(halfInvestment, reserveA, reserveB);
        uint256 denominator = router.quote(halfInvestment, reserveA.add(halfInvestment), reserveB.sub(nominator));
        swapAmount = investmentA.sub(Babylonian.sqrt((halfInvestment * halfInvestment * nominator) / denominator));
    }

    function estimateSwap(
        address vault,
        address tokenIn,
        uint256 fullInvestmentIn
    )
        external
        view
        returns (
            uint256 swapAmountIn,
            uint256 swapAmountOut,
            address swapTokenOut
        )
    {
        (, IUniswapV2Pair pair) = _getVaultPair(vault);

        bool isInputA = pair.token0() == tokenIn;
        require(isInputA || pair.token1() == tokenIn, "VaultHelper: Input token not present in liquidity pair");

        (uint256 reserveA, uint256 reserveB, ) = pair.getReserves();
        (reserveA, reserveB) = isInputA ? (reserveA, reserveB) : (reserveB, reserveA);

        swapAmountIn = _getSwapAmount(fullInvestmentIn, reserveA, reserveB);
        swapAmountOut = router.getAmountOut(swapAmountIn, reserveA, reserveB);
        swapTokenOut = isInputA ? pair.token1() : pair.token0();
    }

    function _approveTokenIfNeeded(address token, address spender) private {
        if (IERC20(token).allowance(address(this), spender) == 0) {
            IERC20(token).safeApprove(spender, type(uint256).max);
        }
    }
}
