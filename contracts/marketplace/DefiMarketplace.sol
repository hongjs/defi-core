// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DefiMarketBase.sol";
import "../libraries/Pausable.sol";
import "../interfaces/IDefiMarketplace.sol";

/// @title Clock listing for non-fungible tokens.
contract DefiMarketplace is Ownable, Pausable, DefiMarketBase, ReentrancyGuard, IDefiMarketplace {
    address public feeCollectorAddress;

    /// @param _ERC20Address - address ERC20 Interface to set listing price.
    /// @param _ERC721Address - address ERC721 Interface for exchange in the Marketplace
    /// @param _feeRate - percent fee the owner takes on each listing, must be between 0-10,000.
    constructor(
        address _ERC20Address,
        address _ERC721Address,
        uint256 _feeRate
    ) {
        require(_feeRate <= 10000);
        ERC20Token = _ERC20Address;
        ERC721Address = _ERC721Address;
        feeRate = _feeRate;
        feeCollectorAddress = msg.sender;
    }

    event onBalanceWithdrawed(address recipient, uint256 amount);
    event onFeeUpdated(uint256 feeRate);
    event onFeeCollectorUpdated(address newAddress);
    event onListingCancelledByAdmin(uint256 tokenId, address seller);
    event onUpdateAdmin(address newAdmin);

    function withdrawBalance() external onlyOwner nonReentrant {
        uint256 balance = getBalance();
        payable(feeCollectorAddress).transfer(address(this).balance);
        IERC20(ERC20Token).transfer(feeCollectorAddress, getBalance());

        emit onBalanceWithdrawed(feeCollectorAddress, balance);
    }

    function updateFee(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 10000, "Marketplace: Fee must less than or equals 10000");
        feeRate = _feeRate;

        emit onFeeUpdated(feeRate);
    }

    function updateFeeCollector(address _feeCollectorAddress) external onlyOwner {
        require(_feeCollectorAddress != address(0), "Marketplace: FeeCollector must not equal address(0)");
        feeCollectorAddress = _feeCollectorAddress;

        emit onFeeCollectorUpdated(feeCollectorAddress);
    }

    function getBalance() public view returns (uint256) {
        return IERC20(ERC20Token).balanceOf(address(this));
    }

    /// @dev Creates and begins a new listing.
    /// @param _tokenId - ID of token to listing, sender must be owner.
    /// @param _startingPrice - Price of item (in wei) at beginning of listing.
    /// @param _endingPrice - Price of item (in wei) at end of listing.
    /// @param _duration - Length of time to move between starting price and ending price (in seconds).
    function createListing(
        uint256 _tokenId,
        uint256 _startingPrice,
        uint256 _endingPrice,
        uint256 _duration
    ) external virtual override whenNotPaused nonReentrant {
        require(_startingPrice == uint256(uint128(_startingPrice)));
        require(_endingPrice == uint256(uint128(_endingPrice)));
        require(_duration == uint256(uint64(_duration)));
        require(_endingPrice <= _startingPrice, "Marketplace: StartPrice must greather or equals EndPrice");

        _escrow(msg.sender, _tokenId);
        Listing memory listing = Listing(
            _tokenId,
            msg.sender,
            uint128(_startingPrice),
            uint128(_endingPrice),
            uint64(_duration),
            uint64(block.timestamp)
        );
        _addListing(_tokenId, listing);
    }

    /// @dev Purchase on an open listing, completing the listing and transferring
    ///  ownership of the NFT if enough KAI is supplied.
    /// @param _tokenId - ID of token to purchase on.
    function purchase(uint256 _tokenId, uint256 _amount) external virtual override whenNotPaused nonReentrant {
        require(IERC20(ERC20Token).transferFrom(msg.sender, address(this), _amount));
        // _purchase will throw if the purchase or funds transfer fails
        _purchase(_tokenId, _amount);
        _transfer(msg.sender, _tokenId);
    }

    /// @dev Cancels an listing that hasn't been won yet.
    ///  Returns the NFT to original owner.
    /// @notice This is a state-modifying function that can
    ///  be called while the contract is paused.
    /// @param _tokenId - ID of token on listing
    function cancelListing(uint256 _tokenId) external virtual override nonReentrant {
        Listing memory listing = getEntryByKey(_tokenId);
        require(_isOnListing(listing), "Marketplace: TokenID is a must on listing");
        address seller = listing.seller;
        require(msg.sender == seller, "Marketplace: CancelListing must calls by seller");
        _cancelListing(_tokenId, seller);
    }

    /// @dev Cancels an listing when the contract is paused.
    ///  Only the owner may do this, and NFTs are returned to
    ///  the seller. This should only be used in emergencies.
    /// @param _tokenId - ID of the NFT on listing to cancel.
    function cancelListingWhenPaused(uint256 _tokenId) external whenPaused onlyAdmin nonReentrant {
        Listing memory listing = getEntryByKey(_tokenId);
        require(_isOnListing(listing), "Marketplace: TokenID is a must on listing");
        _cancelListing(_tokenId, listing.seller);

        emit onListingCancelledByAdmin(_tokenId, listing.seller);
    }

    /// @dev Returns listing info for an NFT on listing.
    /// @param _tokenId - ID of NFT on listing.
    function getListing(uint256 _tokenId)
        external
        view
        returns (
            address seller,
            uint256 startingPrice,
            uint256 endingPrice,
            uint256 duration,
            uint256 startedAt
        )
    {
        Listing memory listing = getEntryByKey(_tokenId);
        require(_isOnListing(listing), "Marketplace: TokenID is a must on listing");
        return (listing.seller, listing.startingPrice, listing.endingPrice, listing.duration, listing.startedAt);
    }

    /// @dev Returns the current price of an listing.
    /// @param _tokenId - ID of the token price we are checking.
    function getCurrentPrice(uint256 _tokenId) external view returns (uint256) {
        Listing memory listing = getEntryByKey(_tokenId);
        require(_isOnListing(listing), "Marketplace: TokenID is a must on listing");
        return _currentPrice(listing);
    }

    function updateAdmin(address _newAdmin) external override onlyOwner {
        admin = _newAdmin;
        emit onUpdateAdmin(admin);
    }
}
