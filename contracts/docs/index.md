# Solidity API

## Cornucopia

Cornucopia bounty protocol

### bountyAmounts

```solidity
mapping(bytes32 => uint256) bountyAmounts
```

### progress

```solidity
mapping(bytes32 => enum Cornucopia.Status) progress
```

### expiration

```solidity
mapping(bytes32 => uint256) expiration
```

### payoutExpiration

```solidity
mapping(bytes32 => uint256) payoutExpiration
```

### bountyToken

```solidity
mapping(bytes32 => address) bountyToken
```

### bountyAncillaryData

```solidity
mapping(bytes32 => bytes32) bountyAncillaryData
```

### oracleInterface

```solidity
contract SkinnyOptimisticOracleInterface oracleInterface
```

### ORACLE_ADDRESS

```solidity
address ORACLE_ADDRESS
```

### ORACLE_STORE_ADDRESS

```solidity
address ORACLE_STORE_ADDRESS
```

### WETH_ADDRESS

```solidity
address WETH_ADDRESS
```

### DAI_ADDRESS

```solidity
address DAI_ADDRESS
```

### USDC_ADDRESS

```solidity
address USDC_ADDRESS
```

### Status

```solidity
enum Status {
  NoBounty,
  Submitted,
  DisputeInitiated,
  DisputeRespondedTo,
  Resolved
}
```

### Escrowed

```solidity
event Escrowed(address creator, address hunter, string bountyAppId, string message)
```

### Submitted

```solidity
event Submitted(address creator, address hunter, string bountyAppId, string message)
```

### Disputed

```solidity
event Disputed(address creator, address hunter, string bountyAppId, uint32 timestamp, string message)
```

### DisputeRespondedTo

```solidity
event DisputeRespondedTo(address creator, address hunter, string bountyAppId, string message)
```

### Resolved

```solidity
event Resolved(address creator, address hunter, string bountyAppId, address winner, string message)
```

### FundsSent

```solidity
event FundsSent(address creator, address hunter, string bountyAppId, string message)
```

### FundsWithdrawnToCreator

```solidity
event FundsWithdrawnToCreator(address creator, address hunter, string bountyAppId, string message)
```

### FundsForceSentToHunter

```solidity
event FundsForceSentToHunter(address creator, address hunter, string bountyAppId, string message)
```

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize() public
```

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

### escrow

```solidity
function escrow(string _bountyAppId, address _hunter, uint256 _expiration, address _token, uint256 _amount) external payable
```

Escrows creator's ERC-20 or ETH for a given bounty and hunter

_Check if creator using ETH via msg.value and explicitly checks progress and _amount to prevent creator setting bountyAmounts twice_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _hunter | address | The hunter's address |
| _expiration | uint256 | How long the hunter has to submit their work before the creator can refund themselves |
| _token | address | The token's address (zero address if ETH) |
| _amount | uint256 | The token amount (zero if ETH) |

### submit

```solidity
function submit(string _bountyAppId, address _creator) external
```

Hunter submits work for a given bounty and creator

_Sets payoutExpiration to be 2 weeks, giving creator two weeks to pay or dispute the hunter's work_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _creator | address | The creator's address |

### initiateDispute

```solidity
function initiateDispute(string _bountyAppId, address _hunter, uint256 _bondAmt, string _ancillaryData, contract IERC20 _currency) external returns (uint256)
```

Creator initiates dispute for a given bounty and hunter

_Currency can only be WETH, DAI, or USDC 
Creator is the proposer but Cornucopia contract is the requester_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _hunter | address | The hunter's address |
| _bondAmt | uint256 | The UMA bond the creator posts to initiate the dispute |
| _ancillaryData | string | The dispute data UMA holders use to judge the dispute |
| _currency | contract IERC20 | The currency the creator wants to use for the bond |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | creatorBondAmt The creator's bond plus UMA's finalFee |

### hunterDisputeResponse

```solidity
function hunterDisputeResponse(string _bountyAppId, address _creator, uint32 _timestamp, bytes _ancillaryData, struct SkinnyOptimisticOracleInterface.Request _request) external returns (uint256)
```

Hunter responds to dispute for a given bounty and creator

_Checks that bounty has been disputed 
Request can be found from events emitted when initiateDispute is called_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _creator | address | The creator's address |
| _timestamp | uint32 | The timestamp when the creator called initiateDispute and the dispute was created in UMA |
| _ancillaryData | bytes | The dispute data UMA holders use to judge the dispute |
| _request | struct SkinnyOptimisticOracleInterface.Request | The UMA request struct representing the dispute |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | hunterBondAmt The hunter's bond plus UMA's finalFee |

### forceHunterPayout

```solidity
function forceHunterPayout(string _bountyAppId, address _creator) external
```

Hunter forces the payout of escrowed funds for a given bounty and creator if creator ignores work submission

_Checks that hunter has submitted their work
Checks that creator can still pay or dispute the bounty_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _creator | address | The creator's address |

### payoutIfDispute

```solidity
function payoutIfDispute(string _bountyAppId, address _creator, address _hunter, uint32 _timestamp, bytes _ancillaryData, struct SkinnyOptimisticOracleInterface.Request _request) external
```

Creator or hunter settles an outstanding UMA dispute

_Checks that caller is either the creator or hunter to ensure correct payout data
Checks that the bounty was disputed in Cornucopia 
Handles the cases where dispute is settled, still live, expired, or hunter hasn't responded to the dispute
Handles the cases where the creator wins the dispute, hunter wins the dispute, or they tie._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _creator | address | The creator's address |
| _hunter | address | The hunter's address |
| _timestamp | uint32 | The timestamp when the creator called initiateDispute and the dispute was created in UMA |
| _ancillaryData | bytes | The dispute data UMA holders use to judge the dispute |
| _request | struct SkinnyOptimisticOracleInterface.Request | The UMA request struct representing the dispute |

### payout

```solidity
function payout(string _bountyAppId, address _hunter) external
```

Creator pays out a bounty for a given hunter

_Handles the case where the bounty hunter doesn't submit work in time so creator can get a refund
Handles cases where bounty was disputed or hunter didn't submit their work yet
Handles both ERC-20 and ETH bounties_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyAppId | string | The bountyId for the given bounty |
| _hunter | address | The hunter's address |

