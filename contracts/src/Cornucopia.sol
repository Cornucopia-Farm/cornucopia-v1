// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";

/// @title Cornucopia contract
/// @notice Cornucopia bounty protocol
contract Cornucopia is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    mapping(bytes32 => uint) public bountyAmounts;
    mapping(bytes32 => Status) public progress;
    mapping(bytes32 => uint) public expiration;
    mapping(bytes32 => uint) public payoutExpiration;
    mapping(bytes32 => address) public bountyToken;

    enum Status {
        NoBounty,
        Submitted, 
        Resolved
    }

    event Escrowed(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Submitted(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Resolved(address indexed creator, address indexed hunter, string indexed bountyAppId, address winner, string message); 
    event FundsSent(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsWithdrawnToCreator(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsForceSentToHunter(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    // Only the owner can upgrade the implementation.
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Escrows creator's ERC-20 or ETH for a given bounty and hunter
    /// @dev Check if creator using ETH via msg.value and explicitly checks progress and _amount to prevent creator setting bountyAmounts twice
    /// @param _bountyAppId The bountyId for the given bounty
    /// @param _hunter The hunter's address
    /// @param _expiration How long the hunter has to submit their work before the creator can refund themselves
    /// @param _token The token's address (zero address if ETH)
    /// @param _amount The token amount (zero if ETH)
    function escrow(string memory _bountyAppId, address _hunter, uint _expiration, address _token, uint _amount) external payable nonReentrant {
        require(bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == 0, "Funds already escrowed");
        require(progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == Status.NoBounty, "State must be No Bounty");
 
        if (msg.value > 0) { // User sends ETH
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = msg.value; 
        } else { // Creator escrows ERC20 
            require(_amount > 0, "Amount must be non-zero");
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = _amount;
            bountyToken[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = _token;
        }
        
        expiration[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = block.timestamp + _expiration; 
        emit Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!"); 
    }

    /// @notice Hunter submits work for a given bounty and creator 
    /// @dev Sets payoutExpiration to be 2 weeks, giving creator two weeks to pay
    /// @param _bountyAppId The bountyId for the given bounty
    /// @param _creator The creator's address
    function submit(string memory _bountyAppId, address _creator) external nonReentrant {
        require(bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] != 0, "Funds not escrowed");
        require(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] == Status.NoBounty, "Work already submitted");
        progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = Status.Submitted;
        payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = block.timestamp + 2 weeks; // Creator has 2 weeks to pay. 
        emit Submitted(_creator, msg.sender, _bountyAppId, "Submitted!"); 
    }
    
    /// @notice Hunter forces the payout of escrowed funds for a given bounty and creator if creator ignores work submission
    /// @dev Checks that hunter has submitted their work
    /// @dev Checks that creator can still pay or dispute the bounty
    /// @param _bountyAppId The bountyId for the given bounty
    /// @param _creator The creator's address
    function forceHunterPayout(string memory _bountyAppId, address _creator) external nonReentrant {
        // Bounty creator did not pay within 2 weeks following hunter submitting work.
        require(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] == Status.Submitted, "Work not Submitted");
        require(payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] <= block.timestamp, "Creator can still pay");
        
        uint value = bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))];
        bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] -= value;

        address token = bountyToken[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))];

        if (token != address(0)) { // If ERC-20 token
            IERC20(token).safeTransfer(msg.sender, value);
        } else {
            (bool sent, ) = payable(msg.sender).call{value: value}("");
            require(sent, "Failed to send Ether");
        }

        emit FundsForceSentToHunter(_creator, msg.sender, _bountyAppId, "Funds force sent to hunter!");
        progress[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] = Status.Resolved;
    }

    /// @notice Creator pays out a bounty for a given hunter 
    /// @dev Handles the case where the bounty hunter doesn't submit work in time so creator can get a refund
    /// @dev Handles cases where hunter didn't submit their work yet
    /// @dev Handles both ERC-20 and ETH bounties   
    /// @param _bountyAppId The bountyId for the given bounty
    /// @param _hunter The hunter's address
    function payout(string memory _bountyAppId, address _hunter) external nonReentrant {
        uint value = bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];
        address token = bountyToken[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];

        // Bounty Hunter doesn't submit work within specified time
        if(progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] == Status.NoBounty 
            && expiration[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] <= block.timestamp) {
                bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
                if (token != address(0)) { // If ERC-20 token
                    IERC20(token).safeTransfer(msg.sender, value);
                } else {
                    (bool sent, ) = payable(msg.sender).call{value: value}("");
                    require(sent, "Failed to send Ether");
                }
                emit FundsWithdrawnToCreator(msg.sender, _hunter, _bountyAppId, "Funds withdrawn to creator!");
                progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.Resolved; 
        } 

        Status status = progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))];
        // Bounty creator pays out normal amount
        if (status == Status.Submitted) {
            bountyAmounts[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] -= value;
            if (token != address(0)) { // If ERC-20 token
                    IERC20(token).safeTransfer(_hunter, value);
            } else {
                (bool sent, ) = payable(_hunter).call{value: value}("");
                require(sent, "Failed to send Ether");
            }
            emit FundsSent(msg.sender, _hunter, _bountyAppId, "Funds sent to hunter!");
            progress[keccak256(abi.encodePacked(_bountyAppId, msg.sender, _hunter))] = Status.Resolved;
        } else if (status == Status.NoBounty && value > 0) {
            revert("Hunter hasn't submitted work yet");
        }  
    }
}