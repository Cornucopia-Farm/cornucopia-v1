import type { NextPage } from 'next';
import Head from 'next/head';
import Button from '@mui/material/Button';
import React, { ReactElement, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Form from '../components/form';
import { useAccount, useEnsName, useNetwork, useSigner } from 'wagmi';
import { TailSpin } from 'react-loader-spinner';
import PostedPosts from '../components/postedPosts';
import AppliedPosts from '../components/appliedPosts';
import InProgressPosts from '../components/inProgressPosts';
import SubmittedPosts from '../components/submittedPosts';
import DisputeInitiatedPosts from '../components/disputeInitiatedPosts';
import DisputeRespondedToPosts from '../components/disputeRespondedToPosts';
import FinishedPosts from '../components/finishedPosts';
import styles from '../styles/Home.module.css';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import WelcomeCard from '../components/welcomeCard';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CreateBountiesInfo from '../components/createBountiesInfo';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';
import Image from 'next/image';

// Bounty Stages for Creator:
// 1. Posted (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK PROGRESS MAPPING
// 2. Applied To GETAPPLIEDTOPOSTS returns info on hunter for the post;(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK GETAPPLIEDPOSTS DATA OUTPUT, PROGRESS MAPPING 
// 3. In Progress (Creator Escrows Funds) (Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!") Event Emitted); (Status == NoBounty); CHECK ESCROWED EVENT
// 4. Submitted (Hunter Submits Work) (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Submitted); CHECK PROGRESS MAPPING
// 5. (Sometimes) Disputed: Hunter Needs to Respond to Creator Dispute (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeInitiated); CHECK PROGRESS MAPPING
// 6. (Sometimes) Waiting for Dispute To Be Resolved (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeRespondedTo); CHECK PROGRESS MAPPING
// 7. Finished (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Resolved); look at FundsSent event to figure out how they were resolved; CHECK PROGRESS MAPPING, FUNDSSENT EVENT

// Note: not a bug for a bounty to show up under multiple headers as of now if we let multiple people apply to the same bounty!!

const CreateBounties: NextPage = () => {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();

    const [postedComponents, setPostedComponents] = React.useState(Array<JSX.Element>);
    const [appliedComponents, setAppliedComponents] = React.useState(Array<JSX.Element>);
    const [inProgressComponents, setInProgressComponents] = React.useState(Array<JSX.Element>);
    const [submittedComponents, setSubmittedComponents] = React.useState(Array<JSX.Element>);
    const [disputeInitiatedComponents, setDisputeInitiatedComponents] = React.useState(Array<JSX.Element>);
    const [disputeRespondedToComponents, setDisputeRespondedToComponents] = React.useState(Array<JSX.Element>);
    const [finishedComponents, setFinishedComponents] = React.useState(Array<JSX.Element>);

    const [appliedHits, setAppliedHits] = React.useState(0); // Count of how many components in getAppliedPosts func attempted to render; should equal 2 * bountyIds.length
    const [submittedHits, setSubmittedHits] = React.useState(0); // Count of how many components in getSubmittedPosts func attempted to render; should equal 4 * bountyIds.length

    const incrementAppliedHits = React.useCallback(() => {
        setAppliedHits(state => state + 1);
    }, []);

    const incrementSubmittedHits = React.useCallback(() => {
        setSubmittedHits(state => state + 1);
    }, []);

    const [existsApplied, setExistsApplied] = React.useState(new Map<string, boolean>());
    const [existsSubmitted, setExistsSubmitted] = React.useState(new Map<string, boolean>());

    const setAppliedMap = React.useCallback((postId: string) => {
        setExistsApplied(state => new Map(state.set(postId, true)));
    }, []);

    const setSubmittedMap = React.useCallback((postId: string) => {
        setExistsSubmitted(state => new Map(state.set(postId, true)));
    }, []);

    const [stage, setStage] = React.useState(1);
    const [stageInfo, setStageInfo] = React.useState(false);

    const smallScreen = useMediaQuery('(max-width: 1086px)');
    const largeScreen = useMediaQuery('(min-width: 1087px)');

    const notMobileScreen = useMediaQuery('(min-width: 531px)');

    const { data, error, isValidating } = useSWR([GETPOSTS, { address: address, chain: chain?.network },], gqlFetcher);

    if (error) {
        console.error(error);
    }

    const postIds = React.useMemo(() => {
        return data?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]);

    const getPostedPosts = useCallback((openBountyIds: Array<string>) => {
        const postedBounties: Array<JSX.Element> = [];

        openBountyIds?.forEach((openBountyId: string) => {
            postedBounties.push( 
                <PostedPosts key={openBountyId}  
                    postId={openBountyId}
                    existsApplied={existsApplied}
                    existsSubmitted={existsSubmitted}
                    isValidating={isValidating}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
        });

        setPostedComponents(postedBounties);
    }, [stage, existsApplied, existsSubmitted, isValidating, smallScreen]);

    const getAppliedPosts = useCallback(async (openBountyIds: Array<string>) => {
        const appliedComponentsArr: Array<JSX.Element> = [];
        const inProgressComponentsArr: Array<JSX.Element> = [];

        openBountyIds?.forEach((postId: string) => {
            appliedComponentsArr.push(
                <AppliedPosts key={postId}
                    postId={postId}
                    existsSubmitted={existsSubmitted}
                    setAppliedMap={setAppliedMap}
                    incrementAppliedHits={incrementAppliedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
            inProgressComponentsArr.push(
                <InProgressPosts key={postId}
                    postId={postId}
                    existsSubmitted={existsSubmitted}
                    setAppliedMap={setAppliedMap}
                    incrementAppliedHits={incrementAppliedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
        });

        setAppliedComponents(appliedComponentsArr);
        setInProgressComponents(inProgressComponentsArr);

    }, [stage, incrementAppliedHits, setAppliedMap, existsSubmitted, smallScreen]); // is there an external dependency here??

    const getSubmittedPosts = useCallback((openBountyIds: Array<string>) => {
        const submittedComponentsArr: Array<JSX.Element> = [];
        const disputeInitiatedComponentsArr: Array<JSX.Element> = [];
        const disputeRespondedToComponentsArr: Array<JSX.Element> = [];
        const finishedComponentsArr: Array<JSX.Element> = [];

        openBountyIds?.forEach((postId: string) => {
            submittedComponentsArr.push(
                <SubmittedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                    incrementSubmittedHits={incrementSubmittedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
            disputeInitiatedComponentsArr.push(
                <DisputeInitiatedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                    incrementSubmittedHits={incrementSubmittedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
            disputeRespondedToComponentsArr.push(
                <DisputeRespondedToPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                    incrementSubmittedHits={incrementSubmittedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
            finishedComponentsArr.push(
                <FinishedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                    incrementSubmittedHits={incrementSubmittedHits}
                    stage={stage}
                    smallScreen={smallScreen}
                />
            );
        });

        setSubmittedComponents(submittedComponentsArr);
        setDisputeInitiatedComponents(disputeInitiatedComponentsArr);
        setDisputeRespondedToComponents(disputeRespondedToComponentsArr);
        setFinishedComponents(finishedComponentsArr);

    }, [stage, setSubmittedMap, incrementSubmittedHits, smallScreen]);

    useEffect(() => {
        if (!isValidating && postIds?.length > 0) {
            getSubmittedPosts(postIds);
        }
    }, [isValidating, postIds, getSubmittedPosts]);

    useEffect(() => {
        if (!isValidating && postIds?.length > 0 && submittedHits === postIds.length * 4) {
            getAppliedPosts(postIds);
        }
    }, [isValidating, postIds, getAppliedPosts, submittedHits]);

    useEffect(() => {
        if (!isValidating && postIds?.length > 0 && appliedHits === postIds.length * 2) {
            getPostedPosts(postIds);
        }
    }, [isValidating, postIds, getPostedPosts, appliedHits]);

    const marks = [
        {
            value: 0,
            label: 'Posted',
        },
        {
            value: 11,
            label: 'Applications',
        },
        {
            value: 23,
            label: 'In Progress',
        },
        {
            value: 42,
            label: 'Submitted: Needs Approval',
        },
        {
            value: 63,
            label: 'Dispute Initiated',
        },
        {
            value: 83,
            label: 'Dispute Responded To',
        },
        {
            value: 100,
            label: 'Finished',
        },
    ];

    function valuetext(value: number) {
        return marks[marks.findIndex((mark) => mark.value === value)].label
    }

    const stageLarge = React.useRef(1);

    if (!isConnected) {
        return (
            <main className={styles.background}>
                <Box sx={{ display: 'flex', flexDirection: 'column', ...(notMobileScreen ? { paddingLeft: '16vw', } : { paddingLeft: '12vw', }), ...(notMobileScreen ? { paddingRight: '16vw', } : { paddingRight: '12vw', }), paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)', }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', }}> 
                        <Box sx={{ display: 'flex', flexDirection: 'column', }}>
                            <Button onClick={() => setStageInfo(true)} sx={{ width: '13px !important', height: '13px !important', position: 'absolute', paddingBottom: '20px', paddingLeft: '68px', }}> 
                                <InfoOutlinedIcon sx={{ color: 'rgb(233, 233, 198)', fontSize: '12px', }}/>
                            </Button>
                            <CreateBountiesInfo open={stageInfo} setOpen={setStageInfo}/>
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
                        <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                        <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 13}}>Connect your wallet to get started.</Typography>
                    </Box>
                    {smallScreen && <h2 className={styles.h2}>Posted</h2>}
                    {smallScreen && <h2 className={styles.h2}>Applications</h2>}
                    {smallScreen && <h2 className={styles.h2}>In Progress</h2>}
                    {smallScreen && <h2 className={styles.h2}>Submitted: Needs Approval</h2>}
                    {smallScreen && <h2 className={styles.h2}>Dispute Initiated</h2>}
                    {smallScreen && <h2 className={styles.h2}>Dispute Responded To</h2>}
                    {smallScreen && <h2 className={styles.h2}>Finished</h2>}
                </Box>

            </main>
        );
    } else if (data || !isValidating) {
        return (
            <div>
                <Head>
                    <title>Create Bounties</title>
                    <meta name="description" content="First Farm" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <main className={styles.background}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', ...(notMobileScreen ? { paddingLeft: '16vw', } : { paddingLeft: '12vw', }), ...(notMobileScreen ? { paddingRight: '16vw', } : { paddingRight: '12vw', }), paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)', }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', }}> 
                            <Box sx={{ display: 'flex', flexDirection: 'column', }}>
                                <Button onClick={() => setStageInfo(true)} sx={{ width: '13px !important', height: '13px !important', position: 'absolute', paddingBottom: '20px', paddingLeft: '68px', }}> 
                                    <InfoOutlinedIcon sx={{ color: 'rgb(233, 233, 198)', fontSize: '12px', }}/>
                                </Button>
                                <CreateBountiesInfo open={stageInfo} setOpen={setStageInfo}/>
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
                            {(postedComponents.length + appliedComponents.length + inProgressComponents.length + submittedComponents.length + disputeInitiatedComponents.length + disputeRespondedToComponents.length + finishedComponents.length) === 0 && stage === 1 && smallScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2vh', paddingBottom: '2.5vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="200px" width="200px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '200px', wordWrap: 'break-word', textAlign: 'center'}}>Click on create bounty to post a bounty.</Typography>
                                </Box>
                            }
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}> 
                            {largeScreen && stage === 1 && <h2 className={styles.h2}>Posted</h2>}
                            {largeScreen && stage === 2 && <h2 className={styles.h2}>Applied To</h2>}
                            {largeScreen && stage === 3 && <h2 className={styles.h2}>In Progress</h2>}
                            {largeScreen && stage === 4 && <h2 className={styles.h2}>Submitted: Needs Approval</h2>}
                            {largeScreen && stage === 5 && <h2 className={styles.h2}>Dispute Initiated</h2>}
                            {largeScreen && stage === 6 && <h2 className={styles.h2}>Dispute Responded To</h2>}
                            {largeScreen && stage === 7 && <h2 className={styles.h2}>Finished</h2>}

                            {smallScreen && <h2 className={styles.h2}>Posted</h2>}
                            
                            <Form
                                creatorAddress={address!}
                                formName={"Post Bounty"}
                                summary={"Please fill out this form to create your bounty!"} 
                                formButtons={["Cancel", "Post"]}
                                formType={"createBounty"}
                                tags={[
                                    {
                                        name: "Content-Type",
                                        value: "application/json"
                                    },
                                    {
                                        name: "App-Name",
                                        value: "Cornucopia-test5"
                                    },
                                    {
                                        name: "Form-Type",
                                        value: "bounty-post"
                                    },
                                    {
                                        name: "Creator-Address",
                                        value: address!
                                    },
                                    {
                                        name: "Chain",
                                        value: chain?.network!
                                    }
                                ]}
                            /> 
                        </Box> 
                            {postedComponents}
                            {postedComponents.length === 0 && stage === 1 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Click on create bounty to post a bounty.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>Applications</h2>}
                            {appliedComponents}
                            {appliedComponents.length === 0 && stage === 2 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>No hunters have applied to your bounties yet.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>In Progress</h2>}
                            {inProgressComponents}
                            {!inProgressComponents.length && stage === 3 && largeScreen && 
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>Approve hunters&apos; applications.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>Submitted: Needs Approval</h2>}
                            {submittedComponents}
                            {submittedComponents.length === 0 && stage === 4 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>No hunters have submitted work yet.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>Dispute Initiated</h2>}
                            {disputeInitiatedComponents}
                            {disputeInitiatedComponents.length === 0 && stage === 5 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>You haven&apos;t disputed any hunters&apos; work.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>Dispute Responded To</h2>}
                            {disputeRespondedToComponents}
                            {disputeRespondedToComponents.length === 0 && stage === 6 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>No hunters have responded to any existing disputes yet.</Typography>
                                </Box>
                            }
                            {smallScreen && <h2 className={styles.h2}>Finished</h2>}
                            {finishedComponents}
                            {finishedComponents.length === 0 && stage === 7 && largeScreen &&
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh', gap: '2vh', }}> 
                                    <Image alt="" src="/the_fortune_cow.png" height="300px" width="300px"/>
                                    <Typography className={styles.noBounty} sx={{ color: '#064829', fontSize: 14, maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center'}}>None of your bounties are finished.</Typography>
                                </Box>
                            }
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
}

// Query to get creator's post-ids
const GETPOSTS = gql`
    query GetPosts($address: String!, $chain: String!) {
        transactions(
            tags: [
                {
                    name: "Content-Type",
                    values: ["application/json"]
                },
                {
                    name: "App-Name",
                    values: ["Cornucopia-test5"]
                },
                {
                    name: "Form-Type",
                    values: ["bounty-post"]
                },
                {
                    name: "Creator-Address",
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

export default CreateBounties;