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
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import wethABI from '../WETH9.json';
import daiABI from '../DAI.json';
import usdcABI from '../USDC.json';
import { getUMAEventData } from '../getUMAEventData';
import styles from '../styles/Home.module.css';
import Slider from '@mui/material/Slider';
import WelcomeCard from '../components/welcomeCard';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MyBountiesInfo from '../components/myBountiesInfo';
import HunterContractActions from '../components/hunterContractActions';
import useSWR from 'swr';
import { gqlFetcher } from '../swrFetchers';
import { gql } from 'graphql-request';
import { getEscrowEventData } from '../getEscrowEventData';
import useMediaQuery from '@mui/material/useMediaQuery';
import contractAddresses from '../contractAddresses.json';
import Image from 'next/image';
import Link from 'next/link';

// Bounty Stages for Hunter:
// 1. Applied (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK PROGRESS MAPPING
// 2. In Progress (Creator Escrows Funds) (Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!") Event Emitted); (Status == NoBounty); CHECK ESCROWED EVENT
// 3. Submitted (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Submitted); CHECK PROGRESS MAPPING
// 4. (Sometimes) Hunter Needs to Respond to Creator Dispute (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeInitiated); CHECK PROGRESS MAPPING
// 5. (Sometimes) Waiting for Dispute To Be Resolved (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeRespondedTo); CHECK PROGRESS MAPPING
// 6. (Sometimes) Bounty creator hasn't payed or disputed within 2 weeks after work submission (payoutExpiration[keccak256(abi.encodePacked(_bountyAppId, _creator, msg.sender))] > block.timestamp); CHECK PAYOUTEXPIRATION MAPPING, CURRENT BLOCKTIME
// 7. Finished (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Resolved); look at FundsSent event to figure out how they were resolved; CHECK PROGRESS MAPPING, FUNDSSENT EVENT

const MyBounties: NextPage = () => {
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();
    const network = chain?.network! ? chain?.network! : 'goerli';
    let addresses = contractAddresses.mainnet;
    if (network === 'goerli') {
        addresses = contractAddresses.goerli;
    }

    // Escrow Contract Config
    const contractConfig = {
        addressOrName: addresses.escrow, // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', 
        contractInterface: escrowABI['abi'], // contract abi in json or JS format
    };

    // UMA Skinny OO Contract Config
    const umaContractConfig = {
        addressOrName: addresses.oracle, // '0xeDc52A961B5Ca2AC7B2e0bc36714dB60E5a115Ab', 
        contractInterface: umaABI['abi'],
    };

    // WETH Contract Config (For UMA Bonds)
    const wethContractConfig = {
        addressOrName: addresses.weth, // '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 
        contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
    };

    // DAI Contract Config (For UMA Bonds)
    const daiContractConfig = {
        addressOrName: addresses.dai, 
        contractInterface: daiABI as ContractInterface, 
    };

    // USDC Contract Config (For UMA Bonds)
    const usdcContractConfig = {
        addressOrName: addresses.usdc, 
        contractInterface: usdcABI as ContractInterface, 
    };

    const escrowAddress = addresses.escrow; // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4';
    const identifier = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000"; 
    const escrowContract = useContract({...contractConfig, signerOrProvider: provider, });
    const umaContract = useContract({...umaContractConfig, signerOrProvider: provider, });
    const wethContract = useContract({...wethContractConfig, signerOrProvider: provider, });
    const daiContract = useContract({...daiContractConfig, signerOrProvider: provider,});
    const usdcContract = useContract({...usdcContractConfig, signerOrProvider: provider,});

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
                                                value: "Cornucopia-prod1"
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
            const currentBlockInfo = await provider.getBlock("latest");
            const currentBlocktime = currentBlockInfo.timestamp;
           
            let umaEventData;
            let disputeTokenAddress;
            let disputeAllowance;
            let disputeTokenSymbol;
            let disputeTokenDecimals;
            if (progress === 2) {
                umaEventData = await getUMAEventData(umaContract, escrowContract, provider, 'propose', postData.data.creatorAddress, address!, postData.data.postId);
                disputeTokenAddress = umaEventData?.request.currency;
                if (disputeTokenAddress === wethContract.address) {
                    disputeAllowance = await wethContract.allowance(address, escrowAddress);
                    disputeTokenSymbol = 'WETH';
                    disputeTokenDecimals = 18;
                } else if (disputeTokenAddress === daiContract.address) {
                    disputeAllowance = await daiContract.allowance(address, escrowAddress);
                    disputeTokenSymbol = 'DAI';
                    disputeTokenDecimals = 18;
                } else if (disputeTokenAddress === usdcContract.address) {
                    disputeAllowance = await usdcContract.allowance(address, escrowAddress);
                    disputeTokenSymbol = 'USDC';
                    disputeTokenDecimals = 6;
                }
            }

            let disputeStatus;
            if (progress == 3) {
                umaEventData = await getUMAEventData(umaContract, escrowContract, provider, 'dispute', postData.data.creatorAddress, address!, postData.data.postId);
                disputeStatus = await umaContract.getState(escrowAddress, identifier, umaEventData.timestamp, umaEventData.ancillaryData, umaEventData.request);
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
                disputeAllowance,
                disputeTokenAddress,
                disputeTokenSymbol,
                disputeTokenDecimals,
                disputeStatus
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
                        const disputeTokenAllowance = result[8];
                        const disputeTokenAddress = result[9];
                        const disputeTokenSymbol = result[10];
                        const disputeTokenDecimals = result[11];
                        const disputeStatus = result[12];

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
                                        disputeTokenAllowance={disputeTokenAllowance}
                                        disputeTokenAddress={disputeTokenAddress}
                                        disputeTokenSymbol={disputeTokenSymbol}
                                        disputeTokenDecimals={disputeTokenDecimals}
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
                                >
                                    <HunterContractActions key={postId}
                                        disputeStatus={disputeStatus}
                                        postId={postData.data.postId}
                                        creatorAddress={postData.data.creatorAddress}
                                        appStatus={"settle"}
                                        timestamp={umaEventData.timestamp}
                                        ancillaryData={umaEventData.ancillaryData}
                                        request={umaEventData.request}
                                    />
                                </BasicAccordian>
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
    }, [address, provider, escrowContract, wethContract, umaContract, daiContract, usdcContract, escrowAddress, setSubmittedMap, incrementSubmittedHits]);

    useEffect(() => { 
        if (!isSubmittedValidating && postSubmittedIds?.length > 0) {
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
            value: 66,
            label: 'Dispute Responded To',
        },
        {
            value: 85,
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

    const notMobileScreen = useMediaQuery('(min-width: 531px)');

    const stageLarge = React.useRef(1);
    
    if (!isConnected) {
        return (
            <main className={styles.background}>
                <Box sx={{ display: 'flex', flexDirection: 'column', ...(notMobileScreen ? { paddingLeft: '16vw', } : { paddingLeft: '12vw', }), ...(notMobileScreen ? { paddingRight: '16vw', } : { paddingRight: '12vw', }), paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)', }}> 
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                        <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 13}}>Connect your wallet to get started.</Typography>
                    </Box>
                    {smallScreen && <h2 className={styles.h2}>Applied</h2>}
                    {smallScreen && <h2 className={styles.h2}>In Progress</h2>}
                    {smallScreen && <h2 className={styles.h2}>Submitted</h2>}
                    {smallScreen && <h2 className={styles.h2}>Dispute Initiated</h2>}
                    {smallScreen && <h2 className={styles.h2}>Dispute Responded To</h2>}
                    {smallScreen && <h2 className={styles.h2}>Force Payout</h2>}
                    {smallScreen && <h2 className={styles.h2}>Finished</h2>}
                </Box>
            </main>
            // <div className={styles.background}> 
            //     <WelcomeCard isConnected={isConnected}/>
            // </div>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', ...(notMobileScreen ? { paddingLeft: '16vw', } : { paddingLeft: '12vw', }), ...(notMobileScreen ? { paddingRight: '16vw', } : { paddingRight: '12vw', }), paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)', }}> 
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

                        <Box>
                            {(appliedBountyPosts.length + inProgressBountyPosts.length + submittedBountyPosts.length + disputeInitiatedBountyPosts.length + disputeRespondedToBountyPosts.length + creatorNoActionBountyPosts.length + finishedBountyPosts.length) === 0 && stage === 1 && smallScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2vh', paddingBottom: '2.5vh', gap: '2vh', }}> 
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center', }}>Go to <Link href="/openBounties">Open Bounties</Link> to apply for a bounty.</Typography>
                                </Box>
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
                        {appliedBountyPosts.length === 0 && stage === 1 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center', }}>Go to <Link href="/openBounties">Open Bounties</Link> to apply for a bounty.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 2 && inProgressBountyPosts}
                        {inProgressBountyPosts.length === 0 && stage === 2 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Wait for creators to escrow funds.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 3 && submittedBountyPosts}
                        {submittedBountyPosts.length === 0 && stage === 3 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Submit your work.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 4 && disputeInitiatedBountyPosts}
                        {disputeInitiatedBountyPosts.length === 0 && stage === 4 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Creators have not disputed any of your work.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 5 && disputeRespondedToBountyPosts}
                        {disputeRespondedToBountyPosts.length === 0 && stage === 5 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>You haven&apos;t disputed any creators&apos; disputes.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 6 && creatorNoActionBountyPosts}
                        {creatorNoActionBountyPosts.length === 0 && stage === 6 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Creators can still payout or dispute your work.</Typography>
                            </Box>
                        }
                        {largeScreen && stage === 7 && finishedBountyPosts}
                        {finishedBountyPosts.length === 0 && stage === 7 && largeScreen &&
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>None of your bounties are finished.</Typography>
                            </Box>
                        }

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
                    values: ["Cornucopia-prod1"]
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
                    values: ["Cornucopia-prod1"]
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