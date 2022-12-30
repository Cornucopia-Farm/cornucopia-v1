// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

// Add nice @dev, etc. comments for contract to make it extra clear
import "uma-oracle-interface/SkinnyOptimisticOracleInterface.sol";
import "uma-oracle-implementation/previous-versions/SkinnyOptimisticOracle.sol";
import "uma-dvm-implementation/Constants.sol";
import "uma-oracle-interface/OptimisticOracleInterface.sol";
import "uma-dvm-interface/StoreInterface.sol";
import "uma-dvm-interface/FinderInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Escrow {

    using SafeERC20 for IERC20;

    mapping(bytes32 => uint) public bountyAmounts;
    mapping(bytes32 => Status) public progress;
    mapping(bytes32 => uint) public expiration;
    mapping(bytes32 => uint) public payoutExpiration;

    SkinnyOptimisticOracleInterface public oracleInterface;

    enum Status {
        NoBounty,
        Submitted, 
        DisputeInitiated,
        DisputeRespondedTo,
        Resolved
    }

    event Escrowed(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Submitted(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Disputed(address indexed creator, address indexed hunter, string indexed bountyAppId, uint32 timestamp, string message);
    event DisputeRespondedTo(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Resolved(address indexed creator, address indexed hunter, string indexed bountyAppId, address winner, string message); 
    event FundsSent(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsWithdrawnToCreator(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsForceSentToHunter(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);

    // Mapping arweave bounty address => bounty amount 
    function escrow(string memory _bountyAppId, address _hunter, uint _expiration, address _token, uint _amount) external payable {
        require(bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == 0, "Funds already escrowed");

        if (msg.value > 0) { // User sends ETH
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = msg.value; 
        } else { // Creator escrows ERC20
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = _amount;
        }
        
        expiration[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = block.timestamp + _expiration; 
        emit Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!"); 
    }

    // Hunter submitting work
    function submit(string memory _bountyAppId, address _creator) external {
        require(bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] != 0, "Funds not escrowed");
        require(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] != Status.Submitted, "Work already submitted");
        progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = Status.Submitted;
        payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = block.timestamp + 2 weeks; // Creator has 2 weeks to pay 
        emit Submitted(_creator, msg.sender, _bountyAppId, "Submitted!"); 
    }

    // one function for bounty creator to initiate dispute, user's input is bond amt
    function initiateDispute(
        string memory _bountyAppId, 
        address _hunter,
        address _oracleAddress, 
        uint _bondAmt, 
        string memory _ancillaryData,
        IERC20 _currency
        ) external returns (uint) {
        require(progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == Status.Submitted, "Work not Submitted");
        bytes memory ancillaryData = bytes(_ancillaryData);
        
        _currency.safeTransferFrom(msg.sender, address(this), _bondAmt + 35 * 10^16); // Transfer WETH from creator to contract to then send to OO
        _currency.safeIncreaseAllowance(_oracleAddress, _bondAmt + 35 * 10^16); // Need to approve OO contract to transfer tokens from here to OO of bondAmt + 0.35 WETH

        oracleInterface = SkinnyOptimisticOracleInterface(_oracleAddress);
        uint creatorBondAmt = oracleInterface.requestAndProposePriceFor(
            bytes32("YES_OR_NO_QUERY"), // bytes32 identifier 
            uint32(block.timestamp), // uint32
            ancillaryData, // bytes memory, github link
            _currency, // WETH 
            0, // uint256, reward 
            _bondAmt, // uint256, bounty creator determines bond
            1 weeks, // uint256, customLiveness
            msg.sender, // address, bounty creator = proposer
            0 // int256, p1:0 = no
        ); 
    
        progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.DisputeInitiated; 
        emit Disputed(msg.sender, _hunter, _bountyAppId, uint32(block.timestamp), "Disputed!"); // rethink flow
        return creatorBondAmt; // Creator bond plus finalFee
    }

    // second function for bounty hunter to dispute or not 
    function hunterDisputeResponse(
        string memory _bountyAppId, 
        address _creator, 
        uint32 _timestamp, 
        bytes memory _ancillaryData,
        SkinnyOptimisticOracleInterface.Request memory _request
        ) external returns (uint) {
        require(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] == Status.DisputeInitiated, "Bounty creator has not disputed");

        _request.currency.safeTransferFrom(msg.sender, address(this), _request.bond + 35 * 10^16); // Transfer WETH from hunter to contract to then send to OO
        _request.currency.safeIncreaseAllowance(address(oracleInterface), _request.bond + 35 * 10^16); // Need to approve OO contract to transfer tokens from here to OO of bondAmt + 0.35 WETH

        uint hunterBondAmt = oracleInterface.disputePriceFor(
            bytes32("YES_OR_NO_QUERY"),
            _timestamp,
            _ancillaryData,
            _request, //struct
            msg.sender, // setting hunter to disputer
            address(this) // Note: EscrowContract is actually the requester not the creator as EscrowContract calls UMA contract 
        ); 

        progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = Status.DisputeRespondedTo;
        emit DisputeRespondedTo(_creator, msg.sender, _bountyAppId, "Dispute Responded To!");
        return hunterBondAmt; // Hunter bond plus finalFee 
    }
    
    function forceHunterPayout(string memory _bountyAppId, address _creator, address _token) external {
        // Case 4: Bounty creator did not pay or dispute within 2 weeks following hunter submitting work.
        require(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] == Status.Submitted, "Work not Submitted");
        require(payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] <= block.timestamp, "Creator can still pay or dispute");
        
        uint value = bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))];
        bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] -= value;

        if (_token != address(0)) { // If ERC-20 token
            IERC20(_token).safeTransfer(msg.sender, value);
        } else {
            (bool sent, ) = payable(msg.sender).call{value: value}("");
            require(sent, "Failed to send Ether");
        }

        emit FundsForceSentToHunter(_creator, msg.sender, _bountyAppId, "Funds force sent to hunter!");
        progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = Status.Resolved;
    }

    function payoutIfDispute(
        string memory _bountyAppId, 
        address _hunter,
        uint32 _timestamp, 
        bytes memory _ancillaryData,
        SkinnyOptimisticOracleInterface.Request memory _request,
        address _token
    ) external {
        Status status = progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];
        require(status != Status.Submitted, "Creator hasn't disputed work");
        require(status != Status.Resolved, "Bounty has been payed out");

        OptimisticOracleInterface.State state = oracleInterface.getState(address(this), bytes32("YES_OR_NO_QUERY"), _timestamp, _ancillaryData, _request); // Note: EscrowContract is actually the requester not the creator

        uint value = bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];

        if (status != Status.Resolved && 
            (state == OptimisticOracleInterface.State.Resolved || state == OptimisticOracleInterface.State.Expired)) { // Case 2 or Case 3
            // Hunter disputes and it's resolved by DVM or Hunter doesn't dispute and it expires after 1 week; returns how much dvm pays winner and "price" (0, 1, 2)
            (, int256 winner) = oracleInterface.settle(address(this), bytes32("YES_OR_NO_QUERY"), _timestamp, _ancillaryData, _request); // Note: EscrowContract is actually the requester not the creator
            if (winner == 0) { // Send funds to creator
                bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
                if (_token != address(0)) { // If ERC-20 token
                    IERC20(_token).safeTransfer(msg.sender, value);
                } else {
                    (bool sent, ) = payable(msg.sender).call{value: value}("");
                    require(sent, "Failed to send Ether");
                }
                emit FundsSent(msg.sender, _hunter, _bountyAppId, "Funds sent back to creator!");
            } else if (winner == 1) { // Send funds to hunter
                bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
                if (_token != address(0)) { // If ERC-20 token
                    IERC20(_token).safeTransfer(_hunter, value);
                } else {
                    (bool sent, ) = payable(_hunter).call{value: value}("");
                    require(sent, "Failed to send Ether");
                }
                emit FundsSent(msg.sender, _hunter, _bountyAppId, "Funds sent to hunter!");
            } else if (winner == 2) { // Send half funds to creator and half to hunter
                bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
                if (_token != address(0)) { // If ERC-20 token
                    IERC20(_token).safeTransfer(_hunter, value / 2);
                    IERC20(_token).safeTransfer(msg.sender, value / 2);
                } else {
                    (bool sent, ) = payable(_hunter).call{value: value / 2 }("");
                    require(sent, "Failed to send Ether");
                    (bool sent2, ) = payable(msg.sender).call{value: value / 2 }("");
                    require(sent2, "Failed to send Ether");
                }
                emit FundsSent(msg.sender, _hunter, _bountyAppId, "Half of funds sent back to creator and then to hunter!");
            }
            progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.Resolved;
        } else if (status != Status.Resolved && 
            (state == OptimisticOracleInterface.State.Proposed || state == OptimisticOracleInterface.State.Disputed)) {
            // Creator dispute still live: Hunter hasn't disputed yet or hunter dispute hasn't been settled by dvm yet
            revert("Dispute still live");
        } 
    }

    function payout(string memory _bountyAppId, address _hunter, address _token) external {
        uint value = bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];

        // Case 5: Bounty Hunter doesn't submit work within specified time
        if(progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == Status.NoBounty 
            && expiration[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] <= block.timestamp) {
                bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
                if (_token != address(0)) { // If ERC-20 token
                    IERC20(_token).safeTransfer(msg.sender, value);
                } else {
                    (bool sent, ) = payable(msg.sender).call{value: value}("");
                    require(sent, "Failed to send Ether");
                }
                emit FundsWithdrawnToCreator(msg.sender, _hunter, _bountyAppId, "Funds withdrawn to creator!");
                progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.Resolved; 
        } 

        Status status = progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];
        // Case 1: Bounty creator doesn't dispute and pays out normal amount
        if (status == Status.Submitted) {
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
            if (_token != address(0)) { // If ERC-20 token
                    IERC20(_token).safeTransfer(_hunter, value);
            } else {
                (bool sent, ) = payable(_hunter).call{value: value}("");
                require(sent, "Failed to send Ether");
            }
            emit FundsSent(msg.sender, _hunter, _bountyAppId, "Funds sent to hunter!");
            progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.Resolved;
        } else if (status == Status.NoBounty && value > 0) {
            revert("Hunter hasn't submitted work yet");
        } else if (status == Status.DisputeInitiated || status == Status.DisputeRespondedTo){
            revert("Bounty is disputed");
        }  
    }
}

// UMA States

// Invalid, // Never requested.
// Requested, // Requested, no other actions taken.
// Proposed, // Proposed, but not expired or disputed yet.
// Expired, // Proposed, not disputed, past liveness.
// Disputed, // Disputed, but no DVM price returned yet.
// Resolved, // Disputed and DVM price is available.
// Settled // Final price has been set in the contract (can get here from Expired or Resolved). 

// case 1
// funds are sent from creator (contract) -> hunter
// creator calls payout()
// payout can only be called by creator 

// case 2
// dispute! creator disputes -> hunter disputes -> settled and winner is paid
// creator calls initiateDispute (check that creator is the one calling this or is this not necessary?)
// hunter calls hunterDisputeResponse (check that hunter is the one calling this)
// contract calls settle to get the outcome (where is settle called? in a seperate function or no?)
// we pay based off of outcome in payout 

// case 3
// dispute! creator disputes -> hunter does not dispute -> settled and creator is paid
// is settle function called if hunter does not dispute (ie we only need to code for 2 cases)
// creator calls initiateDispute 
// hunterDisputeResponse is never called
// contract calls settle to get outcome (this can be automatic after a week or so?) 
// we pay based off of outcome in payout (creator is paid + refunded bond from Uma) (we only need to pay the creator the escrow amount?)

// case 4 
// Creator doesn't call pay or dispute
// Need to have some sort of timeout of maybe a week? to then auto pay hunter 

// case 5
// Creator doesn't submit their work
// Need a timeline for when the work needs to be submitted by and if this is not hit then they get a refund

// Structure:
// dispute and hunter response should be seperate functions
// have an enum to represent bounty state (i.e., disputed, hunterResponse, etc.?)
// depending on enum state, payout function will either call settle and then payout funds to creator or hunter or will payout to hunter
