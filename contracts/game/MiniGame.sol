// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./DefiGame.sol";

contract MiniGame is DefiGame, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public currentRoomNo = 1;
    uint256 public nextWinnerDrawRoomNo = 1;
    uint256 public defiCostPerSeat;
    uint256 public busdCostPerSeat;
    uint8 public immutable maxSeat = 16;
    uint256 public minimumSeatToImmediatelyBeginRound = 4;

    address public feeCollectorAddress;
    address public platformReserveAddress;
    address public godfatherPrizeAddress;
    address public puppyPrizeAddress;
    address public drawWinnerAddress;
    uint8 public feeCollectorRatio;
    uint8 public platformReserveRatio;
    uint8 public godfatherPrizeRatio;
    uint8 public puppyPrizeRatio;

    mapping(uint256 => address[16]) public sitAddress;
    mapping(uint256 => mapping(address => uint8[])) public addressSitQuantity;
    mapping(uint256 => mapping(address => bool)) public isAddressClaimedPrize;
    mapping(uint256 => uint8) public totalSit;
    mapping(uint256 => uint8) public winner;

    mapping(uint256 => mapping(address => bool)) public claimedWonPrize;

    event NewRoomCreated(uint256 roomNo);
    event SitEvent(address indexed sender, uint256 roomNo, uint8[] position);
    event WonEvent(address indexed sender, uint256 roomNo, uint8 position);
    event ClaimPrizeEvent(address indexed sender, uint256 roomNo, uint8 lose, uint8 won);
    event UpdateDrawWinner(address winnerDrawer);
    event UpdateCost(uint256 _defiCostPerSeat, uint256 _busdCostPerSeat);
    event UpdateMinimumSeatToImmediatelyBeginRound(uint256 _minimumSeatToImmediatelyBeginRound);
    event UpdateFeeCollector(
        address feeCollectorAddress,
        address platformReserveAddress,
        address godfatherPrizeAddress,
        address puppyPrizeAddress
    );
    event UpdateFeeCollectorRatio(
        uint8 feeCollectorRatio,
        uint8 platformReserveRatio,
        uint8 godfatherPrizeRatio,
        uint8 puppyPrizeRatio
    );

    constructor(
        GodfatherStorage _godfatherStorage,
        PuppyStorage _puppyStorage,
        IBEP20 _defiAddress,
        IBEP20 _busdAddress
    ) {
        godfatherStorage = _godfatherStorage;
        puppyStorage = _puppyStorage;
        defiToken = _defiAddress;
        busdToken = _busdAddress;
        defiCostPerSeat = 200 ether;
        busdCostPerSeat = 39 ether;

        feeCollectorAddress = msg.sender;
        platformReserveAddress = msg.sender;
        godfatherPrizeAddress = msg.sender;
        puppyPrizeAddress = msg.sender;
        drawWinnerAddress = msg.sender;
        feeCollectorRatio = 40;
        platformReserveRatio = 10;
        godfatherPrizeRatio = 10;
        puppyPrizeRatio = 40;
    }

    function setDrawWinner(address winnerDrawer) external onlyOwner {
        drawWinnerAddress = winnerDrawer;

        emit UpdateDrawWinner(drawWinnerAddress);
    }

    function setCost(uint256 _defiCostPerSeat, uint256 _busdCostPerSeat) public onlyOwner {
        defiCostPerSeat = _defiCostPerSeat;
        busdCostPerSeat = _busdCostPerSeat;

        emit UpdateCost(defiCostPerSeat, busdCostPerSeat);
    }

    function setMinimumSeatToImmediatelyBeginRound(uint256 _minimumSeatToImmediatelyBeginRound) public onlyOwner {
        minimumSeatToImmediatelyBeginRound = _minimumSeatToImmediatelyBeginRound;

        emit UpdateMinimumSeatToImmediatelyBeginRound(minimumSeatToImmediatelyBeginRound);
    }

    function getAddressSitQuantityLength(uint256 roomNo, address sitterAddress) public view returns (uint8) {
        return uint8(addressSitQuantity[roomNo][sitterAddress].length);
    }

    function sitWithDefi(uint8 sitQuantity, uint8[] memory sitPosition) external {
        uint256 totalCost = sitQuantity * defiCostPerSeat;
        collectFee(defiToken, totalCost);
        feeDistribute(defiToken, totalCost);

        sit(sitQuantity, sitPosition);
    }

    function sitWithBUSD(uint8 sitQuantity, uint8[] memory sitPosition) external {
        uint256 totalCost = sitQuantity * busdCostPerSeat;
        collectFee(busdToken, totalCost);
        feeDistribute(busdToken, totalCost);

        sit(sitQuantity, sitPosition);
    }

    function sit(uint8 sitQuantity, uint8[] memory sitPosition) private nonReentrant {
        uint8 maxLoopLength = sitQuantity;
        require(totalSit[currentRoomNo] + sitQuantity <= maxSeat, "MiniGame: E1");
        if (sitPosition.length > 0) {
            require(sitQuantity == uint8(sitPosition.length), "MiniGame: E2");
            maxLoopLength = uint8(sitPosition.length);
        }
        uint8[] memory confirmSitPosition = new uint8[](maxLoopLength);
        uint8 willSitAtPosition = 0;
        uint8 sitSuccess = 0;
        for (uint8 i = 0; i < maxSeat; i++) {
            //uint8 willSitAtPosition=(sitPosition.length==0 ? 1 : 0 );
            //uint256 q = p % 2 != 0 ? a : b;
            if (sitPosition.length == 0) {
                if (sitAddress[currentRoomNo][i] == address(0)) {
                    willSitAtPosition = i;
                } else {
                    continue;
                }
            } else {
                require(sitPosition[i] < maxSeat, "MiniGame: GTE16");
                if (sitAddress[currentRoomNo][sitPosition[i]] == address(0)) {
                    willSitAtPosition = sitPosition[i];
                } else {
                    revert("MiniGame: DUPLICATE");
                }
            }
            sitAddress[currentRoomNo][willSitAtPosition] = msg.sender;
            addressSitQuantity[currentRoomNo][msg.sender].push(willSitAtPosition);
            confirmSitPosition[sitSuccess] = willSitAtPosition;

            totalSit[currentRoomNo]++;
            sitSuccess++;

            if (sitSuccess == maxLoopLength) {
                emit SitEvent(msg.sender, currentRoomNo, confirmSitPosition);
                break;
            }
        }
        if (totalSit[currentRoomNo] == maxSeat) {
            //printSitAddress(currentRoomNo);
            createNewRoom();
        }
    }

    function createNewRoom() private {
        currentRoomNo++;

        emit NewRoomCreated(currentRoomNo);
    }

    function drawWinner(uint256 salt) external nonReentrant {
        require(drawWinnerAddress == msg.sender, "MiniGame: UnAuthorized Drawer");
        require(nextWinnerDrawRoomNo <= currentRoomNo - 1, "MiniGame: WinnerDraw cannot exceed currentRoomNo");
        winner[nextWinnerDrawRoomNo] = random(salt);

        emit WonEvent(
            sitAddress[nextWinnerDrawRoomNo][winner[nextWinnerDrawRoomNo]],
            currentRoomNo,
            winner[nextWinnerDrawRoomNo]
        );
        nextWinnerDrawRoomNo++;
    }

    function immediatelyBeginRound() external nonReentrant {
        require(
            getAddressSitQuantityLength(currentRoomNo, msg.sender) >= minimumSeatToImmediatelyBeginRound,
            "MiniGame: Need at Least 4 Seats"
        );
        createNewRoom();
    }

    function random(uint256 salt) private view returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(block.timestamp, salt))) % maxSeat);
    }

    function claimWonPrize(uint8 wonRoomNo) public nonReentrant {
        require(wonRoomNo <= nextWinnerDrawRoomNo - 1, "MiniGame: WonRoomNo is greater than current");
        require(!isAddressClaimedPrize[wonRoomNo][msg.sender], "MiniGame: User already cliamed.");
        uint8 sitQuantity = getAddressSitQuantityLength(wonRoomNo, msg.sender);
        require(sitQuantity > 0, "MiniGame: No Seats Found");

        uint8 win = 0;
        uint8 lose = 0;
        uint8 winnerNo = winner[wonRoomNo];
        for (uint8 i = 0; i < sitQuantity; i++) {
            if (addressSitQuantity[wonRoomNo][msg.sender][i] == winnerNo) {
                win++;
            } else {
                lose++;
            }
        }

        if (win > 0) {
            mintPuppy();
        }
        if (lose > 0) {
            mintGodfather(0, lose);
        }
        isAddressClaimedPrize[wonRoomNo][msg.sender] = true;
        emit ClaimPrizeEvent(msg.sender, wonRoomNo, lose, win);
    }

    function mintGodfather(uint256 rarity, uint256 quantity) private returns (uint256[] memory) {
        uint256[] memory tokenIds = godfatherStorage.bulkMint(msg.sender, rarity, quantity);
        return tokenIds;
    }

    function mintPuppy() private returns (uint256) {
        uint256 tokenId = puppyStorage.mint(msg.sender);
        return tokenId;
    }

    function feeDistribute(IBEP20 _token, uint256 _amount) private {
        uint256 balance = _token.balanceOf(address(this));
        require(balance >= _amount, "MiniGame: INSUFFICIENT_BALANCE");

        uint256 _feeCollectorAmount = _amount.div(100).mul(feeCollectorRatio);
        uint256 _platformReserveAmount = _amount.div(100).mul(platformReserveRatio);
        uint256 _godfatherPrizeAmount = _amount.div(100).mul(godfatherPrizeRatio);
        uint256 _puppyPrizeAmount = _amount.div(100).mul(puppyPrizeRatio);

        TransferHelper.safeTransfer(address(_token), feeCollectorAddress, _feeCollectorAmount);
        TransferHelper.safeTransfer(address(_token), platformReserveAddress, _platformReserveAmount);
        TransferHelper.safeTransfer(address(_token), godfatherPrizeAddress, _godfatherPrizeAmount);
        TransferHelper.safeTransfer(address(_token), puppyPrizeAddress, _puppyPrizeAmount);
    }

    function setFeeCollectorAddress(
        address _feeCollectorAddress,
        address _platformReserveAddress,
        address _godfatherPrizeAddress,
        address _puppyPrizeAddress
    ) external onlyOwner nonReentrant {
        if (_feeCollectorAddress != address(0)) feeCollectorAddress = _feeCollectorAddress;
        if (_platformReserveAddress != address(0)) platformReserveAddress = _platformReserveAddress;
        if (_godfatherPrizeAddress != address(0)) godfatherPrizeAddress = _godfatherPrizeAddress;
        if (_puppyPrizeAddress != address(0)) puppyPrizeAddress = _puppyPrizeAddress;

        emit UpdateFeeCollector(
            _feeCollectorAddress,
            _platformReserveAddress,
            _godfatherPrizeAddress,
            _puppyPrizeAddress
        );
    }

    function setFeeCollectorRatio(
        uint8 _feeCollectorRatio,
        uint8 _platformReserveRatio,
        uint8 _godfatherPrizeRatio,
        uint8 _puppyPrizeRatio
    ) external onlyOwner nonReentrant {
        uint8 totalRatio = _feeCollectorRatio + _platformReserveRatio + _godfatherPrizeRatio + _puppyPrizeRatio;
        require(totalRatio == 100, "MiniGame: Incorrect Ratio, total must equals 100");

        feeCollectorRatio = _feeCollectorRatio;
        platformReserveRatio = _platformReserveRatio;
        godfatherPrizeRatio = _godfatherPrizeRatio;
        puppyPrizeRatio = _puppyPrizeRatio;

        emit UpdateFeeCollectorRatio(feeCollectorRatio, platformReserveRatio, godfatherPrizeRatio, puppyPrizeRatio);
    }
}
