// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "forge-std/Test.sol";
import "../src/Cornucopia.sol";
import "../lib/protocol/packages/core/contracts/data-verification-mechanism/test/MockOracleAncillary.sol";
import "../lib/protocol/packages/core/contracts/optimistic-oracle/previous-versions/SkinnyOptimisticOracle.sol";
import "../lib/protocol/packages/core/contracts/optimistic-oracle/interfaces/SkinnyOptimisticOracleInterface.sol";
import "../lib/protocol/packages/core/contracts/data-verification-mechanism/implementation/store.sol";
import "../lib/protocol/packages/core/contracts/data-verification-mechanism/implementation/Finder.sol";
import "../lib/protocol/packages/core/contracts/data-verification-mechanism/implementation/IdentifierWhitelist.sol";
import "../lib/protocol/packages/core/contracts/common/implementation/Timer.sol";
import "../lib/protocol/packages/core/contracts/common/implementation/AddressWhitelist.sol";
import "../lib/protocol/packages/core/contracts/common/implementation/FixedPoint.sol";
import "../lib/protocol/packages/core/contracts/common/implementation/ExpandedERC20.sol";

contract CornucopiaTest is Test {
    Cornucopia public cornucopiaContract;
    ExpandedERC20 public token;
    SkinnyOptimisticOracle public optimisticOracle;
    Finder public finderContract;
    Timer public timerContract;
    Store public storeContract;
    IdentifierWhitelist public identifierWhitelist;
    AddressWhitelist public collateralWhitelist;
    MockOracleAncillary public mockDVM;
    ExpandedERC20 public weth;
    uint public finalFee;
    
    // Escrow Events
    event Escrowed(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Submitted(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Disputed(address indexed creator, address indexed hunter, string indexed bountyAppId, uint32 timestamp, string message);
    event DisputeRespondedTo(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsForceSentToHunter(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsSent(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsWithdrawnToCreator(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);

    // UMA Events
    event ProposePrice(address indexed requester, bytes32 indexed identifier, uint32 timestamp, bytes ancillaryData, SkinnyOptimisticOracleInterface.Request request);

    function setUp() public {
        escrowContract = new Cornucopia();
        token = new ExpandedERC20("Test Token", "TEST", 18);
        token.addMinter(address(this)); // Allow testContract to mint tokens;
    }

    function setUpUMA(address creator, address hunter) public {
        finderContract = new Finder();
        timerContract = new Timer();
        storeContract = new Store(FixedPoint.Unsigned({rawValue: 0}), FixedPoint.Unsigned({rawValue: 0}), address(timerContract));
        identifierWhitelist = new IdentifierWhitelist();
        collateralWhitelist = new AddressWhitelist();
        mockDVM = new MockOracleAncillary(address(finderContract), address(timerContract));
        optimisticOracle = new SkinnyOptimisticOracle(1 weeks, address(finderContract), address(timerContract));
        // Set address public constant ORACLE_ADDRESS = 0x03A6a84cD762D9707A21605b548aaaB891562aAb; in contract
        weth = new ExpandedERC20("Wrapped Ether", "WETH", 18); // fake WETH to use UMA

        // Add the identifier we'll be using
        identifierWhitelist.addSupportedIdentifier(bytes32("YES_OR_NO_QUERY")); 

        // Set addresses of UMA oracle related contracts in finder
        finderContract.changeImplementationAddress(OracleInterfaces.Oracle, address(mockDVM));
        finderContract.changeImplementationAddress(OracleInterfaces.IdentifierWhitelist, address(identifierWhitelist));
        finderContract.changeImplementationAddress(OracleInterfaces.CollateralWhitelist, address(collateralWhitelist));
        finderContract.changeImplementationAddress(OracleInterfaces.Store, address(storeContract));

        // Mint 100 fake WETH to creator and hunter
        weth.addMinter(address(this)); // Allow testContract to mint tokens;
        weth.mint(creator, 100 * 10**18); // Mint 100 WETH
        weth.mint(hunter, 100 * 10**18); // Mint 100 WETH

        // Register this collateral 
        collateralWhitelist.addToWhitelist(address(weth));

        // Set finalFee in Store
        finalFee = 35 * 10**16; // real finalFee of 0.35 WETH
        storeContract.setFinalFee(address(weth), FixedPoint.Unsigned({rawValue: finalFee}));
    }

    // Test Escrow Function W/ ETH
    function testEscrowETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;
        
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit Escrowed(creator, hunter, bountyAppId, "Escrowed!"); // This is the event we expect to be emitted

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 1 ether); // Check that bountyAmounts for this bountyId, creator, hunter combo is set to msg.value
        assertEq(escrowContract.expiration(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 1000000 + expiration); // Check that expirtation for this bountyId, creator, hunter combo is set to current block timestamp + expiraton data
        
        vm.stopPrank(); // Sets msg.sender back to address(this)
    }

    // Test Escrow Function W/ ERC20
    function testEscrowERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;
        
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit Escrowed(creator, hunter, bountyAppId, "Escrowed!"); // This is the event we expect to be emitted

        token.approve(address(escrowContract), 1 * 10**18);

        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18);
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 1 * 10**18); // Check that bountyAmounts for this bountyId, creator, hunter combo is set to msg.value
        assertEq(escrowContract.expiration(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 1000000 + expiration); // Check that expirtation for this bountyId, creator, hunter combo is set to current block timestamp + expiraton data
        assertEq(escrowContract.bountyToken(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), address(token)); // Check that bountyToken for this bountyId, creator, hunter combo is set to the token address
        
        vm.stopPrank(); // Sets msg.sender back to address(this)
    }

    function testFundsEscrowedAgain() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow Funds

        // Test require statement that unique bounty, creator, hunter
        vm.expectRevert(bytes("Funds already escrowed")); // Expect this revert error; note: case sensitive
        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Call escrow again with same bountyid, creator, hunter
        vm.stopPrank();
    }

    function testEscrowERC20AmountZero() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;
        
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);

        vm.expectRevert(bytes("Amount must be non-zero")); // Expect this revert error; note: case sensitive
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 0);

        vm.stopPrank();
    }

    // Test Submit Function
    function testSubmit() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);

        // Escrow funds first
        uint expiration = 1 weeks;
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.startPrank(hunter); // Sets msg.sender = hunter till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit Submitted(creator, hunter, bountyAppId, "Submitted!"); // This is the event we expect to be emitted

        escrowContract.submit(bountyAppId, creator);
        
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Submitted)); // Check that Status enum set to submitted; have to cast to uint to use assertEq
        assertEq(escrowContract.payoutExpiration(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 1000000 + 2 weeks);
        vm.stopPrank();
    }

    function testFundsNotEscrowedSubmit() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);

        // Test require statement that funds must have been escrowed before hunter can submit work for this bountyid, creator, hunter combo
        vm.prank(hunter); // Call submit with msg.sender = hunter
        vm.expectRevert(bytes("Funds not escrowed")); // Expect this revert error
        escrowContract.submit(bountyAppId, creator); // Call submit with bountyid, creator, hunter
    }

    function testWorkAlreadySubmittedSubmit() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);

        // Escrow funds first
        uint expiration = 1 weeks;
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.startPrank(hunter); // Sets msg.sender = hunter till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.submit(bountyAppId, creator); // Hunter submits work

        // Test require statement that work has already been submitted yet for this bountyid, creator, hunter combo
        vm.expectRevert(bytes("Work already submitted")); // Expect this revert error
        escrowContract.submit(bountyAppId, creator); // Call submit again with same bountyid, creator, hunter
        vm.stopPrank();
    }

    function testPayoutETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow funds

        vm.prank(hunter); // Sets msg.sender = hunter till stopPrank called
        vm.warp(1000010); // Sets block.timestamp = 1000010

        escrowContract.submit(bountyAppId, creator); // Hunter submits work

        vm.startPrank(creator);
        // Testing Case 1: Bounty creator doesn't dispute and pays out normal amount
        uint escrowContractBalanceBefore = address(escrowContract).balance;
        uint hunterBalanceBefore = hunter.balance;
        uint valueToBePaidToHunter = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent to hunter!"); // This is the event we expect to be emitted

        escrowContract.payout(bountyAppId, hunter);
        assertEq(escrowContractBalanceBefore - address(escrowContract).balance, hunter.balance - hunterBalanceBefore); // Check that same amount paid out to hunter was deducted from the contract
        assertEq(hunter.balance - hunterBalanceBefore, valueToBePaidToHunter); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved 
        vm.stopPrank();
    }

    function testPayoutERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18); // Escrow funds
        vm.stopPrank();

        vm.prank(hunter); // Sets msg.sender = hunter till stopPrank called
        vm.warp(1000010); // Sets block.timestamp = 1000010

        escrowContract.submit(bountyAppId, creator); // Hunter submits work

        vm.startPrank(creator);
        // Testing Case 1: Bounty creator doesn't dispute and pays out normal amount
        uint escrowContractBalanceBefore = token.balanceOf(address(escrowContract));
        uint hunterBalanceBefore = token.balanceOf(hunter);
        uint valueToBePaidToHunter = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent to hunter!"); // This is the event we expect to be emitted

        escrowContract.payout(bountyAppId, hunter);
    
        assertEq(escrowContractBalanceBefore - token.balanceOf(address(escrowContract)), token.balanceOf(hunter) - hunterBalanceBefore); // Check that same amount paid out to hunter was deducted from the contract
        assertEq(token.balanceOf(hunter) - hunterBalanceBefore, valueToBePaidToHunter); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved 
        vm.stopPrank();
    }

    function testHunterNoSubmitWorkPayoutETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow funds

        // Testing Case 5: Bounty Hunter doesn't submit work within specified time
        vm.warp(1000000 + expiration + 1); // Sets block.timestamp to be > expiration time set by creator + timestamp when they escrowed their funds.
        
        uint escrowContractBalanceBefore = address(escrowContract).balance;
        uint creatorBalanceBefore = creator.balance;
        uint valueToBePaidToCreator = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));
        uint progress = uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter))));
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsWithdrawnToCreator(creator, hunter, bountyAppId, "Funds withdrawn to creator!"); // This is the event we expect to be emitted

        assertEq(uint(progress), uint(Escrow.Status.NoBounty)); // Check that Status enum set to NoBounty as hunter hasn't submitted work yet

        escrowContract.payout(bountyAppId, hunter);

        assertEq(escrowContractBalanceBefore - address(escrowContract).balance, creator.balance -  creatorBalanceBefore); // Check that same amount paid out to creator was deducted from the contract
        assertEq(creator.balance - creatorBalanceBefore, valueToBePaidToCreator); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        vm.stopPrank();
    }

    function testHunterNoSubmitWorkPayoutERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18); // Escrow funds
        
        // Testing Case 5: Bounty Hunter doesn't submit work within specified time
        vm.warp(1000000 + expiration + 1); // Sets block.timestamp to be > expiration time set by creator + timestamp when they escrowed their funds.
        
        uint escrowContractBalanceBefore = token.balanceOf(address(escrowContract));
        uint creatorBalanceBefore = token.balanceOf(creator);
        uint valueToBePaidToCreator = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));
        uint progress = uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter))));
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsWithdrawnToCreator(creator, hunter, bountyAppId, "Funds withdrawn to creator!"); // This is the event we expect to be emitted

        assertEq(uint(progress), uint(Escrow.Status.NoBounty)); // Check that Status enum set to NoBounty as hunter hasn't submitted work yet

        escrowContract.payout(bountyAppId, hunter);

        assertEq(escrowContractBalanceBefore - token.balanceOf(address(escrowContract)), token.balanceOf(creator) -  creatorBalanceBefore); // Check that same amount paid out to creator was deducted from the contract
        assertEq(token.balanceOf(creator) - creatorBalanceBefore, valueToBePaidToCreator); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        vm.stopPrank();
    }

    function testInitiateDispute() public {
        // need to check that the UMA variables in their contract match; should double check that the necessary contracts are deployed!!
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bountyAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit Disputed(creator, hunter, bountyAppId, 1000001, "Disputed!"); // rethink flow // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        uint creatorBondAmt = escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        );

        assertEq(weth.balanceOf(address(optimisticOracle)), creatorWETHBalanceBefore - weth.balanceOf(creator)); // Check that same amount sent to Escrow then OO contract was deducted from the creator
        assertEq(bondAmt + finalFee, creatorWETHBalanceBefore - weth.balanceOf(creator)); // Check that the amount escrowed in the OO contract was the bondAmt + finalFee
        assertEq(bondAmt + finalFee, creatorBondAmt); // Check that creatorBondAmt returned by OO func call is the bondAmt + finalFee inputed
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.DisputeInitiated)); // Check that Status enum set to DisputeInitiated
        vm.stopPrank();
    }

    function testHunterNoSubmitWorkInitiateDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10;
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.startPrank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000
        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        // Test require statement that hunter must have submitted their work before creator can initiate dispute for this bountyid, creator, hunter combo
        vm.expectRevert(bytes("Work not Submitted")); // Expect this revert error
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData, 
            weth
        ); // Call submit with bountyid, creator, hunter
        vm.stopPrank();
    }

    function testHunterDisputeResponse() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit DisputeRespondedTo(creator, hunter, bountyAppId, "Dispute Responded To!"); // This is the event we expect to be emitted

        uint hunterWETHBalanceBefore = weth.balanceOf(hunter);
        uint ooWETHBalanceBefore = weth.balanceOf(address(optimisticOracle));

        // Can't parse data froom logs so have to create request struct here that mirrors the one created in requestAndProposePriceFor
        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        uint hunterBondAmt = escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        );

        // Note: half of the bondAmt get's "burned" i.e. sent too the store contract
        assertEq(weth.balanceOf(address(optimisticOracle)) - ooWETHBalanceBefore + weth.balanceOf(address(storeContract)), hunterWETHBalanceBefore - weth.balanceOf(hunter)); // Check that same amount sent to Escrow then OO contract then part to store contract was deducted from hunter
        assertEq(bondAmt + finalFee, hunterWETHBalanceBefore - weth.balanceOf(hunter)); // Check that the amount escrowed in the OO contract was the bondAmt + finalFee
        assertEq(bondAmt + finalFee, hunterBondAmt); // Check that hunterBondAmt returned by OO func call is the bondAmt + finalFee inputed
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.DisputeRespondedTo)); // Check that Status enum set to DisputeRespondedTo
        vm.stopPrank();
    }

    function testCreatorNoDisputeHunterDisputeResponse() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        vm.prank(hunter);
        vm.expectRevert(bytes("Bounty creator has not disputed")); // Expect this revert error
        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        );  
    }

    function testForceHunterPayoutETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow funds

        vm.startPrank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        vm.warp(1000001 + 2 weeks + 1); // set timestamp to be > 2 weeks since hunter submitted work

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsForceSentToHunter(creator, hunter, bountyAppId, "Funds force sent to hunter!"); // This is the event we expect to be emitted

        uint escrowContractBalanceBefore = address(escrowContract).balance;
        uint hunterBalanceBefore = hunter.balance;
        uint valueToBePaidToHunter = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));

        escrowContract.forceHunterPayout(bountyAppId, creator); // Force payout

        assertEq(escrowContractBalanceBefore - address(escrowContract).balance, hunter.balance -  hunterBalanceBefore); // Check that same amount paid out to hunter was deducted from the contract
        assertEq(hunter.balance - hunterBalanceBefore, valueToBePaidToHunter); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        vm.stopPrank();
    }

    function testForceHunterPayoutERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000
        

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18); // Escrow funds
        vm.stopPrank();

        vm.startPrank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        vm.warp(1000001 + 2 weeks + 1); // set timestamp to be > 2 weeks since hunter submitted work

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsForceSentToHunter(creator, hunter, bountyAppId, "Funds force sent to hunter!"); // This is the event we expect to be emitted

        uint escrowContractBalanceBefore = token.balanceOf(address(escrowContract));
        uint hunterBalanceBefore = token.balanceOf(hunter);
        uint valueToBePaidToHunter = escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter)));

        escrowContract.forceHunterPayout(bountyAppId, creator); // Force payout

        assertEq(escrowContractBalanceBefore - token.balanceOf(address(escrowContract)), token.balanceOf(hunter) - hunterBalanceBefore); // Check that same amount paid out to hunter was deducted from the contract
        assertEq(token.balanceOf(hunter) - hunterBalanceBefore, valueToBePaidToHunter); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        vm.stopPrank();
    }

    function testHunterNoSubmitWorkForceHunterPayout() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow funds

        vm.prank(hunter);
        vm.expectRevert(bytes("Work not Submitted")); // Expect this revert error
        escrowContract.forceHunterPayout(bountyAppId, creator);   
    }

    function testCreatorResponseWindowOpenForceHunterPayout() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator till stopPrank called
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0); // Escrow funds

        vm.startPrank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        vm.expectRevert(bytes("Creator can still pay or dispute")); // Expect this revert error
        escrowContract.forceHunterPayout(bountyAppId, creator); 
        vm.stopPrank();
    }

    function testCreatorWinsPayoutIfDisputeETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            0
        ); // Push price of 0 so creator wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        assertEq(2 ether, creator.balance); // Check that creator paid back the 1 eth they escrowed before
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(creator) - creatorWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (creator) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testCreatorWinsHunterCallsPayoutIfDisputeETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            0
        ); // Push price of 0 so creator wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        vm.stopPrank();

        vm.prank(hunter); // Set hunter to be the caller

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        assertEq(2 ether, creator.balance); // Check that creator paid back the 1 eth they escrowed before
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(creator) - creatorWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (creator) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
    }

    function testHunterWinsPayoutIfDisputeETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            1
        ); // Push price of 1 so hunter wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent to hunter!"); // This is the event we expect to be emitted

        uint hunterWETHBalanceBefore = weth.balanceOf(hunter);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        assertEq(1 ether, hunter.balance); // Check that hunter was paid the 1 eth escrowed
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(hunter) - hunterWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (hunter) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testTiePayoutIfDisputeETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            2
        ); // Push price of 1 so hunter wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Half of funds sent back to creator and then to hunter!"); // This is the event we expect to be emitted

        uint hunterWETHBalanceBefore = weth.balanceOf(hunter);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        // Note: even if it's a tie, hunter is still considered the winner so they get the WETH as if the dispute was voted in their favor (price of 1)
        assertEq(0.5 ether, hunter.balance); // Check that hunter was paid 0.5 eth (half escrowed amount)
        assertEq(1.5 ether, creator.balance); // Check that creator was paid 0.5 eth (half escrowed amount)
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(hunter) - hunterWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (hunter) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testHunterNoDisputeExpiredPayoutIfDisputeETH() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        // vm.stopPrank();

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        optimisticOracle.setCurrentTime(1000001 + 1 weeks + 1); // Set timestamp in DVM so that the creator's dispute intiation will be expired 

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );

        assertEq(2 ether, creator.balance); // Check that creator paid back the 1 eth they escrowed before
        assertEq(bondAmt + finalFee, weth.balanceOf(creator) - creatorWETHBalanceBefore); // Check that the amount of WETH given to dispute default winner (creator) is bondAmt + finalFee 
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testCreatorWinsPayoutIfDisputeERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18);
        vm.stopPrank();

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            0
        ); // Push price of 0 so creator wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator, 
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        assertEq(100 * 10**18, token.balanceOf(creator)); // Check that creator paid back the 1 Test Token they escrowed before
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(creator) - creatorWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (creator) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testHunterWinsPayoutIfDisputeERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18);
        vm.stopPrank();

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            1
        ); // Push price of 1 so hunter wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent to hunter!"); // This is the event we expect to be emitted

        uint hunterWETHBalanceBefore = weth.balanceOf(hunter);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        assertEq(1 * 10**18, token.balanceOf(hunter)); // Check that hunter was paid the 1 Test Token escrowed
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(hunter) - hunterWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (hunter) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testTiePayoutIfDisputeERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18);
        vm.stopPrank();

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            2
        ); // Push price of 1 so hunter wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Half of funds sent back to creator and then to hunter!"); // This is the event we expect to be emitted

        uint hunterWETHBalanceBefore = weth.balanceOf(hunter);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        // Note: even if it's a tie, hunter is still considered the winner so they get the WETH as if the dispute was voted in their favor (price of 1)
        assertEq((1 * 10**18) / 2, token.balanceOf(hunter)); // Check that hunter was paid 0.5 Test Token (half escrowed amount)
        assertEq(100 * 10**18 - (1 * 10**18) / 2, token.balanceOf(creator)); // Check that creator was paid 0.5 Test Token (half escrowed amount)
        assertEq(bondAmt + finalFee + bondAmt / 2, weth.balanceOf(hunter) - hunterWETHBalanceBefore); // Check that the amount of WETH given to dispute winner (hunter) is bondAmt + finalFee + bondAmt/2 (last part is unburned part of loser's bond)
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testHunterNoDisputeExpiredPayoutIfDisputeERC20() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        token.mint(creator, 100 * 10**18); // Mint 100 Test Token
        vm.startPrank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        token.approve(address(escrowContract), 1 * 10**18);
        escrowContract.escrow(bountyAppId, hunter, expiration, address(token), 1 * 10**18);
        vm.stopPrank();

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        // vm.stopPrank();

        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        uint creatorWETHBalanceBefore = weth.balanceOf(creator);

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        optimisticOracle.setCurrentTime(1000001 + 1 weeks + 1); // Set timestamp in DVM so that the creator's dispute intiation will be expired 

        escrowContract.payoutIfDispute(
            bountyAppId,
            creator, 
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );

        assertEq(100 * 10**18, token.balanceOf(creator)); // Check that creator paid back the 1 Test Token they escrowed before
        assertEq(bondAmt + finalFee, weth.balanceOf(creator) - creatorWETHBalanceBefore); // Check that the amount of WETH given to dispute default winner (creator) is bondAmt + finalFee 
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Escrow.Status.Resolved)); // Check that Status enum set to Resolved
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that escrowed funds for the contract is now 0
        vm.stopPrank();
    }

    function testDisputeNotSettledPayoutIfDispute() public {
         string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        vm.expectRevert(bytes("Dispute still live")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );
        vm.stopPrank();
    }

    function testHunterNoDisputeYetPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        vm.startPrank(creator);

        vm.expectRevert(bytes("Dispute still live")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );
        vm.stopPrank();
    }

    function testCreatorNoDisputePayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        setUpUMA(creator, hunter);

        SkinnyOptimisticOracleInterface.Request memory request;

        vm.startPrank(creator);

        vm.expectRevert(bytes("Bounty must be disputed")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );
        vm.stopPrank();
    }

    function testDisputeSettledPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute
        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            0
        ); // Push price of 0 so creator wins
        
        vm.expectEmit(true, true, true, true); // Want to check the first 3 indexed event params, and the last non-indexed param
        emit FundsSent(creator, hunter, bountyAppId, "Funds sent back to creator!"); // This is the event we expect to be emitted

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter; // Setting this field

        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );

        request2.settled = true; // Set this value to true as this is the new request struct after a dispute has been settled (produced in settle in OO contract)
        vm.expectRevert(bytes("Bounty must be disputed")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request2
        );
        
        vm.stopPrank();
    }

    function testBountyResolvedPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        setUpUMA(creator, hunter);

        SkinnyOptimisticOracleInterface.Request memory request;

        vm.startPrank(creator);

        escrowContract.payout(bountyAppId, hunter);

        vm.expectRevert(bytes("Bounty must be disputed")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );
        vm.stopPrank();
    }

    function testWrongCallerPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);

        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        setUpUMA(creator, hunter);

        SkinnyOptimisticOracleInterface.Request memory request;

        vm.prank(creator);

        escrowContract.payout(bountyAppId, hunter);

        vm.expectRevert(bytes("Caller must be creator or hunter")); // Expect this revert error
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            hunter,
            1000001, 
            bytes(ancillaryData), 
            request
        );
    }

    function testWrongRequestPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        address other = address(1234);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";
        string memory ancillaryData2 = "q:Did this bounty other`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);


        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);
        weth.mint(other, 100 * 10**18); // Mint 100 WETH to other to test thrid party

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute

        vm.stopPrank();

        vm.startPrank(hunter);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        // Creator and other
        vm.prank(creator);
        escrowContract.escrow{value: 1 ether}(bountyAppId, other, expiration, address(0), 0);

        vm.prank(other);
        escrowContract.submit(bountyAppId, creator); // Submit work

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee);
        escrowContract.initiateDispute(
            bountyAppId, 
            other, 
            bondAmt, 
            ancillaryData2,
            weth
        ); // Initiate Dispute 2 
        vm.stopPrank();

        vm.startPrank(other);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData2), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
            0
        ); // Push price of 0 so creator wins

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData2), address(escrowContract)),
            1
        ); // Push price of 1 so hunter (other) wins
        

        SkinnyOptimisticOracleInterface.Request memory request2;
        request2.currency = weth;
        request2.reward = 0;
        request2.finalFee = 35 * 10**16;
        request2.bond = bondAmt;
        request2.customLiveness = 1 weeks;
        request2.proposer = creator;
        request2.proposedPrice = 0;
        request2.expirationTime = 1000001 + 1 weeks;
        request2.disputer = hunter;

        vm.expectRevert(bytes("Incorrect request data")); // Expect this revert error
        // Pass in hunter struct where creator wins while trying to finish bounty where other wins 
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            other,
            1000001, 
            bytes(ancillaryData), 
            request2
        );
        
        vm.stopPrank();
    }

    function testWrongRequestExpiredPayoutIfDispute() public {
        string memory bountyAppId = "AppId";
        address creator = address(0xABCD);
        address hunter = address(0xBEEF);
        address other = address(1234);
        uint expiration = 1 weeks;

        // Input variables to initiateDispute function
        uint bondAmt = 10 * 10**18; // 10 WETH bondAmt
        string memory ancillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";
        string memory ancillaryData2 = "q:Did this bounty other`'`s work fulfill the bounty specifications? Work: www.github.com Specification: arweave.com/590, p1:0, p2:1, p3:2";

        // Escrow funds first
        vm.deal(creator, 2 ether); // Give creator some eth
        vm.prank(creator); // Sets msg.sender = creator for next function call
        vm.warp(1000000); // Sets block.timestamp = 1000000

        escrowContract.escrow{value: 1 ether}(bountyAppId, hunter, expiration, address(0), 0);


        vm.prank(hunter);
        vm.warp(1000001); // Sets block.timestamp = 1000001

        escrowContract.submit(bountyAppId, creator); // Submit work

        // Test calling UMA requestAndProposePriceFor
        setUpUMA(creator, hunter);
        weth.mint(other, 100 * 10**18); // Mint 100 WETH to other to test thrid party

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on creator's behalf; should use icnreaseAllowance maybe?
        // issue with allowances as msg.sender is not creator but the Escrow Contract
        // we have to transfer the creator's assets into the escrow coontract before transferring into UMA
        // escrow contract needs to call approve then
        escrowContract.initiateDispute(
            bountyAppId, 
            hunter, 
            bondAmt, 
            ancillaryData,
            weth
        ); // Initiate Dispute

        vm.stopPrank();

        // vm.startPrank(hunter);
        // weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?

        // SkinnyOptimisticOracleInterface.Request memory request;
        // request.currency = weth;
        // request.reward = 0;
        // request.finalFee = 35 * 10**16;
        // request.bond = bondAmt;
        // request.customLiveness = 1 weeks;
        // request.proposer = creator;
        // request.proposedPrice = 0;
        // request.expirationTime = 1000001 + 1 weeks;

        // escrowContract.hunterDisputeResponse(
        //     bountyAppId, 
        //     creator, 
        //     1000001, 
        //     bytes(ancillaryData), 
        //     request 
        // ); // Hunter responds to dispute
        // vm.stopPrank();

        // Creator and other
        vm.prank(creator);
        escrowContract.escrow{value: 1 ether}(bountyAppId, other, expiration, address(0), 0);

        vm.prank(other);
        escrowContract.submit(bountyAppId, creator); // Submit work

        vm.startPrank(creator);
        weth.approve(address(escrowContract), bondAmt + finalFee);
        escrowContract.initiateDispute(
            bountyAppId, 
            other, 
            bondAmt, 
            ancillaryData2,
            weth
        ); // Initiate Dispute 2 
        vm.stopPrank();

        vm.startPrank(other);
        weth.approve(address(escrowContract), bondAmt + finalFee); // Approve escrowContract contract to spend on hunter's behalf; should use icnreaseAllowance maybe?
        SkinnyOptimisticOracleInterface.Request memory request;
        request.currency = weth;
        request.reward = 0;
        request.finalFee = 35 * 10**16;
        request.bond = bondAmt;
        request.customLiveness = 1 weeks;
        request.proposer = creator;
        request.proposedPrice = 0;
        request.expirationTime = 1000001 + 1 weeks;

        escrowContract.hunterDisputeResponse(
            bountyAppId, 
            creator, 
            1000001, 
            bytes(ancillaryData2), 
            request 
        ); // Hunter responds to dispute
        vm.stopPrank();

        vm.startPrank(creator);

        // mockDVM.pushPrice(
        //     bytes32("YES_OR_NO_QUERY"), 
        //     1000001, 
        //     optimisticOracle.stampAncillaryData(bytes(ancillaryData), address(escrowContract)),
        //     0
        // ); // Push price of 0 so creator wins

        mockDVM.pushPrice(
            bytes32("YES_OR_NO_QUERY"), 
            1000001, 
            optimisticOracle.stampAncillaryData(bytes(ancillaryData2), address(escrowContract)),
            1
        ); // Push price of 1 so hunter (other) wins
        

        // SkinnyOptimisticOracleInterface.Request memory request2;
        // request2.currency = weth;
        // request2.reward = 0;
        // request2.finalFee = 35 * 10**16;
        // request2.bond = bondAmt;
        // request2.customLiveness = 1 weeks;
        // request2.proposer = creator;
        // request2.proposedPrice = 0;
        // request2.expirationTime = 1000001 + 1 weeks;
        // request2.disputer = hunter;

        optimisticOracle.setCurrentTime(1000001 + 1 weeks + 1); // Set timestamp in DVM so that the creator's dispute intiation will be expired for creator - hunter

        vm.expectRevert(bytes("Incorrect hunter specified")); // Expect this revert error
        // Pass in hunter struct where creator wins while trying to finish bounty where other wins 
        escrowContract.payoutIfDispute(
            bountyAppId, 
            creator,
            other,
            1000001, 
            bytes(ancillaryData), 
            request
        );
        
        vm.stopPrank();
    }
}
