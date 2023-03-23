// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

abstract contract ItemEnumerator {
    using SafeMath for uint256;

    struct VaultItem {
        address vault;
        uint256 balance;
        uint256 timestamp;
    }

    struct Entry {
        uint256 index;
        VaultItem value;
    }

    mapping(address => Entry) internal entries;
    address[] internal keyList;
    uint256 public totalBalance;

    function addEntry(address _key, VaultItem memory _value) internal {
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
            totalBalance = totalBalance.add(_value.balance);
        }
    }

    function updateEntry(address _key, VaultItem memory _value) internal {
        Entry storage entry = entries[_key];
        require(entry.index != 0); // entry not exist
        require(entry.index <= keyList.length); // invalid index value

        if (containKey(_key)) {
            totalBalance = totalBalance.sub(entry.value.balance);
            entries[_key].value = _value;
            totalBalance = totalBalance.add(_value.balance);
        }
    }

    function removeEntry(address _key, bool force) internal {
        Entry storage entry = entries[_key];
        require(entry.index != 0, "ItemEnumerator: Entry not exist");
        require(entry.index <= keyList.length, "ItemEnumerator: Invalid index value");
        require(force == true || entry.value.balance == 0, "ItemEnumerator: Can't remove entry with any balance");

        totalBalance = totalBalance.sub(entry.value.balance);

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

    function containKey(address _key) internal view returns (bool) {
        return entries[_key].index > 0;
    }

    function getEntryByKey(address _key) public view returns (VaultItem memory) {
        return entries[_key].value;
    }

    function getEntryByIndex(uint256 _index) internal view returns (VaultItem memory) {
        require(_index >= 0);
        require(_index < keyList.length);
        return entries[keyList[_index]].value;
    }

    function getKeys() public view returns (address[] memory) {
        return keyList;
    }
}
