import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Button from '@mui/material/Button';
import React, { ReactElement, useEffect } from 'react';
import BasicAccordian from '../components/basicAccordion';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import BountyCard from '../components/bountyCard';
import { useQuery, gql } from '@apollo/client';
import ClientOnly from '../components/clientOnly';
import Form from '../components/form';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { TailSpin } from 'react-loader-spinner';
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useNetwork, useProvider, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../cornucopia-contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import useDebounce from '../components/useDebounce';
import SimpleSnackBar from '../components/simpleSnackBar';
import { Request, getUMAEventData } from '../getUMAEventData';
import styles from '../styles/Home.module.css';
import Slider from '@mui/material/Slider';
import Link from 'next/link';
import WelcomeCard from '../components/welcomeCard';

// Bounty Stages for Hunter:
// 1. Applied (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK PROGRESS MAPPING
// 2. In Progress (Creator Escrows Funds) (Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!") Event Emitted); (Status == NoBounty); CHECK ESCROWED EVENT
// 3. Submitted (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Submitted); CHECK PROGRESS MAPPING
// 4. (Sometimes) Hunter Needs to Respond to Creator Dispute (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeInitiated); CHECK PROGRESS MAPPING
// 5. (Sometimes) Waiting for Dispute To Be Resolved (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeRespondedTo); CHECK PROGRESS MAPPING
// 6. (Sometimes) Bounty creator hasn't payed or disputed within 2 weeks after work submission (payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] > block.timestamp); CHECK PAYOUTEXPIRATION MAPPING, CURRENT BLOCKTIME
// 7. Finished (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Resolved); look at FundsSent event to figure out how they were resolved; CHECK PROGRESS MAPPING, FUNDSSENT EVENT

// TODO: FIX: Data renders only after clicking on page twice or more, but shows up after one click once it's cached hm;
// TODO: Take care of different payout cases: deduce who won by listening to emmitted event from payout fn
// TODO: Listen for uma contract emitted event to get necessary info for hunterDisputeResponse function!
// TODO: Test dispute response and forcepayout workflows on the app!

type ArData = {
    creatorAddress: string;
    hunterAddress: string;
    postId: string;
    title: string;
    description: string;
    amount: number; 
    date: string;
    time: string; 
    postLinks: Array<string>;
    appLinks: Array<string>;
    experience: string;
    contact: string;
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// UMA Skinny OO Contract Config
const umaContractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_OO_ADDRESS!, // contract address for OO not skinny OO so need to change
    contractInterface: umaABI['abi'],
};

const MyBounties: NextPage = () => {
    
    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address, enabled: false, });
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer, });
    const umaContract = useContract({...umaContractConfig, signerOrProvider: signer, });


    const [open, setOpen] = React.useState(false);
    const [openSubmit, setOpenSubmit] = React.useState(false);
    const [openDispute, setOpenDispute] = React.useState(false);
    const [openForce, setOpenForce] = React.useState(false);
    const [bountyAppId, setBountyAppId] = React.useState('');
    const debouncedBountyAppId = useDebounce(bountyAppId, 10);
    const [creatorAddress, setCreatorAddress] = React.useState('');
    const debouncedCreatorAddress = useDebounce(creatorAddress, 10);
    const [tokenAddressERC20, setTokenAddressERC20] = React.useState('');
    const debouncedTokenAddressERC20 = useDebounce(tokenAddressERC20, 10);
    const [umaData, setUmaData] = React.useState({
        timestamp: 0,
        ancillaryData: '',
        request: {} as Request
    });

    const [appliedBountyPosts, setAppliedBountyPosts] = React.useState(Array<JSX.Element>);
    const [inProgressBountyPosts, setInProgressBountyPosts] = React.useState(Array<JSX.Element>);
    const [submittedBountyPosts, setSubmittedBountyPosts] = React.useState(Array<JSX.Element>);
    const [disputeInitiatedBountyPosts, setDisputeInitiatedBountyPosts] = React.useState(Array<JSX.Element>);
    const [disputeRespondedToBountyPosts, setDisputeRespondedToBountyPosts] = React.useState(Array<JSX.Element>);
    const [creatorNoActionBountyPosts, setCreatorNoActionBountyPosts] = React.useState(Array<JSX.Element>);
    const [finishedBountyPosts, setFinishedBountyPosts] = React.useState(Array<JSX.Element>);

    // Escrow Smart Contracts Calls    

    // HunterDisputeResponse Contract Interactions
    const { config: hunterDisputeResponseConfig } = usePrepareContractWrite({...contractConfig, functionName: 'hunterDisputeResponse', args: [debouncedBountyAppId, debouncedCreatorAddress, umaData.timestamp, umaData.ancillaryData, umaData.request], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedCreatorAddress) && Boolean(umaData.timestamp),});
    const { data: hunterDisputeResponseData, error: hunterDisputeResponseError, isLoading: isHunterDisputeResponseLoading, isSuccess: isHunterDisputeResponseSuccess, write: hunterDisputeResponse } = useContractWrite(hunterDisputeResponseConfig);
    const { data: hunterDisputeResponseTxData, isLoading: isHunterDisputeResponseTxLoading, isSuccess: isHunterDisputeResponseTxSuccess, error: hunterDisputeResponseTxError } = useWaitForTransaction({ hash: hunterDisputeResponseData?.hash, enabled: true, });

    // ForceHunterPayout Contract Interactions
    const { config: forceHunterPayoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'forceHunterPayout', args: [debouncedBountyAppId, debouncedCreatorAddress, debouncedTokenAddressERC20], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedCreatorAddress) && Boolean(debouncedTokenAddressERC20),});
    const { data: forceHunterPayoutData, error: forceHunterPayoutError, isLoading: isForceHunterPayoutLoading, isSuccess: isForceHunterPayoutSuccess, write: forceHunterPayout } = useContractWrite(forceHunterPayoutConfig);
    const { data: forceHunterPayoutTxData, isLoading: isForceHunterPayoutTxLoading, isSuccess: isForceHunterPayoutTxSuccess, error: forceHunterPayoutTxError } = useWaitForTransaction({ hash: forceHunterPayoutData?.hash, enabled: true, });

    const { data: blockNumber, isError: isBlockNumberError, isLoading: isBlockNumberLoading } = useBlockNumber({ enabled: true,});
    

    const handleClickOpenDispute = () => {
        setOpenDispute(true);
    };

    const handleClickOpenForce = () => {
        setOpenForce(true);
    };

    const handleCloseDisputeFalse = () => {
        setOpenDispute(false);
    };

    const handleCloseDisputeTrue = (bountyAppId: string, creatorAddress: string) => {
        // setOpenDispute(false);
        setBountyAppId(bountyAppId);
        setCreatorAddress(creatorAddress);

        // Get UMA data
        const umaEventData = getUMAEventData(umaContract, escrowContract, provider, 'propose', creatorAddress, address!, bountyAppId);
        setUmaData({
            timestamp: umaEventData.timestamp,
            ancillaryData: umaEventData.ancillaryData,
            request: umaEventData.request
        });
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

    // Get bounties that this address is a hunter in
    const { data, loading, error, startPolling } = useQuery(MYBOUNTIES, { variables: { address, chain: chain?.network! }, }); // will repoll every 500 s
    startPolling(10000);

    if (error) {
        console.error(error);
    }

    const postIds = data?.transactions.edges.map((edge: any) => edge.node.id);
    const { data: submittedData, loading: submittedLoading, error: submittedError, startPolling: startPollingSubmitted } = useQuery(MYSUBMITTEDBOUNTIES, { variables: { address, chain: chain?.network! }, });
    startPollingSubmitted(10000);

    if (submittedError) {
        console.error(submittedError);
    }

    const postSubmittedIds = submittedData?.transactions.edges.map((edge: any) => edge.node.id);

    const getPosts = async (openBountyIds: Array<string>, existsSubmitted?: Promise<Map<string, boolean>>) => {
        let appliedBounties: Array<JSX.Element> = [];
        let inProgressBounties: Array<JSX.Element> = []; 
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);

            // If hunter has submitted work for this bounty then continue as bounties with work submitted are rendered below
            if (existsSubmitted && (await existsSubmitted).has(postData.data.postId)) {
                return;
            }

            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, postData.data.creatorAddress, address ]);

            // Filter events
            const filter = escrowContract?.filters.Escrowed(postData.data.creatorAddress, address, postData.data.postId);
            const isEscrowed = await escrowContract?.queryFilter(filter);
            
            const progress = await escrowContract.progress(bountyIdentifierInput);
            

            // Case 1: Applied
           
            // if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 0 && isEscrowed.length === 0 ) { // Note: Use numbers to get different Enum options
            if (progress === 0 && isEscrowed.length === 0) {
                appliedBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    />
                );
            } else if ( isEscrowed.length > 0 ) { // Case 2: In Progress
                inProgressBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    >
                        <Form  
                            creatorAddress={postData.data.creatorAddress}
                            hunterAddress={address!}
                            postId={postData.data.postId}
                            postLinks={postData.data.postLinks}
                            date={postData.data.date}
                            time={postData.data.time}
                            description={postData.data.description}
                            title={postData.data.title}
                            amount={postData.data.amount}
                            experience={postData.data.experience}
                            contact={postData.data.contact}
                            appLinks={postData.data.appLinks}
                            tokenAddress={postData.data.tokenAddress}
                            tokenSymbol={postData.data.tokenSymbol}
                            tokenDecimals={postData.data.tokenDecimals}
                            formName={"Submit"}
                            summary={"Please fill out this form to submit your work for this bounty!"}  
                            formButtons={["Cancel", "Submit"]}
                            formType={"submitBounty"}
                            tags={[
                                {
                                    name: "Content-Type",
                                    value: "application/json"
                                },
                                {
                                    name: "App-Name",
                                    value: "Cornucopia-test"
                                },
                                {
                                    name: "Form-Type",
                                    value: "bounty-app-submit"
                                },
                                {
                                    name: "Hunter-Address",
                                    value: address!
                                },
                                {
                                    name: "Post-ID",
                                    value: postData.data.postId // postID of the bounty created by the creator
                                },
                                {
                                    name: "Chain",
                                    value: chain?.network!
                                }
                            ]}
                        />
                    </BasicAccordian>
                );   
            } 
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setAppliedBountyPosts(appliedBounties);
        setInProgressBountyPosts(inProgressBounties);
    };

    const getSubmittedPosts = async (openBountyIds: Array<string>) => {
        const existsSubmitted = new Map();

        let submittedBounties: Array<JSX.Element> = [];
        let disputeInitiatedBounties: Array<JSX.Element> = [];
        let disputeRespondedToBounties: Array<JSX.Element> = [];
        let creatorNoActionBounties: Array<JSX.Element> = [];
        let finishedBounties: Array<JSX.Element> = [];
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {

            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            existsSubmitted.set(postData.data.postId, true); // Log this bounty as submitted
            
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];

            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, postData.data.creatorAddress, address ]);

            const progress = await escrowContract.progress(bountyIdentifierInput);
            const payoutExpirationTime = await escrowContract.payoutExpiration(bountyIdentifierInput);

            // if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 1 ) { // Case 3: Submitted
            if (progress === 1) {
                submittedBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        workLinks={postData.data.workLinks}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    />
                );
            // } else if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 2 ) { // Case 4: Hunter needs to respond to creator dispute; need to send tx associated with this!!
            } else if (progress === 2) {
                disputeInitiatedBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        workLinks={postData.data.workLinks}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    >
                        <div> 
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }}  onClick={() => {handleClickOpenDispute(); handleCloseDisputeTrue(postData.data.postId, postData.data.creatorAddress);}}>Dispute</Button>
                                <Dialog
                                    open={openDispute}
                                    onClose={handleCloseDisputeFalse}
                                    aria-labelledby="alert-dialog-title"
                                    aria-describedby="alert-dialog-description"
                                >
                                    <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                                    {"Are you sure you want to challenge the creator's dispute of your work?"}
                                    </DialogTitle>
                                    <DialogContent className={styles.cardBackground}>
                                    <DialogContentText id="alert-dialog-description">
                                        Responding to the creator's dispute within the 7 day challenger period, escalates this dispute to the UMA token holders and decided
                                        within that week. Once the decision is made (please see the docs for more details on this process), the escrowed funds will either be fully 
                                        paid out to you, half payed out to you, or fully given back to the creator. If you don't challenge the creator's dispute, then the full bounty amount  
                                        will be returned to the creator once these 7 days are up. 
                                    </DialogContentText>
                                    </DialogContent>
                                    <DialogActions className={styles.formHeader}>
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseDisputeFalse}>No I don't</Button>
                                    {/* <Button onClick={() => handleCloseDisputeTrue(postData.data.postId, postData.data.creatorAddress)} autoFocus>Yes I want to</Button> */}
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {hunterDisputeResponse?.(); setOpenDispute(false);}} autoFocus disabled={!hunterDisputeResponse || isHunterDisputeResponseTxLoading}>{isHunterDisputeResponseTxLoading ? 'Responding to dispute...' : 'Yes I want to'}</Button>
                                    </DialogActions>
                                </Dialog>
                        </div> 
                    </BasicAccordian>
                );
            // } else if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 3 ) { // Case 5: Waiting for dispute to be resolved
            } else if (progress === 3) {
                disputeRespondedToBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        workLinks={postData.data.workLinks}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    />
                );
            // } else if ( ispayoutExpirationSuccess && blockNumber && payoutExpirationData! as unknown as number > blockNumber! && bountyProgressData! as unknown as number === 1) { // Case 6: Creator hasn't payed or disputed work within 2 weeks after work submission; assume that payoutExpirationData is a BigNumber
            } else if (blockNumber && payoutExpirationTime > blockNumber && progress === 1) {
                creatorNoActionBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        workLinks={postData.data.workLinks}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    >
                        <div> 
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleClickOpenForce(); handleCloseForceTrue(postData.data.postId, postData.data.creatorAddress);}}>Force Claim</Button>
                                <Dialog
                                    open={openForce}
                                    onClose={handleCloseForceFalse}
                                    aria-labelledby="alert-dialog-title"
                                    aria-describedby="alert-dialog-description"
                                >
                                    <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                                    {"Are you sure you want to claim the force-claim the bounty?"}
                                    </DialogTitle>
                                    <DialogContent className={styles.cardBackground}>
                                    <DialogContentText id="alert-dialog-description">
                                        The bounty creator has not responded (payed or disputed) to your work submission within two weeks. To prevent the creator from withholding the funds, 
                                        you're able to claim the bounty yourself. 
                                    </DialogContentText>
                                    </DialogContent>
                                    <DialogActions className={styles.formHeader}>
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={handleCloseForceFalse}>No I don't</Button> 
                                    {/* <Button onClick={() => handleCloseForceTrue(postData.data.postId, postData.data.creatorAddress)} autoFocus>Yes I want to</Button> */}
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {forceHunterPayout?.(); setOpenForce(false);}} autoFocus disabled={!forceHunterPayout || isForceHunterPayoutTxLoading}>{isForceHunterPayoutTxLoading ? 'Forcing payout...' : 'Yes I want to'}</Button>
                                    </DialogActions>
                                </Dialog>
                        </div>
                    </BasicAccordian>
                );
            // } else if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 4 ) { // Case 7: Finished; need to check FundsSent event to see how they were resolved!!
            } else if (progress === 4) {
                finishedBounties.push(
                    <BasicAccordian key={postId}  
                        company={postData.data.creatorAddress}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        workLinks={postData.data.workLinks}
                        disputes={false} 
                        tokenSymbol={postData.data.tokenSymbol}
                    />
                );
            }
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setSubmittedBountyPosts(submittedBounties);
        setDisputeInitiatedBountyPosts(disputeInitiatedBounties);
        setDisputeRespondedToBountyPosts(disputeRespondedToBounties);
        setCreatorNoActionBountyPosts(creatorNoActionBounties);
        setFinishedBountyPosts(finishedBounties);
        
        return existsSubmitted;
    };

    useEffect(() => {
        if (!loading && !submittedLoading && postSubmittedIds?.length > 0) {
            const existsSubmitted = getSubmittedPosts(postSubmittedIds);
            getPosts(postIds, existsSubmitted);
        } else if (!loading && !submittedLoading && postIds?.length > 0) {
            getPosts(postIds);
        }
    }, [loading, submittedLoading]);

    const marks = [
        {
            value: 0,
            label: 'Applied',
        },
        {
            value: 15,
            label: 'In Progress',
        },
        {
            value: 30,
            label: 'Submitted',
        },
        {
            value: 45,
            label: 'Dispute Initiated',
        },
        {
            value: 65,
            label: 'Dispute Responded To',
        },
        {
            value: 83,
            label: 'Force Payout',
        },
        {
            value: 100,
            label: 'Finished',
        },
    ];

    function valuetext(value: number) {
        return marks[marks.findIndex((mark) => mark.value === value)].label
    }

    const [stage, setStage] = React.useState(1);

    if (!isConnected) {
        return (
            <WelcomeCard isConnected={isConnected}/>
        );
    } else if (!loading && !submittedLoading) {
        return (
            <div className={styles.background}>
                <Head>
                    <title>My Bounties</title>
                    <meta name="description" content="First Farm" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
    
                <main> 
                    <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '160px', paddingRight: '160px', paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)' }}> 
                        {(isHunterDisputeResponseTxLoading || isHunterDisputeResponseTxSuccess) && 
                            <SimpleSnackBar msg={isHunterDisputeResponseTxLoading ? 'Responding to dispute...' : 'Responded to dispute!'}/>
                        }
                        {(isForceHunterPayoutTxLoading || isForceHunterPayoutTxSuccess) && 
                            <SimpleSnackBar msg={isForceHunterPayoutTxLoading ? 'Forcing payout...' : 'Forced payout!'}/>
                        }
                        <Slider
                            aria-label="Restricted values"
                            defaultValue={0}
                            getAriaValueText={valuetext}
                            step={null}
                            valueLabelDisplay="off"
                            marks={marks}
                            onChange={(e, val) => setStage(marks.findIndex((mark) => mark.value === val) + 1)}
                            sx={{ 
                                height: 12, 
                                color: 'rgb(233, 233, 198)', 
                                '& .MuiSlider-markLabel': { 
                                    color: 'rgb(233, 233, 198)', 
                                    fontFamily: 'Space Grotesk' 
                                }, 
                                '& .MuiSlider-thumb': {
                                    height: 24,
                                    width: 24,
                                    backgroundColor: '#fff',
                                    border: '2px solid currentColor',
                                    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                      boxShadow: '0 0 0 8px rgba(58, 133, 137, 0.16)',
                                    },
                                    '&:before': {
                                      display: 'none',
                                    },
                                },
                                '& .MuiSlider-track': {
                                    border: 'none',
                                },
                                '& .MuiSlider-mark': {
                                    '&.MuiSlider-markActive': {
                                      opacity: 1,
                                      backgroundColor: 'currentColor',
                                    },
                                }
                            }}
                        />
                        {stage === 1 && 
                            <div> 
                                <h2 className={styles.h2}>Applied</h2>
                                <ClientOnly>
                                    {appliedBountyPosts}
                                </ClientOnly> 
                            </div>
                        } 
                        {stage === 2 && 
                            <div> 
                                <h2 className={styles.h2}>In Progress</h2>
                                <ClientOnly>
                                    {inProgressBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                        {stage === 3 && 
                            <div> 
                                <h2 className={styles.h2}>Submitted</h2>
                                <ClientOnly>
                                    {submittedBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                        {stage === 4 && 
                            <div> 
                                <h2 className={styles.h2}>Dispute Initiated</h2>
                                <ClientOnly>
                                    {disputeInitiatedBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                        {stage === 5 && 
                            <div> 
                                <h2 className={styles.h2}>Dispute Responded To</h2>
                                <ClientOnly>
                                    {disputeRespondedToBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                        {stage === 6 && 
                            <div> 
                                <h2 className={styles.h2}>Force Payout</h2>
                                <ClientOnly>
                                    {creatorNoActionBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                        {stage === 7 && 
                            <div> 
                                <h2 className={styles.h2}>Finished</h2>
                                <ClientOnly>
                                    {finishedBountyPosts}
                                </ClientOnly> 
                            </div>
                        }
                    </Box>
                </main>
            </div>
        );
    }
    
    return (
        <Box sx={{ marginLeft: 'auto', marginRight: 'auto' }}> 
            <TailSpin color={"rgb(151, 208, 252)"}/>
        </Box>
    );
};

export default MyBounties;

// Query to get ids of a hunter's apps
const MYBOUNTIES = gql`
    query MyBounties($address: String!, $chain: String!) {
        transactions(
            tags: [
                {
                    name: "Content-Type",
                    values: ["application/json"]
                },
                {
                    name: "App-Name",
                    values: ["Cornucopia-test"]
                },
                {
                    name: "Form-Type",
                    values: ["bounty-app"]
                },
                {
                    name: "Hunter-Address",
                    values: [$address]
                },
                {
                    name: "Chain",
                    values: [$chain]
                }
            ]
        ) {
            edges {
                node {
                    id
                }
            }
        }
    }
`;

// Query to get ids of a hunter's submitted bounties
const MYSUBMITTEDBOUNTIES = gql`
    query MySubmittedBounties($address: String!, $chain: String!) {
        transactions(
            tags: [
                {
                    name: "Content-Type",
                    values: ["application/json"]
                },
                {
                    name: "App-Name",
                    values: ["Cornucopia-test"]
                },
                {
                    name: "Form-Type",
                    values: ["bounty-app-submit"]
                },
                {
                    name: "Hunter-Address",
                    values: [$address]
                },
                {
                    name: "Chain",
                    values: [$chain]
                }
            ]
        ) {
            edges {
                node {
                    id
                }
            }
        }
    }
`;
