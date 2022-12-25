import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useNetwork, useProvider, useSigner } from 'wagmi';
import { ethers, BigNumber, ContractInterface } from 'ethers';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../cornucopia-contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import wethABI from '../WETH9.json';
import useDebounce from './useDebounce';
import { Request } from '../getUMAEventData';
import styles from '../styles/Home.module.css';
import SimpleSnackBar from './simpleSnackBar';
import { LocalConvenienceStoreOutlined } from '@mui/icons-material';
import contractAddresses from '../contractAddresses.json';

type Props = {
    allowance?: BigNumber;
    postId: string;
    creatorAddress: string;
    appStatus: string;
    timestamp?: number;
    ancillaryData?: string; // Ancillary Data in byte form from UMA event used during payoutIfDispute call
    request?: Request; 
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: contractAddresses.escrow, // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', 
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// // UMA Skinny OO Contract Config
// const umaContractConfig = {
//     addressOrName: '0xeDc52A961B5Ca2AC7B2e0bc36714dB60E5a115Ab', 
//     contractInterface: umaABI['abi'],
// };

// WETH Contract Config (For UMA Bonds)
const wethContractConfig = {
    addressOrName: contractAddresses.weth, // '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 
    contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
};

const HunterContractActions: React.FC<Props> = props => {

    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address, enabled: false, });
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();

    const escrowAddress = contractAddresses.escrow; // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4'; 

    // const escrowContract = useContract({...contractConfig, signerOrProvider: signer, });
    // const umaContract = useContract({...umaContractConfig, signerOrProvider: signer, });

    const [openDispute, setOpenDispute] = React.useState(false);
    const [openForce, setOpenForce] = React.useState(false);
    const [allowanceIncreased, setAllowanceIncreased] = React.useState(false);
    const [bountyAppId, setBountyAppId] = React.useState('');
    const debouncedBountyAppId = useDebounce(bountyAppId, 10);
    const [creatorAddress, setCreatorAddress] = React.useState('');
    const debouncedCreatorAddress = useDebounce(creatorAddress, 10);
    const [tokenAddressERC20, setTokenAddressERC20] = React.useState('');
    const debouncedTokenAddressERC20 = useDebounce(tokenAddressERC20, 10);
    // const [umaData, setUmaData] = React.useState({
    //     timestamp: 0,
    //     ancillaryData: '',
    //     request: {} as Request
    // });

    const [timestamp, setTimestamp] = React.useState(0);
    const debouncedTimestamp = useDebounce(timestamp, 10);
    const [ancillaryData, setAncillaryData] = React.useState('');
    const debouncedAncillaryData = useDebounce(ancillaryData, 10);
    const [request, setRequest] = React.useState({} as Request);
    const debouncedRequest = useDebounce(request, 10);
    

    // Escrow Smart Contracts Calls    

    // HunterDisputeResponse Contract Interactions
    const { config: hunterDisputeResponseConfig } = usePrepareContractWrite({...contractConfig, functionName: 'hunterDisputeResponse', args: [debouncedBountyAppId, debouncedCreatorAddress, debouncedTimestamp, debouncedAncillaryData, debouncedRequest], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedCreatorAddress) && Boolean(debouncedTimestamp) && Boolean(debouncedAncillaryData) && Boolean(debouncedRequest) && Boolean(allowanceIncreased), });
    const { data: hunterDisputeResponseData, error: hunterDisputeResponseError, isLoading: isHunterDisputeResponseLoading, isSuccess: isHunterDisputeResponseSuccess, write: hunterDisputeResponse } = useContractWrite(hunterDisputeResponseConfig);
    const { data: hunterDisputeResponseTxData, isLoading: isHunterDisputeResponseTxLoading, isSuccess: isHunterDisputeResponseTxSuccess, error: hunterDisputeResponseTxError } = useWaitForTransaction({ hash: hunterDisputeResponseData?.hash, enabled: true, });

    // ForceHunterPayout Contract Interactions
    const { config: forceHunterPayoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'forceHunterPayout', args: [debouncedBountyAppId, debouncedCreatorAddress, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedCreatorAddress) && Boolean(debouncedTokenAddressERC20),});
    const { data: forceHunterPayoutData, error: forceHunterPayoutError, isLoading: isForceHunterPayoutLoading, isSuccess: isForceHunterPayoutSuccess, write: forceHunterPayout } = useContractWrite(forceHunterPayoutConfig);
    const { data: forceHunterPayoutTxData, isLoading: isForceHunterPayoutTxLoading, isSuccess: isForceHunterPayoutTxSuccess, error: forceHunterPayoutTxError } = useWaitForTransaction({ hash: forceHunterPayoutData?.hash, enabled: true, });    

    const handleClickOpenDispute = () => {
        setOpenDispute(true);
    };

    const handleClickOpenForce = () => {
        setOpenForce(true);
    };

    const handleCloseDisputeFalse = () => {
        setOpenDispute(false);
    };

    const handleCloseDisputeTrue = (bountyAppId: string, creatorAddress: string, timestamp: number, ancillaryData: string, request: Request) => {
        // setOpenDispute(false);
        setBountyAppId(bountyAppId);
        setCreatorAddress(creatorAddress);
        setTimestamp(timestamp);
        setAncillaryData(ancillaryData);
        setRequest(request);

        // // Get UMA data
        // const umaEventData = getUMAEventData(umaContract, escrowContract, provider, 'propose', creatorAddress, address!, bountyAppId);
        // setUmaData({
        //     timestamp: timestamp,
        //     ancillaryData: ancillaryData,
        //     request: request
        // });
        // hunterDisputeResponse?.();
    };

    const handleCloseForceFalse = () => {
        setOpenForce(false);
    };

    const handleCloseForceTrue = (bountyAppId: string, creatorAddress: string) => {
        // setOpenForce(false);
        setBountyAppId(bountyAppId);
        setCreatorAddress(creatorAddress);
        // forceHunterPayout?.(); 
    };

    const [openAllowance, setOpenAllowance] = React.useState(false);
    const [allowanceAmtOnce, setAllowanceAmtOnce] = React.useState('' as unknown as BigNumber);
    const [allowanceAmtAlways, setAllowanceAmtAlways] = React.useState('' as unknown as BigNumber);
    const debouncedAllowanceAmtOnce = useDebounce(allowanceAmtOnce, 10);
    const debouncedAllowanceAmtAlways = useDebounce(allowanceAmtAlways, 10);

    const bondAmt = ethers.utils.parseUnits("0.1", "ether"); // Hard-coded (for now) bondAmt
    const finalFee = ethers.utils.parseUnits("0.35", "ether"); // Hard-coded finalFee
    const hexAlwaysApprove = '0x8000000000000000000000000000000000000000000000000000000000000000';
    // const wethContract = useContract({...wethContractConfig, signerOrProvider: signer, });


    const { config: approveOnceConfig } = usePrepareContractWrite({...wethContractConfig, functionName: 'approve', args: [escrowAddress, debouncedAllowanceAmtOnce], enabled: Boolean(debouncedAllowanceAmtOnce), });
    const { data: approveOnceData, error: approveOnceError, isLoading: isApproveOnceLoading, isSuccess: isApproveOnceSuccess, write: approveOnce } = useContractWrite(approveOnceConfig);
    const { data: approveOnceTxData, isLoading: isApproveOnceTxLoading, isSuccess: isApproveOnceTxSuccess, error: approveOnceTxError } = useWaitForTransaction({ hash: approveOnceData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});
  
    const { config: approveAlwaysConfig } = usePrepareContractWrite({...wethContractConfig, functionName: 'approve', args: [escrowAddress, debouncedAllowanceAmtAlways], enabled: Boolean(debouncedAllowanceAmtAlways), });
    const { data: approveAlwaysData, error: approveAlwaysError, isLoading: isApproveAlwaysLoading, isSuccess: isApproveAlwaysSuccess, write: approveAlways } = useContractWrite(approveAlwaysConfig);
    const { data: approveAlwaysTxData, isLoading: isApproveAlwaysTxLoading, isSuccess: isApproveAlwaysTxSuccess, error: approveAlwaysTxError } = useWaitForTransaction({ hash: approveAlwaysData?.hash, enabled: true, onSuccess() {setAllowanceIncreased(true)}});


    const handleCloseIncreaseAllowanceFalse = () => {
        setOpenAllowance(false);
    };
    
    const handleCloseIncreaseAllowanceDisputeResponseOnceTrue = (allowance: BigNumber, bountyAppId: string, creatorAddress: string, timestamp: number, ancillaryData: string, request: Request) => {
        // const amountBN = ethers.utils.parseUnits(amount, decimals);
        const total = bondAmt.add(finalFee);
        console.log('request', request)
        console.log('allowance', allowance)
        if (total.gt(allowance)) {
            setAllowanceAmtOnce(total);
            // setTokenAddressERC20(tokenAddress);
            setOpenAllowance(true);
        } else {
            setAllowanceIncreased(true); // Allowance sufficient for amount
            handleCloseDisputeTrue(bountyAppId, creatorAddress, timestamp, ancillaryData, request);
            handleClickOpenDispute();
        }
    };
    
    const handleCloseIncreaseAllowanceDisputeResponseAlwaysTrue = (allowance: BigNumber, bountyAppId: string, creatorAddress: string, timestamp: number, ancillaryData: string, request: Request) => {
        // const amountBN = ethers.utils.parseUnits(amount, decimals);
        const total = bondAmt.add(finalFee);

        if (total.gt(allowance)) {
            setAllowanceAmtAlways(BigNumber.from(hexAlwaysApprove));
            // setTokenAddressERC20(tokenAddress);
            setOpenAllowance(true);
        } else {
            setAllowanceIncreased(true); // Allowance sufficient for amount
            handleCloseDisputeTrue(bountyAppId, creatorAddress, timestamp, ancillaryData, request);
            handleClickOpenDispute();
        }
    };

    if (props.postId) {
        return (
            <div> 
            {(isHunterDisputeResponseTxLoading || (isHunterDisputeResponseTxSuccess && hunterDisputeResponseTxData?.status === 1)) && 
                <SimpleSnackBar severity={'success'} msg={isHunterDisputeResponseTxLoading ? 'Responding to dispute...' : 'Responded to dispute!'}/>
            }
            {(isHunterDisputeResponseTxSuccess && hunterDisputeResponseTxData?.status === 0) && 
                <SimpleSnackBar severity={'error'} msg={'Hunter Dispute Response transaction failed!'}/>
            }
            {(isForceHunterPayoutTxLoading || (isForceHunterPayoutTxSuccess && forceHunterPayoutTxData?.status === 1)) && 
                <SimpleSnackBar severity={'success'} msg={isForceHunterPayoutTxLoading ? 'Forcing payout...' : 'Forced payout!'}/>
            }
            {(isForceHunterPayoutTxSuccess && forceHunterPayoutTxData?.status === 0) && 
                <SimpleSnackBar severity={'error'} msg={'Force Hunter Payout transaction failed!'}/>
            }
            {(isApproveOnceTxLoading || isApproveOnceTxSuccess) && 
                <SimpleSnackBar severity={'success'} msg={isApproveOnceTxLoading ? 'Approving once...' : 'Approved once!'}/>
            }
            {(isApproveAlwaysTxLoading || isApproveAlwaysTxSuccess) && 
                <SimpleSnackBar severity={'success'} msg={isApproveAlwaysTxLoading ? 'Approving always...' : 'Approved always!'}/>
            }
            {props.appStatus === "disputeResponse" &&
                <div> 
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleCloseIncreaseAllowanceDisputeResponseOnceTrue(props.allowance!, props.postId, props.creatorAddress, props.timestamp!, props.ancillaryData!, props.request!); handleCloseIncreaseAllowanceDisputeResponseAlwaysTrue(props.allowance!, props.postId, props.creatorAddress, props.timestamp!, props.ancillaryData!, props.request!);}}>Dispute</Button>
                    <Dialog open={openAllowance} onClose={handleCloseIncreaseAllowanceFalse} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                        <DialogTitle className={styles.formHeader}>Approve</DialogTitle>
                        <DialogContent className={styles.cardBackground}>
                            <DialogContentText className={styles.dialogBody}>
                            To respond to a creator&apos;s dispute, you must put up a bond of 0.1 WETH plus an UMA protocol fee of 0.35 WETH. To put up this bond, you must first allow Cornucopia to transfer 
                            tokens from your wallet to the protocol contract, which are then transferred into the UMA Optimistic Oracle contract.
                            <br />
                            <br />
                            You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won&apos;t have to approve Cornucopia 
                            everytime you respond to a dispute or you can choose to just allow Cornucopia to spend the funds you need to dispute. While the 
                            former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.   
                            </DialogContentText>    
                        </DialogContent> 
                        <DialogActions className={styles.formFooter}>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {approveAlways?.(); handleCloseDisputeTrue(props.postId, props.creatorAddress, props.timestamp!, props.ancillaryData!, props.request!); handleCloseIncreaseAllowanceFalse(); handleClickOpenDispute(); }} autoFocus disabled={!approveAlways || isApproveAlwaysTxLoading}>{isApproveAlwaysTxLoading ? 'Approving...' : 'Approve Always'}</Button>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {approveOnce?.(); handleCloseDisputeTrue(props.postId, props.creatorAddress, props.timestamp!, props.ancillaryData!, props.request!); handleCloseIncreaseAllowanceFalse(); handleClickOpenDispute(); }} autoFocus disabled={!approveOnce || isApproveOnceTxLoading}>{isApproveOnceTxLoading ? 'Approving...' : 'Approve Once'}</Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={openDispute}
                        onClose={handleCloseDisputeFalse}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                    >
                        <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                        {"Are you sure you want to challenge the creator's dispute of your work?"}
                        </DialogTitle>
                        <DialogContent className={styles.cardBackground}>
                        <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                            Responding to the creator&apos;s dispute within the 7 day challenger period, escalates this dispute to the UMA token holders and decided
                            within that week. Once the decision is made (please see the docs for more details on this process), the escrowed funds will either be fully 
                            paid out to you, half payed out to you, or fully given back to the creator. If you don&apos;t challenge the creator&apos;s dispute, then the full bounty amount  
                            will be returned to the creator once these 7 days are up. 
                        </DialogContentText>
                        </DialogContent>
                        <DialogActions className={styles.formFooter}>
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseDisputeFalse}>No I don&apos;t</Button>
                        {/* <Button onClick={() => handleCloseDisputeTrue(postData.data.postId, postData.data.creatorAddress)} autoFocus>Yes I want to</Button> */}
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {hunterDisputeResponse?.(); setOpenDispute(false);}} autoFocus disabled={!hunterDisputeResponse || isHunterDisputeResponseTxLoading}>{isHunterDisputeResponseTxLoading ? 'Responding to dispute...' : 'Yes I want to'}</Button>
                        </DialogActions>
                    </Dialog>
                </div> 
            }
            {props.appStatus === "forceClaim" &&
                <div> 
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenForce(); handleCloseForceTrue(props.postId, props.creatorAddress);}}>Force Claim</Button>
                    <Dialog
                        open={openForce}
                        onClose={handleCloseForceFalse}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                    >
                        <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                        {"Are you sure you want to claim the force-claim the bounty?"}
                        </DialogTitle>
                        <DialogContent className={styles.cardBackground}>
                        <DialogContentText className={styles.dialogBody} id="alert-dialog-description">
                            The bounty creator has not responded (payed or disputed) to your work submission within two weeks. To prevent the creator from withholding the funds, 
                            you&apos;re able to claim the bounty yourself. 
                        </DialogContentText>
                        </DialogContent>
                        <DialogActions className={styles.formFooter}>
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseForceFalse}>No I don&apos;t</Button> 
                        {/* <Button onClick={() => handleCloseForceTrue(postData.data.postId, postData.data.creatorAddress)} autoFocus>Yes I want to</Button> */}
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {forceHunterPayout?.(); setOpenForce(false);}} autoFocus disabled={!forceHunterPayout || isForceHunterPayoutTxLoading}>{isForceHunterPayoutTxLoading ? 'Forcing payout...' : 'Yes I want to'}</Button>
                        </DialogActions>
                    </Dialog>
                </div>
            }
            </div>
        );
    }
    return <> </>;
};

export default HunterContractActions;