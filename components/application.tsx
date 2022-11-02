import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AppCard from './appCard';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction, useContract, useEnsName, useNetwork, useAccount, useContractRead } from 'wagmi';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import { Request } from '../getUMAEventData';
import wethABI from '../WETH9.json';
import styles from '../styles/Home.module.css';
import IncreaseAllowance from './increaseAllowance';
import erc20ABI from '../cornucopia-contracts/out/ERC20.sol/ERC20.json';

// TODO: 
// Finish increase allowance logic
// Check in this component if you need to increase and if so call the component otherwise don't; 
// The component should render above the button which will hopefully block it out and all that's needed if for the debounced erc20 
// Address to be logged and then a bool for the increaseAllowance popup to show should then be passed to it
// Then below the button can proceed as usual

type Props = {
    person: string;
    experience: string;
    contactInfo: string;
    arweaveHash: string;
    appLinks: Array<string>;
    appStatus?: string;
    postId?: string;
    amount?: string;
    workLinks?: Array<string>;
    postLinks?: Array<string>;
    timestamp?: number;
    ancillaryData?: string; // Ancillary Data in byte form from UMA event used during payoutIfDispute call
    request?: Request; 
    tokenAddress?: string;
    tokenDecimals?: number; 
};

// Escrow Contract Config
const contractConfig = {
  addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
  contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// WETH Contract Config
const wethContractConfig = {
  addressOrName: process.env.NEXT_PUBLIC_WETH_ADDRESS!, // contract address
  contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
};

const Application: React.FC<Props> = props => {

  const { data: ensName } = useEnsName({ address: props.person });
  const { chain } = useNetwork();
  const { address, isConnected } = useAccount();

  // Applied State
  const [openReject, setOpenReject] = React.useState(false);
  const [openEscrow, setOpenEscrow] = React.useState(false);
  const [allowanceIncreased, setAllowanceIncreased] = React.useState(false);
  const [bountyAppId, setBountyAppId] = React.useState('');
  const debouncedBountyAppId = useDebounce(bountyAppId, 10); // use debounce makes it so that usePrepareContractWrite is only called every 500ms by limiting bountyAppId to be updated every 500ms; prevent getting RPC rate-limited!
  const [hunterAddress, setHunterAddress] = React.useState('');
  const debouncedHunterAddress = useDebounce(hunterAddress, 10);
  const [tokenAddressERC20, setTokenAddressERC20] = React.useState('');
  const debouncedTokenAddressERC20 = useDebounce(tokenAddressERC20, 10);
  const [bountyAmtETH, setBountyAmtETH] = React.useState('' as unknown as BigNumber);
  const debouncedBountyAmtETH = useDebounce(bountyAmtETH, 10);
  const [bountyAmtERC20, setBountyAmtERC20] = React.useState('' as unknown as BigNumber);
  const debouncedBountyAmtERC20 = useDebounce(bountyAmtERC20, 10);
  const [decimals, setDecimals] = React.useState(null);
  const debouncedDecimals = useDebounce(decimals, 10);
  const bountyExpirationTime = 2*7*24*60*60;

  // Submitted State
  const [openContest, setOpenContest] = React.useState(false);
  const [openSettle, setOpenSettle] = React.useState(false);
  const [openPay, setOpenPay] = React.useState(false);
  const [ancillaryData, setAncillaryData] = React.useState('');
  const debouncedAncillaryData = useDebounce(ancillaryData, 10);
  const [umaData, setUmaData] = React.useState({
    timestamp: 0,
    ancillaryData: '',
    request: {} as Request
  });

  const bondAmt = ethers.utils.parseUnits("0.1", "ether"); // Hard-coded (for now) bondAmt
  const oracleAddress = process.env.NEXT_PUBLIC_OO_ADDRESS!; // Goerli OO
  const wethContract = useContract(wethContractConfig);

  // Applied Contract Interactions
  // set enabled to be this boolean triple so that usePrepareContractWrite doesn't run before these vars have been assigned
  const { config: escrowConfig } = usePrepareContractWrite({...contractConfig, functionName: 'escrow', args: [debouncedBountyAppId, debouncedHunterAddress, bountyExpirationTime, debouncedTokenAddressERC20, debouncedBountyAmtERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedBountyAmtETH) && Boolean(debouncedTokenAddressERC20) && Boolean(debouncedBountyAmtERC20) && Boolean(allowanceIncreased), overrides: {value: debouncedBountyAmtETH }});
  const { data: escrowData, error: escrowError, isLoading: isEscrowLoading, isSuccess: isEscrowSuccess, write: escrow } = useContractWrite(escrowConfig);
  const { data: escrowTxData, isLoading: isEscrowTxLoading, isSuccess: isEscrowTxSuccess, error: escrowTxError } = useWaitForTransaction({ hash: escrowData?.hash, enabled: true,});

  // Submitted Contract Interactions: Initiate Dispute/Payout If Dispute/Payout
  const { config: initiateDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'initiateDispute', args: [debouncedBountyAppId, debouncedHunterAddress, oracleAddress, bondAmt, debouncedAncillaryData, wethContract], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedAncillaryData), });
  const { data: initiateDisputeData, error: initiateDisputeError, isLoading: isInitiateDisputeLoading, isSuccess: isInitiateDisputeSuccess, write: initiateDispute } = useContractWrite(initiateDisputeConfig);
  const { data: initiateDisputeTxData, isLoading: isInitiateDisputeTxLoading, isSuccess: isInitiateDisputeTxSuccess, error: initiateDisputeTxError } = useWaitForTransaction({ hash: initiateDisputeData?.hash, enabled: true,});

  const { config: payoutIfDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payoutIfDispute', args: [debouncedBountyAppId, debouncedHunterAddress, umaData.timestamp, umaData.ancillaryData, umaData.request, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(umaData.timestamp) && Boolean(debouncedTokenAddressERC20), });
  const { data: payoutIfDisputeData, error: payoutIfDisputeError, isLoading: isPayoutIfDisputeLoading, isSuccess: isPayoutIfDisputeSuccess, write: payoutIfDispute } = useContractWrite(payoutIfDisputeConfig);
  const { data: payoutIfDisputeTxData, isLoading: isPayoutIfDisputeTxLoading, isSuccess: isPayoutIfDisputeTxSuccess, error: payoutIfDisputeTxError } = useWaitForTransaction({ hash: payoutIfDisputeData?.hash, enabled: true,});

  const { config: payoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payout', args: [debouncedBountyAppId, debouncedHunterAddress, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedTokenAddressERC20),});
  const { data: payoutData, error: payoutError, isLoading: isPayoutLoading, isSuccess: isPayoutSuccess, write: payout } = useContractWrite(payoutConfig);
  const { data: payoutTxData, isLoading: isPayoutTxLoading, isSuccess: isPayoutTxSuccess, error: payoutTxError } = useWaitForTransaction({ hash: payoutData?.hash, enabled: true,});

  // Applied State Helper Functions
  const handleClickOpenReject = () => {
    setOpenReject(true);
  };

  const handleCloseReject = () => {
    setOpenReject(false);
    // TODO: remove this application from the pool frontend
  };

  const handleClickOpenEscrow = () => { 
    setOpenEscrow(true);
  };

  const handleCloseEscrowTrue = (bountyAppId: string, hunterAddress: string, tokenAddress: string, bountyAmount: string, tokenDecimals: number) => {
    // setOpenEscrow(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    setTokenAddressERC20(tokenAddress);
    // setDecimals(tokenDecimals);
    
    if (tokenAddress === '0x0000000000000000000000000000000000000000') { // ETH Bounty
      setBountyAmtETH(ethers.utils.parseEther(bountyAmount));
      setBountyAmtERC20(ethers.utils.parseUnits('0', 18));
    } else { // ERC20 Bounty
      setBountyAmtETH(ethers.utils.parseEther('0'));
      setBountyAmtERC20(ethers.utils.parseUnits(bountyAmount, tokenDecimals));
    }
    // escrow?.();
  };

  const handleCloseEscrowFalse = () => {
    setOpenEscrow(false);
  };

  // Submitted State Helper Functions
  const handleCloseContestFalse = () => {
    setOpenContest(false);
  };

  const handleCloseContestTrue = (bountyAppId: string, hunterAddress: string, workLinks: Array<string>, postLinks: Array<string>) => {
    // setOpenContest(false);
    const thisAncillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications?" + " Work: " + workLinks.toString() + ", Specification: " +  postLinks.toString() + ", p1:0, p2:1, p3:2";
    setAncillaryData(thisAncillaryData);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    // initiateDispute?.();
  };

  const handleClosePayFalse = () => {
    setOpenPay(false);
  };

  const handleClosePayTrue = (bountyAppId: string, hunterAddress: string, tokenAddress: string) => {
    // setOpenPay(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    setTokenAddressERC20(tokenAddress);
    // payout?.();
  };

  const handleClickOpenContest = () => {
    setOpenContest(true);
  };

  const handleClickOpenPay = () => {
    setOpenPay(true);
  };

  const handleClickOpenSettle = () => {
    setOpenSettle(true);
  };

  const handleCloseSettleFalse = () => {
    setOpenSettle(false);
  };

  const handleCloseSettleTrue = (bountyAppId: string, hunterAddress: string, timestamp: number, ancillaryData: string, request: Request, tokenAddress: string) => {
    // setOpenSettle(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    
    setUmaData({
      timestamp: timestamp,
      ancillaryData: ancillaryData,
      request: request
    });

    setTokenAddressERC20(tokenAddress);
    // payoutIfDispute?.();
  };

  const handleIncreasedAllowance = () => {
    setAllowanceIncreased(true);
  };

  // const handleCloseIncreaseAllowanceAlwaysTrue = () => {

  // };
  


  const blockExplorer = (network: any) => {
    if (network === 'polygon') {
      return 'https://polygonscan.com/address/'
    } else if (network === 'goerli') {
      return 'https://goerli.etherscan.io/address/'
    } else if (network === 'arbitrum') {
      return 'https://arbiscan.io/address/'
    } else if (network === 'optimism') {
      return 'https://optimistic.etherscan.io/address/'
    } else if (network === 'aurora') {
      return 'https://aurorascan.dev/address/'
    }
    return 'https://etherscan.io/address/'
  };

  const blockExplorerURL = blockExplorer(chain?.network);

  if (props.person) {
    return(
      <div>
        {(isEscrowTxLoading || isEscrowTxSuccess) && 
          <SimpleSnackBar msg={isEscrowTxLoading ? 'Escrowing funds...' : 'Funds escrowed!'}/>
        }
        {(isInitiateDisputeTxLoading || isInitiateDisputeTxSuccess) && 
          <SimpleSnackBar msg={isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Dispute initiated!'}/>
        }
        {(isPayoutIfDisputeTxLoading || isPayoutIfDisputeTxSuccess) && 
          <SimpleSnackBar msg={isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Dispute settled and winner paid'}/>
        }
        {(isPayoutTxLoading || isPayoutTxSuccess) && 
          <SimpleSnackBar msg={isPayoutTxLoading ? 'Paying hunter...' : 'Hunter paid!'}/>
        }

      <Accordion square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)' }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{color: 'rgb(233, 233, 198)'}}/>}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          {/* <Typography sx={{ width: '90%', flexShrink: 0, color: 'rgb(233, 233, 198)', fontFamily: 'Space Grotesk', fontSize: '15px'}}>{ensName ? ensName : props.person}</Typography> */}
          <Typography className={styles.h2} sx={{ color: '#064829', fontSize: '15px' }}><Link sx= {{ color: 'rgb(233, 233, 198)'}} target="_blank" rel="noopener" href={blockExplorerURL + (ensName ? ensName : props.person)}>{ensName ? ensName : (props.person.slice(0,4) + '...' + props.person.slice(-4))}</Link></Typography>

        </AccordionSummary>
        <AccordionDetails>
          <AppCard  
            experience={props.experience} 
            contactInfo={props.contactInfo} 
            arweaveHash={props.arweaveHash}
            links={props.appLinks}
            workLinks={props.workLinks} 
          >
            {props.appStatus === "applied" &&
              <div> 
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseReject} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to reject this candidate?"}
                  </DialogTitle>
                  <DialogActions className={styles.formHeader}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseReject}>No I don't</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseReject} autoFocus>Yes I want to</Button>
                  </DialogActions>
                </Dialog>
                {/* <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!);}}>Escrow</Button> */}
                  {props.tokenAddress! !== '0x0000000000000000000000000000000000000000' &&
                    <>
                      <IncreaseAllowance erc20Address={props.tokenAddress!} ownerAddress={address!} amount={ethers.utils.parseUnits(props.amount!, props.tokenDecimals!)} bountyStage={'escrow'} handleIncreasedAllowance={handleIncreasedAllowance} />
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!);}}>Escrow</Button>
                    </>
                  } 
                  {props.tokenAddress! === '0x0000000000000000000000000000000000000000' &&
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleIncreasedAllowance(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!);}}>Escrow</Button>
                  }
                <Dialog
                  open={openEscrow}
                  onClose={handleCloseEscrowFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to escrow these funds?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Escrowing these funds will lock them in the smart contract and will either be paid in full to the bounty hunter,
                        refunded to you if the dispute is settled in your favor, or partially refunded if a dispute winner isn't chosen.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseEscrowFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseEscrowTrue(props.postId!, props.person, props.amount!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {escrow?.(); setOpenEscrow(false);}} autoFocus disabled={!escrow || isEscrowTxLoading}>{isEscrowTxLoading ? 'Escrowing...' : 'Yes I want to'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "submitted" &&  
              <div>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleClickOpenContest(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!);}}>Contest</Button>
                <Dialog
                  open={openContest}
                  onClose={handleCloseContestFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to dispute the bounty hunter's work?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText id="alert-dialog-description">
                        Disputing their work will open up a 7 day challenger period, in which the bounty hunter can challenge your dispute and assert 
                        that their work is up to specification. If they decide to do this, then the dispute will be escalated to UMA token holders and decided
                        within that week. Once the decision is made (please see the docs for more details on this process), the escrowed funds will either be fully 
                        refunded to you, half refunded to you, or paid out in full to the bounty hunter. If the bounty hunter doesn't challenge your dispute, then you 
                        will be refunded in full after those 7 days. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseContestFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {initiateDispute?.(); setOpenContest(false);}} autoFocus disabled={!initiateDispute || isInitiateDisputeTxLoading}>{isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenPay(); handleClosePayTrue(props.postId!, props.person, props.tokenAddress!);}}>Pay</Button>
                <Dialog
                  open={openPay}
                  onClose={handleClosePayFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to pay the bounty hunter for their work?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText id="alert-dialog-description">
                        This will release the funds from escrow and send them to the bounty hunter for their work. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClosePayFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleClosePayTrue(props.postId!, props.person)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payout?.(); setOpenPay(false);}} autoFocus disabled={!payout || isPayoutTxLoading}>{isPayoutTxLoading ? 'Paying hunter...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "settle" &&
              <div> 
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseSettleFalse} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you don't want to settle this dispute?"}
                  </DialogTitle>
                  <DialogActions className={styles.formHeader}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseSettleFalse}>No I want to settle</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseSettleFalse} autoFocus>Yes I don't want to</Button> 
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenSettle(); handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!, props.tokenAddress!);}}>Settle</Button>
                <Dialog
                  open={openSettle}
                  onClose={handleCloseSettleFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to settle this dispute?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText id="alert-dialog-description">
                        Settling this dispute will result in 1 of 3 outcomes: 
                        1. You win the dispute and your escrowed funds plus the dispute bond + dispute fee + 1/2 of the hunter's dispute bond will be sent to you; 
                        2. The hunter wins the dispute and your escrowed funds plus their dispute bond + their dispute fee + 1/2 of your dispute bond will be sent to them. 
                        3. The dispute ends in a tie and you get 1/2 of your escrowed funds back while the hunter gets 1/2 of the escrowed funds 
                        plus their dispute bond + their dispute fee + 1/2 of your dispute bond.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseSettleFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payoutIfDispute?.(); setOpenSettle(false);}} autoFocus disabled={!payoutIfDispute || isPayoutIfDisputeTxLoading}>{isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
          </AppCard>
        </AccordionDetails>
      </Accordion>
      </div>
    );
  } 
  return <> </>;
};

export default Application;