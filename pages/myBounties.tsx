import type { NextPage } from 'next';
import Head from 'next/head';
import Button from '@mui/material/Button';
import React, { ReactElement, useEffect } from 'react';
import BasicAccordian from '../components/basicAccordion';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Form from '../components/form';
import axios from 'axios';
import { TailSpin } from 'react-loader-spinner';
import { useAccount, useContract, useNetwork, useProvider, useSigner } from 'wagmi';
import { ethers, ContractInterface } from 'ethers';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../cornucopia-contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import wethABI from '../WETH9.json';
import { getUMAEventData } from '../getUMAEventData';
import styles from '../styles/Home.module.css';
import Slider from '@mui/material/Slider';
import WelcomeCard from '../components/welcomeCard';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MyBountiesInfo from '../components/myBountiesInfo';
import HunterContractActions from '../components/hunterContractActions';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';
import { getEscrowEventData } from '../getEscrowEventData';
import { useMediaQuery } from '@mui/material';

// Bounty Stages for Hunter:
// 1. Applied (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK PROGRESS MAPPING
// 2. In Progress (Creator Escrows Funds) (Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!") Event Emitted); (Status == NoBounty); CHECK ESCROWED EVENT
// 3. Submitted (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Submitted); CHECK PROGRESS MAPPING
// 4. (Sometimes) Hunter Needs to Respond to Creator Dispute (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeInitiated); CHECK PROGRESS MAPPING
// 5. (Sometimes) Waiting for Dispute To Be Resolved (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeRespondedTo); CHECK PROGRESS MAPPING
// 6. (Sometimes) Bounty creator hasn't payed or disputed within 2 weeks after work submission (payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] > block.timestamp); CHECK PAYOUTEXPIRATION MAPPING, CURRENT BLOCKTIME
// 7. Finished (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Resolved); look at FundsSent event to figure out how they were resolved; CHECK PROGRESS MAPPING, FUNDSSENT EVENT

// Escrow Contract Config
const contractConfig = {
    addressOrName: '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', // process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// UMA Skinny OO Contract Config
const umaContractConfig = {
    addressOrName: '0xeDc52A961B5Ca2AC7B2e0bc36714dB60E5a115Ab', //process.env.NEXT_PUBLIC_OO_ADDRESS!, // contract address for OO not skinny OO so need to change
    contractInterface: umaABI['abi'],
};

// WETH Contract Config (For UMA Bonds)
const wethContractConfig = {
    addressOrName: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', // process.env.NEXT_PUBLIC_WETH_ADDRESS!, // contract address
    contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
};

const MyBounties: NextPage = () => {
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();

    const escrowAddress = '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4'; //process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
    const escrowContract = useContract({...contractConfig, signerOrProvider: signer, });
    const umaContract = useContract({...umaContractConfig, signerOrProvider: signer, });
    const wethContract = useContract({...wethContractConfig, signerOrProvider: signer, });

    const [appliedBountyPosts, setAppliedBountyPosts] = React.useState(Array<JSX.Element>);
    const [inProgressBountyPosts, setInProgressBountyPosts] = React.useState(Array<JSX.Element>);
    const [submittedBountyPosts, setSubmittedBountyPosts] = React.useState(Array<JSX.Element>);
    const [disputeInitiatedBountyPosts, setDisputeInitiatedBountyPosts] = React.useState(Array<JSX.Element>);
    const [disputeRespondedToBountyPosts, setDisputeRespondedToBountyPosts] = React.useState(Array<JSX.Element>);
    const [creatorNoActionBountyPosts, setCreatorNoActionBountyPosts] = React.useState(Array<JSX.Element>);
    const [finishedBountyPosts, setFinishedBountyPosts] = React.useState(Array<JSX.Element>);

    const [submittedHits, setSubmittedHits] = React.useState(0); // Count of how many components in getSubmittedPosts func attempted to render; 

    const incrementSubmittedHits = React.useCallback(() => {
        setSubmittedHits(state => state + 1);
    }, []);

    const [existsSubmitted, setExistsSubmitted] = React.useState(new Map<string, boolean>());

    const setSubmittedMap = React.useCallback((postId: string) => {
        setExistsSubmitted(state => new Map(state.set(postId, true)));
    }, []);


    const { data, error, isValidating } = useSWR([MYBOUNTIES, { address: address, chain: chain?.network! },], gqlFetcher);

    if (error) {
        console.error(error);
    }

    const postIds = React.useMemo(() => {
        return data?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]);
    
    const { data: submittedData, error: submittedError, isValidating: isSubmittedValidating } = useSWR([MYSUBMITTEDBOUNTIES, { address: address, chain: chain?.network! },], gqlFetcher);

    if (submittedError) {
        console.error(submittedError);
    }

    const postSubmittedIds = React.useMemo(() => {
        return submittedData?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [submittedData?.transactions?.edges]);

    const getPosts = React.useCallback(async (openBountyIds: Array<string>) => {
        let appliedBounties: Array<JSX.Element> = [];
        let inProgressBounties: Array<JSX.Element> = []; 
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);

            // If hunter has submitted work for this bounty then continue as bounties with work submitted are rendered below
            if (existsSubmitted && existsSubmitted.has(postData.data.postId)) {
                return Promise.resolve([]);;
            }

            const postId = postData?.config?.url?.split("https://arweave.net/")[1];

            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, postData.data.creatorAddress, address ]);

            // Filter events
            const filter = escrowContract?.filters.Escrowed(postData.data.creatorAddress, address, postData.data.postId);
            const isEscrowed = await escrowContract?.queryFilter(filter);
            
            const progress = await escrowContract?.progress(bountyIdentifierInput);

            return Promise.resolve([
                progress,
                isEscrowed,
                postId,
                postData,
                openBountyId
            ]); 
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach(result => {
                    if (result.length) {
                        const progress = result[0];
                        const isEscrowed = result[1];
                        const postId = result[2];
                        const postData = result[3];
                        const openBountyId = result[4];

                        if (progress === 0 && isEscrowed.length === 0) { // Case 1: Applied
                            appliedBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                />
                            );
                        } else if (isEscrowed.length > 0) { // Case 2: In Progress
                            inProgressBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
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
                                        startDate={postData.data.startDate}
                                        endDate={postData.data.endDate}
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
                                                value: "Cornucopia-test3"
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

                    }
                });
                setAppliedBountyPosts(appliedBounties);
                setInProgressBountyPosts(inProgressBounties);
            }); 
        }
    }, [address, escrowContract, chain, existsSubmitted]);

    const getSubmittedPosts = React.useCallback(async (openBountyIds: Array<string>) => {
        let submittedBounties: Array<JSX.Element> = [];
        let disputeInitiatedBounties: Array<JSX.Element> = [];
        let disputeRespondedToBounties: Array<JSX.Element> = [];
        let creatorNoActionBounties: Array<JSX.Element> = [];
        let finishedBounties: Array<JSX.Element> = [];
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);

            setSubmittedMap(postData.data.postId); // Log this bounty as submitted
            incrementSubmittedHits();

            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
           
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, postData.data.creatorAddress, address ]);

            const progress = await escrowContract.progress(bountyIdentifierInput);
            const payoutExpirationTime = await escrowContract.payoutExpiration(bountyIdentifierInput);
            const currentBlocktime = await provider.getBlock("latest");

            const wethAllowance = await wethContract.allowance(address, escrowAddress);
            console.log('progress', progress)
            let umaEventData;
            if (progress === 2) {
                umaEventData = await getUMAEventData(umaContract, escrowContract, provider, 'propose', postData.data.creatorAddress, address!, postData.data.postId);

            }
            let finishedStatus;
            if (progress === 4) {
                finishedStatus = await getEscrowEventData(escrowContract, 'finished', postData.data.creatorAddress, address!, postData.data.postId);
            }

            return Promise.resolve([
                progress,
                postId,
                postData,
                openBountyId,
                umaEventData,
                finishedStatus,
                currentBlocktime,
                payoutExpirationTime,
                wethAllowance
            ]);
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach(result => {
                    if (result.length) {
                        const progress = result[0];
                        const postId = result[1];
                        const postData = result[2];
                        const openBountyId = result[3];
                        const umaEventData = result[4];
                        const finishedStatus = result[5];
                        const currentBlocktime = result[6];
                        const payoutExpirationTime = result[7];
                        const wethAllowance = result[8];

                        if (progress === 1) { // Case 3: Submitted.
                            submittedBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    workLinks={postData.data.workLinks}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                />
                            );
                        
                        } else if (progress === 2) { // Case 4: Hunter needs to respond to creator dispute.
                            disputeInitiatedBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    workLinks={postData.data.workLinks}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                >
                                    <HunterContractActions key={postId}
                                        allowance={wethAllowance}
                                        postId={postData.data.postId}
                                        creatorAddress={postData.data.creatorAddress}
                                        appStatus={"disputeResponse"}
                                        timestamp={umaEventData.timestamp}
                                        ancillaryData={umaEventData.ancillaryData}
                                        request={umaEventData.request}
                                    />
                                </BasicAccordian>
                            );
                        } else if (progress === 3) { // Case 5: Waiting for dispute to be resolved.
                            disputeRespondedToBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    workLinks={postData.data.workLinks}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                />
                            );
                        } else if (currentBlocktime && payoutExpirationTime <= currentBlocktime && progress === 1) {  // Case 6: Creator hasn't payed or disputed work within 2 weeks after work submission.
                            creatorNoActionBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    workLinks={postData.data.workLinks}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                >
                                    <HunterContractActions key={postId}
                                        postId={postData.data.postId}
                                        creatorAddress={postData.data.creatorAddress}
                                        appStatus={"forceClaim"}
                                    />
                                </BasicAccordian>
                            );
                        } else if (progress === 4) { // Case 7: Finished; need to check FundsSent event to see how they were resolved!!
                            finishedBounties.push(
                                <BasicAccordian key={postId}  
                                    company={postData.data.creatorAddress}
                                    postLinks={postData.data.postLinks}
                                    startDate={postData.data.startDate}
                                    endDate={postData.data.endDate}
                                    description={postData.data.description}
                                    bountyName={postData.data.title}
                                    amount={postData.data.amount}
                                    arweaveHash={openBountyId}
                                    workLinks={postData.data.workLinks}
                                    disputes={false} 
                                    tokenSymbol={postData.data.tokenSymbol}
                                    finishedStatus={finishedStatus}
                                />
                            );
                        }
                    }
                });
                setSubmittedBountyPosts(submittedBounties);
                setDisputeInitiatedBountyPosts(disputeInitiatedBounties);
                setDisputeRespondedToBountyPosts(disputeRespondedToBounties);
                setCreatorNoActionBountyPosts(creatorNoActionBounties);
                setFinishedBountyPosts(finishedBounties);
            }); 
        }
    }, [address, provider, escrowContract, wethContract, umaContract, escrowAddress, setSubmittedMap, incrementSubmittedHits]);

    useEffect(() => { 
        if (!isSubmittedValidating && postSubmittedIds?.length > 0) {
            console.log("get submitted called")
            getSubmittedPosts(postSubmittedIds);
        }
    }, [isSubmittedValidating, postSubmittedIds, getSubmittedPosts]);

    useEffect(() => {
        if (!isValidating && postIds?.length > 0 && (submittedHits === postSubmittedIds?.length)) {
            getPosts(postIds);
        }
    }, [isValidating, postIds, getPosts, submittedHits, postSubmittedIds?.length]);

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
    const [stageInfo, setStageInfo] = React.useState(false);

    const smallScreen = useMediaQuery('(max-width: 1086px)');
    const largeScreen = useMediaQuery('(min-width: 1087px)');

    const smallScreenCard = useMediaQuery('(max-width: 700px)');
    const largeScreenCard = useMediaQuery('(min-width: 701px)');

    const stageLarge = React.useRef(1);
    
    if (!isConnected) {
        return (
            <div className={styles.background}> 
                <WelcomeCard isConnected={isConnected}/>
            </div>
        );
    } else if (!isValidating && !isSubmittedValidating) {
        return (
            <div className={styles.background}>
                <Head>
                    <title>My Bounties</title>
                    <meta name="description" content="First Farm" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
    
                <main> 
                    <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '16vw', paddingRight: '16vw', paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)', }}> 
                        <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center'}}> 
                            <Box sx={{ display: 'flex', flexDirection: 'column', }}>
                                <Button onClick={() => setStageInfo(true)} sx={{ width: '13px !important', height: '13px !important', position: 'absolute', paddingBottom: '20px', paddingLeft: '68px', }}> 
                                    <InfoOutlinedIcon sx={{ color: 'rgb(233, 233, 198)', fontSize: '12px', }}/>
                                </Button>
                                <MyBountiesInfo open={stageInfo} setOpen={setStageInfo}/>
                                <Typography sx={{ color: 'rgb(233, 233, 198)', fontFamily: 'Space Grotesk', fontStyle: 'italic', fontWeight: '300', fontSize: '18px', position: 'relative', }}>Stages</Typography>
                            </Box>
                            {largeScreen && 
                            <Slider
                                aria-label="Restricted values"
                                defaultValue={marks[stageLarge.current - 1].value}
                                getAriaValueText={valuetext}
                                step={null}
                                valueLabelDisplay="off"
                                marks={marks}
                                onChange={(e, val) => { setStage(marks.findIndex((mark) => mark.value === val) + 1); stageLarge.current = marks.findIndex((mark) => mark.value === val) + 1; }}
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
                        }
                        </Box>
                        {largeScreen && stage === 1 && <h2 className={styles.h2}>Applied</h2>}
                        {largeScreen && stage === 2 && <h2 className={styles.h2}>In Progress</h2>}
                        {largeScreen && stage === 3 && <h2 className={styles.h2}>Submitted</h2>}
                        {largeScreen && stage === 4 && <h2 className={styles.h2}>Dispute Initiated</h2>}
                        {largeScreen && stage === 5 && <h2 className={styles.h2}>Dispute Responded To</h2>}
                        {largeScreen && stage === 6 && <h2 className={styles.h2}>Force Payout</h2>}
                        {largeScreen && stage === 7 && <h2 className={styles.h2}>Finished</h2>}

                        {largeScreen && stage === 1 && appliedBountyPosts}
                        {largeScreen && stage === 2 && inProgressBountyPosts}
                        {largeScreen && stage === 3 && submittedBountyPosts}
                        {largeScreen && stage === 4 && disputeInitiatedBountyPosts}
                        {largeScreen && stage === 5 && disputeRespondedToBountyPosts}
                        {largeScreen && stage === 6 && creatorNoActionBountyPosts}
                        {largeScreen && stage === 7 && finishedBountyPosts}

                        {smallScreen && <h2 className={styles.h2}>Applied</h2>}
                        {smallScreen && appliedBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>In Progress</h2>}
                        {smallScreen && inProgressBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>Submitted</h2>}
                        {smallScreen && submittedBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>Dispute Initiated</h2>}
                        {smallScreen && disputeInitiatedBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>Dispute Responded To</h2>}
                        {smallScreen && disputeRespondedToBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>Force Payout</h2>}
                        {smallScreen && creatorNoActionBountyPosts}
                        {smallScreen && <h2 className={styles.h2}>Finished</h2>}
                        {smallScreen && finishedBountyPosts}
                    </Box>
                </main>
            </div>
        );
    }
    
    return (
        <div className={styles.background}>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', }}> 
                <TailSpin color={"rgb(233, 233, 198)"}/>
            </Box>     
        </div>
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
                    values: ["Cornucopia-test3"]
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
                    values: ["Cornucopia-test3"]
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