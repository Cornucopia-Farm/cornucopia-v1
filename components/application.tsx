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
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; 
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction, useContract, useEnsName, useNetwork, useAccount, useSigner, useProvider } from 'wagmi';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import { Request } from '../getUMAEventData';
import wethABI from '../WETH9.json';
import styles from '../styles/Home.module.css';
import erc20ABI from '../contracts/out/ERC20.sol/ERC20.json';
import { BountyOutcome } from '../getEscrowEventData';
import contractAddresses from '../contractAddresses.json';

type Props = {
    person: string;
    experience: string;
    contactInfo: string;
    arweaveHash: string;
    appLinks: string;
    appStatus?: string;
    postId?: string;
    amount?: string;
    workLinks?: string;
    postLinks?: string;
    timestamp?: number;
    ancillaryData?: string; // Ancillary Data in byte form from UMA event used during payoutIfDispute call
    request?: Request; 
    tokenAddress?: string;
    tokenDecimals?: number; 
    allowance?: BigNumber;
    wethAllowance?: BigNumber;
    expirationTime?: number;
    creatorRefund?: boolean;
    disputeStatus?: number;
    finishedStatus?: BountyOutcome;
};

// Escrow Contract Config
const contractConfig = {
  addressOrName: contractAddresses.escrow, // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', 
  contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// WETH Contract Config
const wethContractConfig = {
  addressOrName: contractAddresses.weth, // '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 
  contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
};

const Application: React.FC<Props> = props => {

  const { data: ensName } = useEnsName({ address: props.person });
  const { chain } = useNetwork();
  const { address, isConnected } = useAccount();
  // const { data: signer } = useSigner();
  // const provider = useProvider();

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
  const [expirationTime, setExpirationTime] = React.useState(0);
  const debouncedExpirationTime =  useDebounce(expirationTime, 10);

  // Submitted State
  const [openContest, setOpenContest] = React.useState(false);
  const [openSettle, setOpenSettle] = React.useState(false);
  const [openPay, setOpenPay] = React.useState(false);
  const [payoutBool, setPayoutBool] = React.useState(false);
  const debouncedPayoutBool = useDebounce(payoutBool, 10);
  const [ancillaryData, setAncillaryData] = React.useState('');
  const debouncedAncillaryData = useDebounce(ancillaryData, 10);
  const [timestamp, setTimestamp] = React.useState(0);
  const debouncedTimestamp = useDebounce(timestamp, 10);
  const [request, setRequest] = React.useState({} as Request);
  const debouncedRequest = useDebounce(request, 10);

  const bondAmt = ethers.utils.parseUnits("0.1", "ether"); // Hard-coded (for now) bondAmt
  const finalFee = ethers.utils.parseUnits("0.35", "ether"); // Hard-coded finalFee (Set by UMA)
  const wethContract = useContract({...wethContractConfig});
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  // Applied Contract Interactions
  const { config: escrowConfig } = usePrepareContractWrite({...contractConfig, functionName: 'escrow', args: [debouncedBountyAppId, debouncedHunterAddress, debouncedExpirationTime, debouncedTokenAddressERC20, debouncedBountyAmtERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedExpirationTime) && Boolean(debouncedBountyAmtETH) && Boolean(debouncedTokenAddressERC20) && Boolean(debouncedBountyAmtERC20) && Boolean(allowanceIncreased), overrides: {value: debouncedBountyAmtETH }});
  const { data: escrowData, error: escrowError, isLoading: isEscrowLoading, isSuccess: isEscrowSuccess, write: escrow } = useContractWrite(escrowConfig);
  const { data: escrowTxData, isLoading: isEscrowTxLoading, isSuccess: isEscrowTxSuccess, error: escrowTxError } = useWaitForTransaction({ hash: escrowData?.hash, enabled: true,});

  // Submitted Contract Interactions: Initiate Dispute/Payout If Dispute/Payout
  const { config: initiateDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'initiateDispute', args: [debouncedBountyAppId, debouncedHunterAddress, bondAmt, debouncedAncillaryData, wethContract.address], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedAncillaryData) && Boolean(allowanceIncreased), });
  const { data: initiateDisputeData, error: initiateDisputeError, isLoading: isInitiateDisputeLoading, isSuccess: isInitiateDisputeSuccess, write: initiateDispute } = useContractWrite(initiateDisputeConfig);
  const { data: initiateDisputeTxData, isLoading: isInitiateDisputeTxLoading, isSuccess: isInitiateDisputeTxSuccess, error: initiateDisputeTxError } = useWaitForTransaction({ hash: initiateDisputeData?.hash, enabled: true,});

  const { config: payoutIfDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payoutIfDispute', args: [debouncedBountyAppId, address, debouncedHunterAddress, debouncedTimestamp, debouncedAncillaryData, debouncedRequest], enabled: Boolean(debouncedBountyAppId) && Boolean(address) && Boolean(debouncedHunterAddress) && Boolean(debouncedTimestamp) && Boolean(debouncedAncillaryData) && Boolean(debouncedRequest), });
  const { data: payoutIfDisputeData, error: payoutIfDisputeError, isLoading: isPayoutIfDisputeLoading, isSuccess: isPayoutIfDisputeSuccess, write: payoutIfDispute } = useContractWrite(payoutIfDisputeConfig);
  const { data: payoutIfDisputeTxData, isLoading: isPayoutIfDisputeTxLoading, isSuccess: isPayoutIfDisputeTxSuccess, error: payoutIfDisputeTxError } = useWaitForTransaction({ hash: payoutIfDisputeData?.hash, enabled: true,});

  const { config: payoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payout', args: [debouncedBountyAppId, debouncedHunterAddress], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedPayoutBool),});
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

  const handleCloseEscrowTrue = (bountyAppId: string, hunterAddress: string, tokenAddress: string, bountyAmount: string, tokenDecimals: number, expirationTime: number) => {
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    setTokenAddressERC20(tokenAddress);
    setExpirationTime(expirationTime);
    
    if (tokenAddress === zeroAddress) { // ETH Bounty
      setBountyAmtETH(ethers.utils.parseEther(bountyAmount));
      setBountyAmtERC20(ethers.utils.parseUnits('0', 18));
    } else { // ERC20 Bounty
      setBountyAmtETH(ethers.utils.parseEther('0'));
      setBountyAmtERC20(ethers.utils.parseUnits(bountyAmount, tokenDecimals));
    }
  };

  const handleCloseEscrowFalse = () => {
    setOpenEscrow(false);
  };

  // Submitted State Helper Functions
  const handleCloseContestFalse = () => {
    setOpenContest(false);
  };

  const handleCloseContestTrue = (bountyAppId: string, hunterAddress: string, workLinks: string, postLinks: string) => {
    const thisAncillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications?" + " Work: " + workLinks + ", Specification: " +  postLinks + ", p1:0, p2:1, p3:2";
    setAncillaryData(thisAncillaryData);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
  };

  const handleClosePayFalse = () => {
    setOpenPay(false);
  };

  const handleClosePayTrue = (bountyAppId: string, hunterAddress: string) => {
    // setOpenPay(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    // setTokenAddressERC20(tokenAddress);
    setPayoutBool(true);
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

  const handleCloseSettleTrue = (bountyAppId: string, hunterAddress: string, timestamp: number, ancillaryData: string, request: Request) => {
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    setTimestamp(timestamp);
    setAncillaryData(ancillaryData);
    setRequest(request);
    // setTokenAddressERC20(tokenAddress);
  };

  
  const [openAllowance, setOpenAllowance] = React.useState(false);
  const [allowanceAmtOnce, setAllowanceAmtOnce] = React.useState('' as unknown as BigNumber);
  const [allowanceAmtAlways, setAllowanceAmtAlways] = React.useState('' as unknown as BigNumber);
  const debouncedAllowanceAmtOnce = useDebounce(allowanceAmtOnce, 10);
  const debouncedAllowanceAmtAlways = useDebounce(allowanceAmtAlways, 10);

  const erc20ContractConfig = {
    addressOrName: debouncedTokenAddressERC20, // contract address
    contractInterface: erc20ABI['abi'], // contract abi in json or JS format
  };

  const escrowAddress = contractAddresses.escrow; // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4'; 
  const hexAlwaysApprove = '0x8000000000000000000000000000000000000000000000000000000000000000';

  const { config: increaseAllowanceOnceConfig } = usePrepareContractWrite({...erc20ContractConfig, functionName: 'increaseAllowance', args: [escrowAddress, debouncedAllowanceAmtOnce], enabled: Boolean(debouncedAllowanceAmtOnce), });
  const { data: increaseAllowanceOnceData, error: increaseAllowanceOnceError, isLoading: isIncreaseAllowanceOnceLoading, isSuccess: isIncreaseAllowanceOnceSuccess, write: increaseAllowanceOnce } = useContractWrite(increaseAllowanceOnceConfig);
  const { data: increaseAllowanceOnceTxData, isLoading: isIncreaseAllowanceOnceTxLoading, isSuccess: isIncreaseAllowanceOnceTxSuccess, error: increaseAllowanceOnceTxError } = useWaitForTransaction({ hash: increaseAllowanceOnceData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});

  const { config: increaseAllowanceAlwaysConfig } = usePrepareContractWrite({...erc20ContractConfig, functionName: 'increaseAllowance', args: [escrowAddress, debouncedAllowanceAmtAlways], enabled: Boolean(debouncedAllowanceAmtAlways), });
  const { data: increaseAllowanceAlwaysData, error: increaseAllowanceAlwaysError, isLoading: isIncreaseAllowanceAlwaysLoading, isSuccess: isIncreaseAllowanceAlwaysSuccess, write: increaseAllowanceAlways } = useContractWrite(increaseAllowanceAlwaysConfig);
  const { data: increaseAllowanceAlwaysTxData, isLoading: isIncreaseAllowanceAlwaysTxLoading, isSuccess: isIncreaseAllowanceAlwaysTxSuccess, error: increaseAllowanceAlwaysTxError } = useWaitForTransaction({ hash: increaseAllowanceAlwaysData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});

  const { config: approveOnceConfig } = usePrepareContractWrite({...wethContractConfig, functionName: 'approve', args: [escrowAddress, debouncedAllowanceAmtOnce], enabled: Boolean(debouncedAllowanceAmtOnce), });
  const { data: approveOnceData, error: approveOnceError, isLoading: isApproveOnceLoading, isSuccess: isApproveOnceSuccess, write: approveOnce } = useContractWrite(approveOnceConfig);
  const { data: approveOnceTxData, isLoading: isApproveOnceTxLoading, isSuccess: isApproveOnceTxSuccess, error: approveOnceTxError } = useWaitForTransaction({ hash: approveOnceData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});

  const { config: approveAlwaysConfig } = usePrepareContractWrite({...wethContractConfig, functionName: 'approve', args: [escrowAddress, debouncedAllowanceAmtAlways], enabled: Boolean(debouncedAllowanceAmtAlways), });
  const { data: approveAlwaysData, error: approveAlwaysError, isLoading: isApproveAlwaysLoading, isSuccess: isApproveAlwaysSuccess, write: approveAlways } = useContractWrite(approveAlwaysConfig);
  const { data: approveAlwaysTxData, isLoading: isApproveAlwaysTxLoading, isSuccess: isApproveAlwaysTxSuccess, error: approveAlwaysTxError } = useWaitForTransaction({ hash: approveAlwaysData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});

  const handleCloseIncreaseAllowanceFalse = () => {
    setOpenAllowance(false);
  };

  const handleCloseIncreaseAllowanceEscrowOnceTrue = (amount: string, decimals: number, allowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, expirationTime: number) => {
    const amountBN = ethers.utils.parseUnits(amount, decimals);

    if (amountBN.gt(allowance)) {
      setAllowanceAmtOnce(amountBN);
      setTokenAddressERC20(tokenAddress);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseEscrowTrue(bountyAppId, hunterAddress, tokenAddress, amount, decimals, expirationTime);
      handleClickOpenEscrow();
    }
  };

  const handleCloseIncreaseAllowanceEscrowAlwaysTrue = (amount: string, decimals: number, allowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, expirationTime: number) => {
    const amountBN = ethers.utils.parseUnits(amount, decimals);

    if (amountBN.gt(allowance)) {
      setAllowanceAmtAlways(BigNumber.from(hexAlwaysApprove));
      setTokenAddressERC20(tokenAddress);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseEscrowTrue(bountyAppId, hunterAddress, tokenAddress, amount, decimals, expirationTime);
      handleClickOpenEscrow();
    }
  };

  const handleCloseIncreaseAllowanceDisputeOnceTrue = (amount: string, decimals: number, wethAllowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, workLinks: string, postLinks: string) => {
    const total = bondAmt.add(finalFee);
    if (total.gt(wethAllowance)) {
      setAllowanceAmtOnce(total);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseContestTrue(bountyAppId, hunterAddress, workLinks, postLinks);
      handleClickOpenContest();
    }
  };

  const handleCloseIncreaseAllowanceDisputeAlwaysTrue = (amount: string, decimals: number, wethAllowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, workLinks: string, postLinks: string) => {
    const total = bondAmt.add(finalFee);
    if (total.gt(wethAllowance)) {
      setAllowanceAmtAlways(BigNumber.from(hexAlwaysApprove));
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseContestTrue(bountyAppId, hunterAddress, workLinks, postLinks);
      handleClickOpenContest();
    }
  };

  const handleIncreasedAllowance = () => {
    setAllowanceIncreased(true);
  };
  
  const blockExplorer = (network: string | undefined) => {
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
        {(isEscrowTxLoading || (isEscrowTxSuccess && escrowTxData?.status === 1)) && 
          <SimpleSnackBar severity={'success'} msg={isEscrowTxLoading ? 'Escrowing funds...' : 'Funds escrowed!'}/>
        }
        {(isEscrowTxSuccess && escrowTxData?.status === 0) && 
          <SimpleSnackBar severity={'error'} msg={'Escrow transaction failed!'}/>
        }
        {(props.creatorRefund && (isPayoutTxLoading || (isPayoutTxSuccess && payoutTxData?.status === 1))) && 
          <SimpleSnackBar severity={'success'} msg={isPayoutTxLoading ? 'Refunding...' : 'Refunded!'}/>
        }
        {(props.creatorRefund && isPayoutTxSuccess && payoutTxData?.status === 0) && 
          <SimpleSnackBar severity={'error'} msg={'Refund transaction failed!'}/>
        }
        {(isInitiateDisputeTxLoading || (isInitiateDisputeTxSuccess && initiateDisputeTxData?.status === 1)) && 
          <SimpleSnackBar severity={'success'} msg={isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Dispute initiated!'}/>
        }
        {(isInitiateDisputeTxSuccess && initiateDisputeTxData?.status === 0) && 
          <SimpleSnackBar severity={'error'} msg={'Initiate Dispute transaction failed!'}/>
        }
        {(isPayoutIfDisputeTxLoading || (isPayoutIfDisputeTxSuccess && payoutIfDisputeTxData?.status === 1)) && 
          <SimpleSnackBar severity={'success'} msg={isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Dispute settled and winner paid'}/>
        }
        {(isPayoutIfDisputeSuccess && payoutIfDisputeTxData?.status === 0) && 
          <SimpleSnackBar severity={'error'} msg={'Settle Dispute transaction failed!'}/>
        }
        {(isPayoutTxLoading || (isPayoutTxSuccess && payoutTxData?.status === 1)) && 
          <SimpleSnackBar severity={'success'} msg={isPayoutTxLoading ? 'Paying hunter...' : 'Hunter paid!'}/>
        }
        {(isPayoutTxSuccess && payoutTxData?.status === 0) && 
          <SimpleSnackBar severity={'error'} msg={'Payout transaction failed!'}/>
        }
        {(isIncreaseAllowanceOnceTxLoading || isIncreaseAllowanceOnceTxSuccess) && 
          <SimpleSnackBar severity={'success'} msg={isIncreaseAllowanceOnceTxLoading ? 'Increasing allowance once...' : 'Allowance increased once!'}/>
        }
        {(isIncreaseAllowanceAlwaysTxLoading || isIncreaseAllowanceAlwaysTxSuccess) && 
          <SimpleSnackBar severity={'success'} msg={isIncreaseAllowanceAlwaysTxLoading ? 'Increasing allowance always...' : 'Allowance increased always!'}/>
        }
        {(isApproveOnceTxLoading || isApproveOnceTxSuccess) && 
          <SimpleSnackBar severity={'success'} msg={isApproveOnceTxLoading ? 'Approving once...' : 'Approved once!'}/>
        }
        {(isApproveAlwaysTxLoading || isApproveAlwaysTxSuccess) && 
          <SimpleSnackBar severity={'success'} msg={isApproveAlwaysTxLoading ? 'Approving always...' : 'Approved always!'}/>
        }

      <Accordion square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)', boxShadow: '0px 0px 3px rgb(248, 215, 154)', }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'rgb(233, 233, 198)', }}/>}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography className={styles.h2} sx={{ color: '#064829', fontSize: '15px', }}>
            <Link sx= {{ color: 'rgb(233, 233, 198)', }} target="_blank" rel="noopener" href={blockExplorerURL + (ensName ? ensName : props.person)}>{ensName ? ensName : (props.person.slice(0,4) + '...' + props.person.slice(-4))}</Link>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <AppCard  
            experience={props.experience} 
            contactInfo={props.contactInfo} 
            arweaveHash={props.arweaveHash}
            links={props.appLinks}
            workLinks={props.workLinks} 
            finishedStatus={props.finishedStatus}
          >
            {props.appStatus === "applied" &&
              <div> 
                <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px', }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseReject} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none", }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to reject this candidate?"}
                  </DialogTitle>
                  <DialogActions className={styles.formFooter}>
                      <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px', }} onClick={handleCloseReject}>No I don&apos;t</Button>
                      <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', }} onClick={handleCloseReject} autoFocus>Yes I want to</Button>
                  </DialogActions>
                </Dialog>
                  {props.tokenAddress! !== zeroAddress &&
                    <>
                      <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', }} onClick={() => {handleCloseIncreaseAllowanceEscrowOnceTrue(props.amount!, props.tokenDecimals!, props.allowance!, props.postId!, props.person, props.tokenAddress!, props.expirationTime!); handleCloseIncreaseAllowanceEscrowAlwaysTrue(props.amount!, props.tokenDecimals!, props.allowance!, props.postId!, props.person, props.tokenAddress!, props.expirationTime!);}}>Escrow</Button>
                      <Dialog open={openAllowance} onClose={handleCloseIncreaseAllowanceFalse} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', }, }}>
                        <DialogTitle className={styles.formHeader}>Increase Allowance</DialogTitle>
                        <DialogContent className={styles.cardBackground}>
                            <DialogContentText className={styles.dialogBody}>
                            To use an ERC-20 token with Cornucopia, you must first allow Cornucopia to transfer tokens from your wallet to the
                            protocol contract to escrow the funds for the bounty. 
                            <br />
                            <br />
                            You can choose either to allow Cornucopia to spend an unlimited amount of funds so you wont have to approve Cornucopia 
                            everytime you create a bounty or you can choose to just allow Cornucopia to spend the funds you want to esrow. While the 
                            former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.   
                            </DialogContentText>    
                        </DialogContent> 
                        <DialogActions className={styles.formFooter}>
                            <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px', }} onClick={() => {increaseAllowanceAlways?.(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!, props.expirationTime!); handleCloseIncreaseAllowanceFalse(); handleClickOpenEscrow(); }} autoFocus disabled={!increaseAllowanceAlways || isIncreaseAllowanceAlwaysTxLoading}>{isIncreaseAllowanceAlwaysTxLoading ? 'Increasing Allowance...' : 'Allow Always'}</Button>
                            <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', }} onClick={() => {increaseAllowanceOnce?.(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!, props.expirationTime!); handleCloseIncreaseAllowanceFalse(); handleClickOpenEscrow(); }} autoFocus disabled={!increaseAllowanceOnce || isIncreaseAllowanceOnceTxLoading}>{isIncreaseAllowanceOnceTxLoading ? 'Increasing Allowance...' : 'Allow Once'}</Button>
                        </DialogActions>
                      </Dialog>
                    </>
                  } 
                  {props.tokenAddress! === zeroAddress &&
                    <Button variant="contained" sx={{ '&:hover': { backgroundColor: 'rgb(182, 182, 153)', }, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', }} onClick={() => {handleClickOpenEscrow(); handleIncreasedAllowance(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!, props.expirationTime!);}}>Escrow</Button>
                  }
                <Dialog
                  open={openEscrow}
                  onClose={handleCloseEscrowFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to escrow these funds?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Escrowing these funds will lock them in the smart contract and will either be paid in full to the bounty hunter,
                        refunded to you if the dispute is settled in your favor, or partially refunded if a dispute winner isn&apos;t chosen.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseEscrowFalse}>No I don&apos;t</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {escrow?.(); setOpenEscrow(false);}} autoFocus disabled={!escrow || isEscrowTxLoading}>{isEscrowTxLoading ? 'Escrowing...' : 'Yes I want to'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.creatorRefund &&
              <div>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenPay(); handleClosePayTrue(props.postId!, props.person);}}>Refund</Button>
                <Dialog
                  open={openPay}
                  onClose={handleClosePayFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to refund your escrowed funds for this bounty?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        This will release the funds from escrow and send them back to you. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClosePayFalse}>No I don&apos;t</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payout?.(); setOpenPay(false);}} autoFocus disabled={!payout || isPayoutTxLoading}>{isPayoutTxLoading ? 'Refunding...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "submitted" &&  
              <div>      
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleCloseIncreaseAllowanceDisputeOnceTrue(props.amount!, props.tokenDecimals!, props.wethAllowance!, props.postId!, props.person, props.tokenAddress!, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceDisputeAlwaysTrue(props.amount!, props.tokenDecimals!, props.wethAllowance!, props.postId!, props.person, props.tokenAddress!, props.workLinks!, props.postLinks!);}}>Contest</Button>
                <Dialog open={openAllowance} onClose={handleCloseIncreaseAllowanceFalse} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                  <DialogTitle className={styles.formHeader}>Approve</DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                      <DialogContentText className={styles.dialogBody}>
                      To initiate a dispute as a creator, you must put up a bond of 0.1 WETH plus an UMA protocol fee of 0.35 WETH. To put up this bond, you must first allow 
                      Cornucopia to transfer tokens from your wallet to the protocol contract, which are then transferred into the UMA Optimistic Oracle contract.
                      <br />
                      <br />
                      You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won&apos;t have to approve Cornucopia 
                      everytime you dispute a bounty or you can choose to just allow Cornucopia to spend the dispute bond amount. While the 
                      former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.    
                      </DialogContentText>    
                  </DialogContent> 
                  <DialogActions className={styles.formFooter}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {approveAlways?.(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceFalse(); handleClickOpenContest(); }} autoFocus disabled={!approveAlways || isApproveAlwaysTxLoading}>{isApproveAlwaysTxLoading ? 'Approving...' : 'Approve Always'}</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {approveOnce?.(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceFalse(); handleClickOpenContest(); }} autoFocus disabled={!approveOnce || isApproveOnceTxLoading}>{isApproveOnceTxLoading ? 'Approving...' : 'Approve Once'}</Button>
                  </DialogActions>
                </Dialog>
                <Dialog
                  open={openContest}
                  onClose={handleCloseContestFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to dispute the bounty hunter's work?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Disputing their work will open up a 7 day challenger period, in which the bounty hunter can challenge your dispute and assert 
                        that their work is up to specification. If they decide to do this, then the dispute will be escalated to UMA token holders and decided
                        within that week. Once the decision is made (please see the docs for more details on this process), the escrowed funds will either be fully 
                        refunded to you, half refunded to you, or paid out in full to the bounty hunter. If the bounty hunter doesn&apos;t challenge your dispute, then you 
                        will be refunded in full after those 7 days. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseContestFalse}>No I don&apos;t</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {initiateDispute?.(); setOpenContest(false);}} autoFocus disabled={!initiateDispute || isInitiateDisputeTxLoading}>{isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenPay(); handleClosePayTrue(props.postId!, props.person);}}>Pay</Button>
                <Dialog
                  open={openPay}
                  onClose={handleClosePayFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to pay the bounty hunter for their work?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        This will release the funds from escrow and send them to the bounty hunter for their work. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClosePayFalse}>No I don&apos;t</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payout?.(); setOpenPay(false);}} autoFocus disabled={!payout || isPayoutTxLoading}>{isPayoutTxLoading ? 'Paying hunter...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "settle" &&
              <div> 
                <Dialog
                  open={openReject!}
                  onClose={handleCloseSettleFalse} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you don't want to settle this dispute?"}
                  </DialogTitle>
                  <DialogActions className={styles.formFooter}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseSettleFalse}>No I want to settle</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseSettleFalse} autoFocus>Yes I don&apos;t want to</Button> 
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenSettle(); handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!);}}>Settle</Button>
                <Dialog
                  open={openSettle}
                  onClose={handleCloseSettleFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to settle this dispute?"}
                  </DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    {(props.disputeStatus !== 3 && props.disputeStatus !== 5) &&
                      <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Dispute still live or not settled yet.
                      </DialogContentText>
                    }
                    {(props.disputeStatus === 3 || props.disputeStatus === 5) &&
                      <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Settling this dispute will result in 1 of 3 outcomes: 
                        <br />
                        1. You win the dispute and your escrowed funds plus the dispute bond + dispute fee + 1/2 of the hunter&apos;s dispute bond will be sent to you.
                        <br />
                        2. The hunter wins the dispute and your escrowed funds plus their dispute bond + their dispute fee + 1/2 of your dispute bond will be sent to them. 
                        <br />
                        3. The dispute ends in a tie and you get 1/2 of your escrowed funds back while the hunter gets 1/2 of the escrowed funds
                        plus their dispute bond + their dispute fee + 1/2 of your dispute bond.
                      </DialogContentText>
                    }
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseSettleFalse}>No I don&apos;t</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payoutIfDispute?.(); setOpenSettle(false);}} autoFocus disabled={(props.disputeStatus !== 3 && props.disputeStatus !== 5) || !payoutIfDispute || isPayoutIfDisputeTxLoading}>{isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Yes I want to'}</Button>
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