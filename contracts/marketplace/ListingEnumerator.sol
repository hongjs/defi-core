// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract ListingEnumerator {
    // Represents an listing on an NFT
    struct Listing {
        // ERC721 Token Id
        uint256 tokenId;
        // Current owner of NFT
        address seller;
        // Price at beginning of listing
        uint128 startingPrice;
        // Price at end of listing
        uint128 endingPrice;
        // Duration (in seconds) of listing
        uint64 duration;
        // Time when listing started
        uint64 startedAt;
    }

    struct Entry {
        uint256 index; // index start 1 to keyList.length
        Listing value;
    }

    mapping(uint256 => Entry) internal entries;
    uint256[] internal keyList;

    function addEntry(uint256 _key, Listing memory _value) internal {
        Entry storage entry = entries[_key];
        entry.value = _value;
        if (entry.index > 0) {
            // entry exists
            // do nothing
            return;
        } else {
            // new entry
            keyList.push(_key);
            uint256 keyListIndex = keyList.length - 1;
            entry.index = keyListIndex + 1;
        }
    }

    function removeEntry(uint256 _key) internal {
        Entry storage entry = entries[_key];
        require(entry.index != 0); // entry not exist
        require(entry.index <= keyList.length); // invalid index value

        // Move an last element of array into the vacated key slot.
        uint256 keyListIndex = entry.index - 1;
        uint256 keyListLastIndex = keyList.length - 1;
        entries[keyList[keyListLastIndex]].index = keyListIndex + 1;
        keyList[keyListIndex] = keyList[keyListLastIndex];
        keyList.pop();
        delete entries[_key];
    }

    function entryCount() public view returns (uint256) {
        return uint256(keyList.length);
    }

    function containKey(uint256 _key) external view returns (bool) {
        return entries[_key].index > 0;
    }

    function getEntryByKey(uint256 _key) public view returns (Listing memory) {
        return entries[_key].value;
    }

    function getEntryByIndex(uint256 _index) public view returns (Listing memory) {
        require(_index >= 0);
        require(_index < keyList.length);
        return entries[keyList[_index]].value;
    }

    function getKeys() external view returns (uint256[] memory) {
        return keyList;
    }

    function getEntriesByOffset(uint128 offset, uint128 limit) external view returns (Listing[] memory) {
        require(limit > 0, "ListingEnumerator: Index out of bound");
        require(offset + limit == uint128(offset + limit), "ListingEnumerator: Index out of bound");
        uint128 total = uint128(entryCount());
        if (total == 0) return new Listing[](0);

        uint128 maxLimit = offset == total ? 1 : offset + limit > total ? total - offset : limit;
        Listing[] memory results = new Listing[](maxLimit);

        for (uint128 i = 0; i < maxLimit; i++) {
            Listing memory result = getEntryByIndex(offset + i);
            results[i] = result;
        }
        return results;
    }
}
