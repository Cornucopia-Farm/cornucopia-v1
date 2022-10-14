import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Button from '@mui/material/Button';
import React, { ReactElement, useEffect } from 'react';
import BasicAccordian from '../components/basicAccordion';
import NestedAccordian from '../components/nestedAccordion';
import Box from '@mui/material/Box';
import Form from '../components/form';
import { useQuery, gql } from '@apollo/client';
import ClientOnly from '../components/clientOnly';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useAccount, useEnsName, useNetwork, useSigner } from 'wagmi';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
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
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

// Bounty Stages for Creator:
// 1. Posted (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK PROGRESS MAPPING
// 2. Applied To GETAPPLIEDTOPOSTS returns info on hunter for the post;(progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.NoBounty); CHECK GETAPPLIEDPOSTS DATA OUTPUT, PROGRESS MAPPING 
// 3. In Progress (Creator Escrows Funds) (Escrowed(msg.sender, _hunter, _bountyAppId, "Escrowed!") Event Emitted); (Status == NoBounty); CHECK ESCROWED EVENT
// 4. Submitted (Hunter Submits Work) (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Submitted); CHECK PROGRESS MAPPING
// 5. (Sometimes) Disputed: Hunter Needs to Respond to Creator Dispute (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeInitiated); CHECK PROGRESS MAPPING
// 6. (Sometimes) Waiting for Dispute To Be Resolved (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.DisputeRespondedTo); CHECK PROGRESS MAPPING
// 7. Finished (progress[keccak256(abi.encodePacked(_bountyAppId, _creator, _hunter))] == Status.Resolved); look at FundsSent event to figure out how they were resolved; CHECK PROGRESS MAPPING, FUNDSSENT EVENT

// TODO: Need to deal with different payout cases!!: deduce who won by listening to emmitted event from payout fn
// How do we show the above in the UI??

// TODO: should we be passing in the promise or the resolved data into the sub components for each page?
// for posted posts we pass in the resolved data as otherwise existsApplied or existsSubmitted might still be being calculated 

// Note: not a bug for a bounty to show up under multiple headers as of now if we let multiple people apply to the same bounty!!

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
    addressOrName: process.env.ESCROW_ADDRESS!, // contract address on goerli
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

const CreateBounties: NextPage = () => {

    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address, enabled: false, });
    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();
    
    if (!isConnected) {
        return (
            <h2>Please Connect Your Wallet!!</h2>
        );
    }

    const [postedComponents, setPostedComponents] = React.useState(Array<JSX.Element>);
    const [appliedComponents, setAppliedComponents] = React.useState(Array<JSX.Element>);
    const [inProgressComponents, setInProgressComponents] = React.useState(Array<JSX.Element>);
    const [submittedComponents, setSubmittedComponents] = React.useState(Array<JSX.Element>);
    const [disputeInitiatedComponents, setDisputeInitiatedComponents] = React.useState(Array<JSX.Element>);
    const [disputeRespondedToComponents, setDisputeRespondedToComponents] = React.useState(Array<JSX.Element>);
    const [finishedComponents, setFinishedComponents] = React.useState(Array<JSX.Element>);

    // const [existsApplied, setExistsApplied] = React.useState(new Map());
    // const [existsSubmitted, setExistsSubmitted] = React.useState(new Map());

    // Query takes in user's address and returns all bounties that they've created 
    const { data, loading, error, startPolling } = useQuery(GETPOSTS, { variables: { address, chain: chain?.network }, });
    startPolling(10000);
    
    if (error) {
        console.error(error);
    }

    const postIds = data?.transactions.edges.map((edge: any) => edge.node.id);

    const getPostedPosts = async (openBountyIds: Array<string>, existsApplied: Promise<Map<string, boolean>>, existsSubmitted: Promise<Map<string, boolean>>) => {
        const postedBounties: Array<JSX.Element> = [];

        const promises = openBountyIds?.map( async (openBountyId: string) => {
            postedBounties.push( 
                <PostedPosts key={openBountyId}  
                    postId={openBountyId}
                    existsApplied={await existsApplied}
                    existsSubmitted={await existsSubmitted}
                    loading={loading}
                />
            );

            // const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            // const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            // // this isn't checking as these can be null when passed in
            // if (postId && !existsApplied.has(postId) && !existsSubmitted.has(postId)) { 
            //     console.log("postid for posted bounty",postId);
            //     postedBounties.push( 
            //         // <NestedAccordian key={postId}
            //         //     postLinks={postData.data.postLinks}
            //         //     date={postData.data.date}
            //         //     time={postData.data.time}
            //         //     description={postData.data.description}
            //         //     bountyName={postData.data.title}
            //         //     amount={postData.data.amount}
            //         // />
            //         <PostedPosts key={address!}  
            //             postId={openBountyId}
            //             existsApplied={existsApplied}
            //             existsSubmitted={existsSubmitted}
            //             loading={loading}
            //         />
            //     );
            // }
        });
        // console.log("in posted posts func")
        // postedBounties.push(
        //     <PostedPosts key={address!}  
        //         postIds={openBountyIds}
        //         existsApplied={existsApplied}
        //         existsSubmitted={existsSubmitted}
        //         loading={loading}
        //     />
        // );
        // setPostedBountyPosts(postedBounties);
        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setPostedComponents(postedBounties);
    };

    const getAppliedPosts = async (openBountyIds: Array<string>, existsSubmitted: Promise<Map<string, boolean>>) => {
        const existsApplied = new Map();

        const setAppliedMap = (postId: string) => {
            existsApplied.set(postId, true);
        };

        const appliedComponentsArr: Array<JSX.Element> = [];
        const inProgressComponentsArr: Array<JSX.Element> = [];

        const promises = openBountyIds?.map( async (postId: string) => {
            appliedComponentsArr.push(
                <AppliedPosts key={postId}
                    postId={postId}
                    existsSubmitted={existsSubmitted}
                    setAppliedMap={setAppliedMap}
                />
            );
            inProgressComponentsArr.push(
                <InProgressPosts key={postId}
                    postId={postId}
                    existsSubmitted={existsSubmitted}
                    setAppliedMap={setAppliedMap}
                />
            );
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setAppliedComponents(appliedComponentsArr);
        setInProgressComponents(inProgressComponentsArr);

        return existsApplied;
    };

    const getSubmittedPosts = async (openBountyIds: Array<string>) => {
        const existsSubmitted = new Map();

        const setSubmittedMap = (postId: string) => {
            existsSubmitted.set(postId, true);
        };

        const submittedComponentsArr: Array<JSX.Element> = [];
        const disputeInitiatedComponentsArr: Array<JSX.Element> = [];
        const disputeRespondedToComponentsArr: Array<JSX.Element> = [];
        const finishedComponentsArr: Array<JSX.Element> = [];

        const promises = openBountyIds?.map( async (postId: string) => {
            submittedComponentsArr.push(
                <SubmittedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                />
            );
            disputeInitiatedComponentsArr.push(
                <DisputeInitiatedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                />
            );
            disputeRespondedToComponentsArr.push(
                <DisputeRespondedToPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                />
            );
            finishedComponentsArr.push(
                <FinishedPosts key={postId}
                    postId={postId}
                    setSubmittedMap={setSubmittedMap}
                />
            );
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setSubmittedComponents(submittedComponentsArr);
        setDisputeInitiatedComponents(disputeInitiatedComponentsArr);
        setDisputeRespondedToComponents(disputeRespondedToComponentsArr);
        setFinishedComponents(finishedComponentsArr);

        return existsSubmitted;
    };

    useEffect(() => {
        if (!loading && postIds?.length > 0) {
            const existsSubmittedHere = getSubmittedPosts(postIds);
            const existsAppliedHere = getAppliedPosts(postIds, existsSubmittedHere);
            getPostedPosts(postIds, existsAppliedHere, existsSubmittedHere);
        }
    }, [loading]);

    const marks = [
        {
            value: 0,
            label: 'Posted',
        },
        {
            value: 15,
            label: 'Applied To',
        },
        {
            value: 30,
            label: 'In Progress',
        },
        {
            value: 45,
            label: 'Submitted: Needs Approval',
        },
        {
            value: 60,
            label: 'Dispute Initiated',
        },
        {
            value: 75,
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
      
    const [stage, setStage] = React.useState(1);

    if (!loading) {
        return (
            <div>
                <Head>
                    <title>Create Bounties</title>
                    <meta name="description" content="First Farm" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
    
                <main className={styles.background}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '160px', paddingRight: '160px', paddingTop: '24px', color: 'rgba(6, 72, 41, 0.85)' }}>
                        <Form
                            creatorAddress={address!}
                            formName={"Post Bounty"}
                            summary={"Please fill out this form to create your bounty!"} 
                            formButtons={["Cancel", "Post"]}
                            formType={"createBounty"}
                            // refetch={refetch}
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
                        <Slider
                            aria-label="Restricted values"
                            defaultValue={0}
                            getAriaValueText={valuetext}
                            step={null}
                            valueLabelDisplay="auto"
                            marks={marks}
                            onChange={(e, val) => setStage(marks.findIndex((mark) => mark.value === val) + 1)}
                            sx={{ color: 'white', '& .MuiSlider-markLabel': { color: 'rgb(233, 233, 198)', fontFamily: 'Space Grotesk' }}}
                        />
                        {stage === 1 && 
                            <div> 
                                <h2 className={styles.h2}>Posted</h2>
                                <ClientOnly>
                                    {postedComponents}
                                </ClientOnly>
                            </div>
                        } 
                        {stage === 2 && 
                            <div> 
                                <h2 className={styles.h2}>Applied To</h2>
                                <ClientOnly>
                                    {appliedComponents}
                                </ClientOnly>
                            </div>
                        }
                        {stage === 3 && 
                            <div> 
                                <h2 className={styles.h2}>In Progress</h2>
                                <ClientOnly>
                                    {inProgressComponents}
                                </ClientOnly>
                            </div>
                        }
                        {stage === 4 && 
                            <div> 
                                <h2 className={styles.h2}>Submitted: Needs Approval</h2>
                                <ClientOnly>
                                    {submittedComponents}
                                </ClientOnly>
                            </div>
                        }
                        {stage === 5 && 
                            <div> 
                                <h2 className={styles.h2}>Dispute Initiated</h2>
                                <ClientOnly>
                                    {disputeInitiatedComponents}
                                </ClientOnly>
                            </div>
                        }
                        {stage === 6 && 
                            <div> 
                                <h2 className={styles.h2}>Dispute Responded To</h2>
                                <ClientOnly>
                                    {disputeRespondedToComponents}
                                </ClientOnly>
                            </div>
                        }
                        {stage === 7 && 
                            <div> 
                                <h2 className={styles.h2}>Finished</h2>
                                <ClientOnly>
                                    {finishedComponents}
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
                    values: ["Cornucopia-test"]
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