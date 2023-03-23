// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ListingEnumerator.sol";

/// @title Listing Core
abstract contract DefiMarketBase is ListingEnumerator {
    using SafeMath for uint256;

    struct PurchaseLog {
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 price;
        uint64 timestamp;
    }

    // Reference to contract tracking NFT ownership
    address public ERC721Address;
    // Reference to token used in trading
    address public ERC20Token;
    // transaction fee rate 0-10,000
    uint256 public feeRate;
    uint256 public purchaseCount;
    mapping(uint256 => PurchaseLog) public purchaseLogs;

    event onListingCreated(
        uint256 tokenId,
        address seller,
        uint256 startingPrice,
        uint256 endingPrice,
        uint256 duration
    );
    event onListingPurchased(uint256 tokenId, uint256 totalPrice, address winner);
    event onListingCancelled(uint256 tokenId);

    /// @dev Returns true if the claimant owns the token.
    /// @param _claimant - Address claiming to own the token.
    /// @param _tokenId - ID of token whose ownership to verify.
    function _owns(address _claimant, uint256 _tokenId) internal view returns (bool) {
        return (IERC721(ERC721Address).ownerOf(_tokenId) == _claimant);
    }

    /// @dev Escrows the NFT, assigning ownership to this contract.
    /// @param _owner - Current owner address of token to escrow.
    /// @param _tokenId - ID of token whose approval to verify.
    function _escrow(address _owner, uint256 _tokenId) internal {
        // it will throw if transfer fails
        IERC721(ERC721Address).transferFrom(_owner, address(this), _tokenId);
    }

    /// @dev Transfers an NFT owned by this contract to another address.
    /// @param _receiver - Address to transfer NFT to.
    /// @param _tokenId - ID of token to transfer.
    function _transfer(address _receiver, uint256 _tokenId) internal {
        IERC721(ERC721Address).transferFrom(address(this), _receiver, _tokenId);
    }

    /// @dev Adds an listing to the list of open listings.
    /// @param _tokenId The ID of the token to be put on listing.
    /// @param _listing Listing to add.
    function _addListing(uint256 _tokenId, Listing memory _listing) internal {
        require(_listing.duration >= 1 minutes, "MarketBase: Minimum duration is 1 minute");

        addEntry(_tokenId, _listing);

        emit onListingCreated(
            uint256(_tokenId),
            _listing.seller,
            uint256(_listing.startingPrice),
            uint256(_listing.endingPrice),
            uint256(_listing.duration)
        );
    }

    /// @dev Cancels an listing unconditionally.
    function _cancelListing(uint256 _tokenId, address _seller) internal {
        _removeListing(_tokenId);
        _transfer(_seller, _tokenId);
        emit onListingCancelled(_tokenId);
    }

    /// @dev Computes the price and transfers winnings.
    function _purchase(uint256 _tokenId, uint256 _offerPrice) internal returns (uint256) {
        // Get a reference to the listing struct
        Listing memory listing = getEntryByKey(_tokenId);

        require(_isOnListing(listing), "MarketBase: TokenId not exists");

        // Check that the purchase is greater than or equal to the current price
        uint256 price = _currentPrice(listing);
        require(_offerPrice >= price, "MarketBase: OfferPrice too low");

        address seller = listing.seller;

        // The offerPrice is good! Remove the listing before sending the fees
        // to the sender so we can't have a reentrancy attack.
        _removeListing(_tokenId);

        if (price > 0) {
            uint256 listingeerFee = _computeFee(price);
            uint256 sellerProceeds = price.sub(listingeerFee);

            require(IERC20(ERC20Token).transfer(seller, sellerProceeds));
        }

        uint256 priceExcess = _offerPrice.sub(price);
        require(IERC20(ERC20Token).transfer(msg.sender, priceExcess));

        // Storage purchase history
        purchaseLogs[purchaseCount] = PurchaseLog(_tokenId, seller, msg.sender, price, uint64(block.timestamp));
        purchaseCount++;

        emit onListingPurchased(_tokenId, price, msg.sender);

        return price;
    }

    /// @dev Removes an listing from the list of open listings.
    /// @param _tokenId - ID of NFT on listing.
    function _removeListing(uint256 _tokenId) internal {
        removeEntry(_tokenId);
    }

    /// @dev Returns true if the NFT is on listing.
    /// @param _listing - Listing to check.
    function _isOnListing(Listing memory _listing) internal pure returns (bool) {
        return (_listing.startedAt > 0);
    }

    function _currentPrice(Listing memory _listing) internal view returns (uint256) {
        uint256 secondsPassed = 0;

        if (block.timestamp > _listing.startedAt) {
            secondsPassed = block.timestamp.sub(_listing.startedAt);
        }

        return _computeCurrentPrice(_listing.startingPrice, _listing.endingPrice, _listing.duration, secondsPassed);
    }

    /// @dev Computes the current price of an listing.
    function _computeCurrentPrice(
        uint256 _startingPrice,
        uint256 _endingPrice,
        uint256 _duration,
        uint256 _secondsPassed
    ) internal pure returns (uint256) {
        if (_secondsPassed >= _duration) {
            return _endingPrice;
        } else {
            uint256 totalPriceChange = _startingPrice.sub(_endingPrice);

            uint256 currentPriceChange = totalPriceChange.mul(_secondsPassed).div(_duration);

            uint256 currentPrice = _startingPrice.sub(currentPriceChange);

            return currentPrice;
        }
    }

    /// @dev Computes owner's fee of a sale.
    /// @param _price - Sale price of NFT.
    function _computeFee(uint256 _price) internal view returns (uint256) {
        return _price.mul(feeRate).div(10000);
    }
}
