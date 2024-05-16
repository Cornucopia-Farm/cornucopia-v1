// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Cornucopia.sol";
import "./TestERC20.sol";

contract CornucopiaTest is Test {
    Cornucopia public escrowContract;
    TestERC20 public token;
    TestERC20 public weth;
    
    // Escrow Events
    event Escrowed(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event Submitted(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsForceSentToHunter(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsSent(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);
    event FundsWithdrawnToCreator(address indexed creator, address indexed hunter, string indexed bountyAppId, string message);

    function setUp() public {
        escrowContract = new Cornucopia();
        token = new TestERC20("Test Token", "TEST");
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
        
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Submitted)); // Check that Status enum set to submitted; have to cast to uint to use assertEq
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
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved 
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
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved 
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

        assertEq(uint(progress), uint(Cornucopia.Status.NoBounty)); // Check that Status enum set to NoBounty as hunter hasn't submitted work yet

        escrowContract.payout(bountyAppId, hunter);

        assertEq(escrowContractBalanceBefore - address(escrowContract).balance, creator.balance -  creatorBalanceBefore); // Check that same amount paid out to creator was deducted from the contract
        assertEq(creator.balance - creatorBalanceBefore, valueToBePaidToCreator); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved
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

        assertEq(uint(progress), uint(Cornucopia.Status.NoBounty)); // Check that Status enum set to NoBounty as hunter hasn't submitted work yet

        escrowContract.payout(bountyAppId, hunter);

        assertEq(escrowContractBalanceBefore - token.balanceOf(address(escrowContract)), token.balanceOf(creator) -  creatorBalanceBefore); // Check that same amount paid out to creator was deducted from the contract
        assertEq(token.balanceOf(creator) - creatorBalanceBefore, valueToBePaidToCreator); // Check that the value paid out to the hunter was the expected amount 
        assertEq(escrowContract.bountyAmounts(keccak256(abi.encodePacked(bountyAppId, creator, hunter))), 0); // Check that the bountyAmount corresponding to this bountyAppId, creator, hunter is set to 0
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved
        vm.stopPrank();
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
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved
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
        assertEq(uint(escrowContract.progress(keccak256(abi.encodePacked(bountyAppId, creator, hunter)))), uint(Cornucopia.Status.Resolved)); // Check that Status enum set to Resolved
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
}
