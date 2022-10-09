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
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction, useContract, useProvider, useEnsName } from 'wagmi';
import { ContractInterface, ethers } from 'ethers';
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import { Request } from '../getUMAEventData';
import wethABI from '../WETH9.json';
// need to add loading, tx waiting to be mined, txsuccess, etc when tx is created!
// Issue: submitted work posts data isn't showing up in the component for some reason hmm

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

  // Applied State
  const [openReject, setOpenReject] = React.useState(false);
  const [openEscrow, setOpenEscrow] = React.useState(false);
  const [bountyAppId, setBountyAppId] = React.useState('');
  const debouncedBountyAppId = useDebounce(bountyAppId, 10); // use debounce makes it so that usePrepareContractWrite is only called every 500ms by limiting bountyAppId to be updated every 500ms; prevent getting RPC rate-limited!
  const [hunterAddress, setHunterAddress] = React.useState('');
  const debouncedHunterAddress = useDebounce(hunterAddress, 10);
  const [bountyAmt, setBountyAmt] = React.useState('');
  const debouncedBountyAmt = useDebounce(bountyAmt, 10);
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
  const { config: escrowConfig } = usePrepareContractWrite({...contractConfig, functionName: 'escrow', args: [debouncedBountyAppId, debouncedHunterAddress, bountyExpirationTime], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedBountyAmt), overrides: {value: ethers.utils.parseEther(debouncedBountyAmt || '0')}});
  const { data: escrowData, error: escrowError, isLoading: isEscrowLoading, isSuccess: isEscrowSuccess, write: escrow } = useContractWrite(escrowConfig);
  const { data: escrowTxData, isLoading: isEscrowTxLoading, isSuccess: isEscrowTxSuccess, error: escrowTxError } = useWaitForTransaction({ hash: escrowData?.hash, enabled: true,});

  // Submitted Contract Interactions: Initiate Dispute/Payout If Dispute/Payout
  const { config: initiateDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'initiateDispute', args: [debouncedBountyAppId, debouncedHunterAddress, oracleAddress, bondAmt, debouncedAncillaryData, wethContract], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(debouncedAncillaryData), });
  const { data: initiateDisputeData, error: initiateDisputeError, isLoading: isInitiateDisputeLoading, isSuccess: isInitiateDisputeSuccess, write: initiateDispute } = useContractWrite(initiateDisputeConfig);
  const { data: initiateDisputeTxData, isLoading: isInitiateDisputeTxLoading, isSuccess: isInitiateDisputeTxSuccess, error: initiateDisputeTxError } = useWaitForTransaction({ hash: initiateDisputeData?.hash, enabled: true,});

  const { config: payoutIfDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payoutIfDispute', args: [debouncedBountyAppId, debouncedHunterAddress, umaData.timestamp, umaData.ancillaryData, umaData.request], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress) && Boolean(umaData.timestamp), });
  const { data: payoutIfDisputeData, error: payoutIfDisputeError, isLoading: isPayoutIfDisputeLoading, isSuccess: isPayoutIfDisputeSuccess, write: payoutIfDispute } = useContractWrite(payoutIfDisputeConfig);
  const { data: payoutIfDisputeTxData, isLoading: isPayoutIfDisputeTxLoading, isSuccess: isPayoutIfDisputeTxSuccess, error: payoutIfDisputeTxError } = useWaitForTransaction({ hash: payoutIfDisputeData?.hash, enabled: true,});

  const { config: payoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payout', args: [debouncedBountyAppId, debouncedHunterAddress], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedHunterAddress),});
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

  const handleCloseEscrowTrue = (bountyAppId: string, hunterAddress: string, ethAmount: string) => {
    // setOpenEscrow(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    setBountyAmt(ethAmount);
    // console.log("bounty id", bountyAppId)
    // console.log("hunter addr", hunterAddress)
    // console.log("boounty amt", bountyAmt)
    // console.log("debounced bounty id", debouncedBountyAppId)
    // console.log("debpunced hunter addr", debouncedHunterAddress)
    // console.log("debounced boounty amt", debouncedBountyAmt)
    // escrow?.();
    // console.log("ESCROW FUNC CALLED")
    // console.log("bounty id", bountyAppId)
    // console.log("hunter addr", hunterAddress)
    // console.log("boounty amt", bountyAmt)
    // console.log("debounced bounty id", debouncedBountyAppId)
    // console.log("debpunced hunter addr", debouncedHunterAddress)
    // console.log("debounced boounty amt", debouncedBountyAmt)
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

  const handleClosePayTrue = (bountyAppId: string, hunterAddress: string) => {
    // setOpenPay(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
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
    // setOpenSettle(false);
    setBountyAppId(bountyAppId);
    setHunterAddress(hunterAddress);
    
    setUmaData({
      timestamp: timestamp,
      ancillaryData: ancillaryData,
      request: request
    });
    // payoutIfDispute?.();
  };


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
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography sx={{ width: '90%', flexShrink: 0, color: '#064829' }}>{ensName ? ensName : props.person}</Typography>
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
                <Button variant="contained" sx={{ backgroundColor: '#C2C2C2', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseReject} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you want to reject this candidate?"}
                  </DialogTitle>
                  <DialogActions>
                      <Button onClick={handleCloseReject}>No I don't</Button>
                      <Button onClick={handleCloseReject} autoFocus>Yes I want to</Button>
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ backgroundColor: 'rgba(6, 72, 41, 0.85)', borderRadius: '12px' }} onClick={() => {handleClickOpenEscrow(); handleCloseEscrowTrue(props.postId!, props.person, props.amount!);}}>Escrow</Button>
                <Dialog
                  open={openEscrow}
                  onClose={handleCloseEscrowFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you want to escrow these funds?"}
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Escrowing these funds will lock them in the smart contract and will either be paid in full to the bounty hunter,
                        refunded to you if the dispute is settled in your favor, or partially refunded if a dispute winner isn't chosen.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseEscrowFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseEscrowTrue(props.postId!, props.person, props.amount!)} autoFocus>Yes I want to</Button> */}
                    <Button onClick={() => {escrow?.(); setOpenEscrow(false);}} autoFocus disabled={!escrow || isEscrowTxLoading}>{isEscrowTxLoading ? 'Escrowing...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "submitted" &&  
              <div>
                <Button variant="contained" sx={{ backgroundColor: '#C2C2C2', borderRadius: '12px', marginRight: '8px' }}  onClick={() => {handleClickOpenContest(); handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!);}}>Contest</Button>
                <Dialog
                  open={openContest}
                  onClose={handleCloseContestFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you want to dispute the bounty hunter's work?"}
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Disputing their work will open up a 7 day challenger period, in which the bounty hunter can challenge your dispute and assert 
                        that their work is up to specification. If they decide to do this, then the dispute will be escalated to UMA token holders and decided
                        within that week. Once the decision is made (please see the docs for more details on this process), the escrowed funds will either be fully 
                        refunded to you, half refunded to you, or paid out in full to the bounty hunter. If the bounty hunter doesn't challenge your dispute, then you 
                        will be refunded in full after those 7 days. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseContestFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseContestTrue(props.postId!, props.person, props.workLinks!, props.postLinks!)} autoFocus>Yes I want to</Button> */}
                    <Button onClick={() => {initiateDispute?.(); setOpenContest(false);}} autoFocus disabled={!initiateDispute || isInitiateDisputeTxLoading}>{isInitiateDisputeTxLoading ? 'Initiating dispute...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ backgroundColor: 'rgba(6, 72, 41, 0.85)', borderRadius: '12px' }} onClick={() => {handleClickOpenPay(); handleClosePayTrue(props.postId!, props.person);}}>Pay</Button>
                <Dialog
                  open={openPay}
                  onClose={handleClosePayFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you want to pay the bounty hunter for their work?"}
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        This will release the funds from escrow and send them to the bounty hunter for their work. 
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleClosePayFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleClosePayTrue(props.postId!, props.person)} autoFocus>Yes I want to</Button> */}
                    <Button onClick={() => {payout?.(); setOpenPay(false);}} autoFocus disabled={!payout || isPayoutTxLoading}>{isPayoutTxLoading ? 'Paying hunter...' : 'Yes I want to'}</Button>
                  </DialogActions>
                </Dialog>
              </div>
            }
            {props.appStatus === "settle" &&
              <div> 
                <Button variant="contained" sx={{ backgroundColor: '#C2C2C2', borderRadius: '12px', marginRight: '8px' }} onClick={handleClickOpenReject}>Reject</Button>
                <Dialog
                  open={openReject!}
                  onClose={handleCloseSettleFalse} 
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you don't want to settle this dispute?"}
                  </DialogTitle>
                  <DialogActions>
                      <Button onClick={handleCloseSettleFalse}>No I want to settle</Button>
                      <Button onClick={handleCloseSettleFalse} autoFocus>Yes I don't want to</Button> 
                  </DialogActions>
                </Dialog>
                <Button variant="contained" sx={{ backgroundColor: 'rgba(6, 72, 41, 0.85)', borderRadius: '12px' }} onClick={() => {handleClickOpenSettle(); handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!);}}>Settle</Button>
                <Dialog
                  open={openSettle}
                  onClose={handleCloseSettleFalse}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                  {"Are you sure you want to settle this dispute?"}
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Settling this dispute will result in 1 of 3 outcomes: 
                        1. You win the dispute and your escrowed funds plus the dispute bond + dispute fee + 1/2 of the hunter's dispute bond will be sent to you; 
                        2. The hunter wins the dispute and your escrowed funds plus their dispute bond + their dispute fee + 1/2 of your dispute bond will be sent to them. 
                        3. The dispute ends in a tie and you get 1/2 of your escrowed funds back while the hunter gets 1/2 of the escrowed funds 
                        plus their dispute bond + their dispute fee + 1/2 of your dispute bond.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseSettleFalse}>No I don't</Button>
                    {/* <Button onClick={() => handleCloseSettleTrue(props.postId!, props.person, props.timestamp!, props.ancillaryData!, props.request!)} autoFocus>Yes I want to</Button> */}
                    <Button onClick={() => {payoutIfDispute?.(); setOpenSettle(false);}} autoFocus disabled={!payoutIfDispute || isPayoutIfDisputeTxLoading}>{isPayoutIfDisputeTxLoading ? 'Settling dispute...' : 'Yes I want to'}</Button>
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