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
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction, useContract, useEnsName, useNetwork, useAccount, useContractRead, useSigner, useProvider } from 'wagmi';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import { Request } from '../getUMAEventData';
import wethABI from '../WETH9.json';
import styles from '../styles/Home.module.css';
import IncreaseAllowance from './increaseAllowance';
import erc20ABI from '../cornucopia-contracts/out/ERC20.sol/ERC20.json';
import { CollectionsOutlined } from '@mui/icons-material';

// TODO: 
// Toast popup for increaseAllowance popup!
// Delay in reading allowance and then processing it meaning you have to try twice to submit tx so is there a way to do a prepare like method? issue is read is async


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
    allowance?: BigNumber;
    wethAllowance?: BigNumber;
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

// WETH Contract ERC-20 Config
const wethERC20ContractConfig = {
  addressOrName: process.env.NEXT_PUBLIC_WETH_ADDRESS!, // contract address
  contractInterface: erc20ABI['abi'], // contract abi in json or JS format
};

const Application: React.FC<Props> = props => {

  const { data: ensName } = useEnsName({ address: props.person });
  const { chain } = useNetwork();
  const { address, isConnected } = useAccount();
  const { data: signer } = useSigner();
  const provider = useProvider();

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
  const bountyExpirationTime = 2*7*24*60*60; // TODO: need to fix this to be the due date!!

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
  const finalFee = ethers.utils.parseUnits("0.35", "ether"); // Hard-coded finalFee
  const oracleAddress = process.env.NEXT_PUBLIC_OO_ADDRESS!; // Goerli OO
  const wethContract = useContract({...wethContractConfig});
  // const wethContract = new ethers.Contract(process.env.NEXT_PUBLIC_WETH_ADDRESS!, erc20ABI['abi'], signer!);
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  // Applied Contract Interactions
  // set enabled to be this boolean triple so that usePrepareContractWrite doesn't run before these vars have been assigned
  const { config: escrowConfig } = usePrepareContractWrite({...contractConfig, functionName: 'escrow', args: [debouncedBountyAppId, debouncedHunterAddress, bountyExpirationTime, debouncedTokenAddressERC20, debouncedBountyAmtERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedBountyAmtETH) && Boolean(debouncedTokenAddressERC20) && Boolean(debouncedBountyAmtERC20) && Boolean(allowanceIncreased), overrides: {value: debouncedBountyAmtETH }});
  const { data: escrowData, error: escrowError, isLoading: isEscrowLoading, isSuccess: isEscrowSuccess, write: escrow } = useContractWrite(escrowConfig);
  const { data: escrowTxData, isLoading: isEscrowTxLoading, isSuccess: isEscrowTxSuccess, error: escrowTxError } = useWaitForTransaction({ hash: escrowData?.hash, enabled: true,});

  // Submitted Contract Interactions: Initiate Dispute/Payout If Dispute/Payout
  const { config: initiateDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'initiateDispute', args: [debouncedBountyAppId, debouncedHunterAddress, oracleAddress, bondAmt, debouncedAncillaryData, wethContract.address], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedAncillaryData) && Boolean(allowanceIncreased), overrides: { gasLimit: 250000 }});
  const { data: initiateDisputeData, error: initiateDisputeError, isLoading: isInitiateDisputeLoading, isSuccess: isInitiateDisputeSuccess, write: initiateDispute } = useContractWrite(initiateDisputeConfig);
  const { data: initiateDisputeTxData, isLoading: isInitiateDisputeTxLoading, isSuccess: isInitiateDisputeTxSuccess, error: initiateDisputeTxError } = useWaitForTransaction({ hash: initiateDisputeData?.hash, enabled: true,});

  const { config: payoutIfDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payoutIfDispute', args: [debouncedBountyAppId, debouncedHunterAddress, umaData.timestamp, umaData.ancillaryData, umaData.request, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(umaData.timestamp) && Boolean(debouncedTokenAddressERC20), });
  const { data: payoutIfDisputeData, error: payoutIfDisputeError, isLoading: isPayoutIfDisputeLoading, isSuccess: isPayoutIfDisputeSuccess, write: payoutIfDispute } = useContractWrite(payoutIfDisputeConfig);
  const { data: payoutIfDisputeTxData, isLoading: isPayoutIfDisputeTxLoading, isSuccess: isPayoutIfDisputeTxSuccess, error: payoutIfDisputeTxError } = useWaitForTransaction({ hash: payoutIfDisputeData?.hash, enabled: true,});

  const { config: payoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payout', args: [debouncedBountyAppId, debouncedHunterAddress, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedTokenAddressERC20),});
  const { data: payoutData, error: payoutError, isLoading: isPayoutLoading, isSuccess: isPayoutSuccess, write: payout } = useContractWrite(payoutConfig);
  const { data: payoutTxData, isLoading: isPayoutTxLoading, isSuccess: isPayoutTxSuccess, error: payoutTxError } = useWaitForTransaction({ hash: payoutData?.hash, enabled: true,});

  console.log(debouncedBountyAppId)
  console.log(debouncedHunterAddress)
  console.log(oracleAddress)
  console.log(bondAmt)
  console.log(debouncedAncillaryData)
  console.log(wethContract)
  console.log(allowanceIncreased)
  console.log(initiateDispute)
  console.log(initiateDisputeConfig)
  console.log()
  console.log('weth contract', wethContract)
  console.log('provider', provider)
  // console.log(wethContract.callStatic.name())

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
    
    if (tokenAddress === zeroAddress) { // ETH Bounty
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

  
  const [openAllowance, setOpenAllowance] = React.useState(false);
  const [allowanceAmtOnce, setAllowanceAmtOnce] = React.useState('' as unknown as BigNumber);
  const [allowanceAmtAlways, setAllowanceAmtAlways] = React.useState('' as unknown as BigNumber);
  const debouncedAllowanceAmtOnce = useDebounce(allowanceAmtOnce, 10);
  const debouncedAllowanceAmtAlways = useDebounce(allowanceAmtAlways, 10);

  const erc20ContractConfig = {
    addressOrName: debouncedTokenAddressERC20, // contract address
    contractInterface: erc20ABI['abi'], // contract abi in json or JS format
  };

  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
  const hexAlwaysApprove = '0x8000000000000000000000000000000000000000000000000000000000000000';
  // const { data: signer, isError, isLoading } = useSigner();
  // const erc20Contract = useContract({...erc20ContractConfig, signerOrProvider: signer});

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


  // const { data: allowanceData, error: isAllowanceError, isLoading: isAllowanceLoading, refetch: getAllowance} = useContractRead({...erc20ContractConfig, functionName: 'allowance', args: [address, escrowAddress], enabled: Boolean(address), });

  // React.useEffect(() => {
  //   if (allowanceData) {
  //     setAllowance(BigNumber.from(allowanceData));
  //   }
    
  // }, [allowanceData]);

  // const getAllowance = async () => {
  //   console.log(address)
  //   console.log(escrowAddress)
  //   const thisAllowance: BigNumber = await erc20Contract.allowance(address, escrowAddress);
  //   console.log(thisAllowance)
  //   setAllowance(thisAllowance);
  // };

  // React.useEffect(() => {
  //   if (debouncedTokenAddressERC20) {
  //     getAllowance();
  //   }
    
  // }, [debouncedTokenAddressERC20])


  // const handleClickOpenIncreaseAllowance = (tokenAddress: string) => {
  //   setTokenAddressERC20(tokenAddress);
  //   setOpenAllowance(true);
  // };

  const handleCloseIncreaseAllowanceFalse = () => {
    setOpenAllowance(false);
  };

  const handleCloseIncreaseAllowanceEscrowOnceTrue = (amount: string, decimals: number, allowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string) => {
    const amountBN = ethers.utils.parseUnits(amount, decimals);

    if (amountBN.gt(allowance)) {
      setAllowanceAmtOnce(amountBN);
      setTokenAddressERC20(tokenAddress);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseEscrowTrue(bountyAppId, hunterAddress, tokenAddress, amount, decimals);
      handleClickOpenEscrow();
    }
  };

  const handleCloseIncreaseAllowanceEscrowAlwaysTrue = (amount: string, decimals: number, allowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string) => {
    const amountBN = ethers.utils.parseUnits(amount, decimals);

    if (amountBN.gt(allowance)) {
      setAllowanceAmtAlways(BigNumber.from(hexAlwaysApprove));
      setTokenAddressERC20(tokenAddress);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseEscrowTrue(bountyAppId, hunterAddress, tokenAddress, amount, decimals);
      handleClickOpenEscrow();
    }
  };

  const handleCloseIncreaseAllowanceDisputeOnceTrue = (amount: string, decimals: number, wethAllowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, workLinks: Array<string>, postLinks: Array<string>) => {
    // const amountBN = ethers.utils.parseUnits(amount, decimals);
    const total = bondAmt.add(finalFee);
    if (total.gt(wethAllowance)) {
      setAllowanceAmtOnce(total);
      // setTokenAddressERC20(tokenAddress);
      setOpenAllowance(true);
    } else {
      setAllowanceIncreased(true); // Allowance sufficient for amount
      handleCloseContestTrue(bountyAppId, hunterAddress, workLinks, postLinks);
      handleClickOpenContest();
    }
  };

  const handleCloseIncreaseAllowanceDisputeAlwaysTrue = (amount: string, decimals: number, wethAllowance: BigNumber, bountyAppId: string, hunterAddress: string, tokenAddress: string, workLinks: Array<string>, postLinks: Array<string>) => {
    // const amountBN = ethers.utils.parseUnits(amount, decimals);
    const total = bondAmt.add(finalFee);
    if (total.gt(wethAllowance)) {
      setAllowanceAmtAlways(BigNumber.from(hexAlwaysApprove));
      // setTokenAddressERC20(tokenAddress);
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

  // const handleCloseIncreaseAllowanceAlwaysTrue = () => {

  // };
  
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
  console.log('tx data', initiateDisputeTxData)

  if (props.person) {
    return(
      <div>
        {(isEscrowTxLoading || (isEscrowTxSuccess && escrowTxData?.status === 1)) && 
          <SimpleSnackBar msg={isEscrowTxLoading ? 'Escrowing funds...' : 'Funds escrowed!'}/>
        }
        {(isEscrowTxSuccess && escrowTxData?.status === 0) && 
          <SimpleSnackBar msg={'Escrow transaction failed!'}/>
        }
        {(isInitiateDisputeTxLoading || (isInitiateDisputeTxSuccess && initiateDisputeTxData?.status === 1)) && 
          <SimpleSnackBar msg={isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Dispute initiated!'}/>
        }
        {(isInitiateDisputeTxSuccess && initiateDisputeTxData?.status === 0) && 
          <SimpleSnackBar msg={'Initiate Dispute transaction failed!'}/>
        }
        {(isPayoutIfDisputeTxLoading || (isPayoutIfDisputeTxSuccess && payoutIfDisputeTxData?.status === 1)) && 
          <SimpleSnackBar msg={isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Dispute settled and winner paid'}/>
        }
        {(isPayoutIfDisputeSuccess && payoutIfDisputeTxData?.status === 0) && 
          <SimpleSnackBar msg={'Settle Dispute transaction failed!'}/>
        }
        {(isPayoutTxLoading || (isPayoutTxSuccess && payoutTxData?.status === 1)) && 
          <SimpleSnackBar msg={isPayoutTxLoading ? 'Paying hunter...' : 'Hunter paid!'}/>
        }
        {(isPayoutTxSuccess && payoutTxData?.status === 0) && 
          <SimpleSnackBar msg={'Payout transaction failed!'}/>
        }
        {(isIncreaseAllowanceOnceTxLoading || isIncreaseAllowanceOnceTxSuccess) && 
          <SimpleSnackBar msg={isIncreaseAllowanceOnceTxLoading ? 'Increasing allowance once...' : 'Allowance increased once!'}/>
        }
        {(isIncreaseAllowanceAlwaysTxLoading || isIncreaseAllowanceAlwaysTxSuccess) && 
          <SimpleSnackBar msg={isIncreaseAllowanceAlwaysTxLoading ? 'Increasing allowance always...' : 'Allowance increased always!'}/>
        }
        {(isApproveOnceTxLoading || isApproveOnceTxSuccess) && 
          <SimpleSnackBar msg={isApproveOnceTxLoading ? 'Approving once...' : 'Approved once!'}/>
        }
        {(isApproveAlwaysTxLoading || isApproveAlwaysTxSuccess) && 
          <SimpleSnackBar msg={isApproveAlwaysTxLoading ? 'Approving always...' : 'Approved always!'}/>
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
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseReject} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                >
                  <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                  {"Are you sure you want to reject this candidate?"}
                  </DialogTitle>
                  <DialogActions className={styles.formFooter}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseReject}>No I don't</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseReject} autoFocus>Yes I want to</Button>
                  </DialogActions>
                </Dialog>
                {/* <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!);}}>Escrow</Button> */}
                  {props.tokenAddress! !== zeroAddress &&
                    <>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleCloseIncreaseAllowanceEscrowOnceTrue(props.amount!, props.tokenDecimals!, props.allowance!, props.postId!, props.person, props.tokenAddress!); handleCloseIncreaseAllowanceEscrowAlwaysTrue(props.amount!, props.tokenDecimals!, props.allowance!, props.postId!, props.person, props.tokenAddress!);}}>Escrow</Button>
                      <Dialog open={openAllowance} onClose={handleCloseIncreaseAllowanceFalse} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                        <DialogTitle className={styles.formHeader}>Increase Allowance</DialogTitle>
                        <DialogContent className={styles.cardBackground}>
                            <DialogContentText className={styles.dialogBody}>
                            To use an ERC-20 token with Cornucopia, you must first allow Cornucopia to transfer tokens from your wallet to the
                            protocol contract to escrow the funds for the bounty. 
                            <br />
                            <br />
                            You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won't have to approve Cornucopia 
                            everytime you create a bounty or you can choose to just allow Cornucopia to spend the funds you want to esrow. While the 
                            former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.   
                            </DialogContentText>    
                        </DialogContent> 
                        <DialogActions className={styles.formFooter}>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {increaseAllowanceAlways?.(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!); handleCloseIncreaseAllowanceFalse(); handleClickOpenEscrow(); }} autoFocus disabled={!increaseAllowanceAlways || isIncreaseAllowanceAlwaysTxLoading}>{isIncreaseAllowanceAlwaysTxLoading ? 'Increasing Allowance...' : 'Allow Always'}</Button>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {increaseAllowanceOnce?.(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!); handleCloseIncreaseAllowanceFalse(); handleClickOpenEscrow(); }} autoFocus disabled={!increaseAllowanceOnce || isIncreaseAllowanceOnceTxLoading}>{isIncreaseAllowanceOnceTxLoading ? 'Increasing Allowance...' : 'Allow Once'}</Button>
                        </DialogActions>
                      </Dialog>
                    </>
                  } 
                  {props.tokenAddress! === zeroAddress &&
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleIncreasedAllowance(); handleCloseEscrowTrue(props.postId!, props.person, props.tokenAddress!, props.amount!, props.tokenDecimals!);}}>Escrow</Button>
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
                        refunded to you if the dispute is settled in your favor, or partially refunded if a dispute winner isn't chosen.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseEscrowFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseEscrowTrue(props.postId!, props.person, props.amount!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {escrow?.(); setOpenEscrow(false);}} autoFocus disabled={!escrow || isEscrowTxLoading}>{isEscrowTxLoading ? 'Escrowing...' : 'Yes I want to'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "submitted" &&  
              <div>
                {/* <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleClickOpenContest(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!);}}>Contest</Button> */}
                {/* {props.tokenAddress! !== zeroAddress && */}
                
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleCloseIncreaseAllowanceDisputeOnceTrue(props.amount!, props.tokenDecimals!, props.wethAllowance!, props.postId!, props.person, props.tokenAddress!, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceDisputeAlwaysTrue(props.amount!, props.tokenDecimals!, props.wethAllowance!, props.postId!, props.person, props.tokenAddress!, props.workLinks!, props.postLinks!);}}>Contest</Button>
                <Dialog open={openAllowance} onClose={handleCloseIncreaseAllowanceFalse} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                  <DialogTitle className={styles.formHeader}>Approve</DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                      <DialogContentText className={styles.dialogBody}>
                      To initiate a dispute as a creator or respond to a dispute as a hunter, you must first allow Cornucopia to transfer tokens from your wallet to the
                      protocol contract to then send these funds to the UMA contract for your dispute bond.  
                      <br />
                      <br />
                      You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won't have to approve Cornucopia 
                      everytime you dispute a bounty or you can choose to just allow Cornucopia to spend the dispute bond amount. While the 
                      former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.    
                      </DialogContentText>    
                  </DialogContent> 
                  <DialogActions className={styles.formFooter}>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {approveAlways?.(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceFalse(); handleClickOpenContest(); }} autoFocus disabled={!approveAlways || isApproveAlwaysTxLoading}>{isApproveAlwaysTxLoading ? 'Approving...' : 'Approve Always'}</Button>
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {approveOnce?.(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!); handleCloseIncreaseAllowanceFalse(); handleClickOpenContest(); }} autoFocus disabled={!approveOnce || isApproveOnceTxLoading}>{isApproveOnceTxLoading ? 'Approving...' : 'Approve Once'}</Button>
                  </DialogActions>
                </Dialog>
                
                 
                {/* {props.tokenAddress! === zeroAddress &&
                  <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleClickOpenContest(); handleIncreasedAllowance(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!);}}>Contest</Button>
                } */}
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
                        refunded to you, half refunded to you, or paid out in full to the bounty hunter. If the bounty hunter doesn't challenge your dispute, then you 
                        will be refunded in full after those 7 days. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseContestFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {initiateDispute?.(); setOpenContest(false);}} autoFocus disabled={!initiateDispute || isInitiateDisputeTxLoading}>{isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenPay(); handleClosePayTrue(props.postId!, props.person, props.tokenAddress!);}}>Pay</Button>
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
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClosePayFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleClosePayTrue(props.postId!, props.person)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payout?.(); setOpenPay(false);}} autoFocus disabled={!payout || isPayoutTxLoading}>{isPayoutTxLoading ? 'Paying hunter...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "settle" &&
              <div> 
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
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
                      <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseSettleFalse} autoFocus>Yes I don't want to</Button> 
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenSettle(); handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!, props.tokenAddress!);}}>Settle</Button>
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
                    <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                        Settling this dispute will result in 1 of 3 outcomes: 
                        1. You win the dispute and your escrowed funds plus the dispute bond + dispute fee + 1/2 of the hunter's dispute bond will be sent to you; 
                        2. The hunter wins the dispute and your escrowed funds plus their dispute bond + their dispute fee + 1/2 of your dispute bond will be sent to them. 
                        3. The dispute ends in a tie and you get 1/2 of your escrowed funds back while the hunter gets 1/2 of the escrowed funds 
                        plus their dispute bond + their dispute fee + 1/2 of your dispute bond.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseSettleFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!)} autoFocus>Yes I want to</Button> */}
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {payoutIfDispute?.(); setOpenSettle(false);}} autoFocus disabled={!payoutIfDispute || isPayoutIfDisputeTxLoading}>{isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Yes I want to'}</Button>
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