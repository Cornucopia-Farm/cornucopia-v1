import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Button from '@mui/material/Button';
import React, { ReactElement, useEffect } from 'react';
// import Table from '../components/table';
import Box from '@mui/material/Box';
import Form from '../components/form';
import BasicAccordian from '../components/basicAccordion';
import Card from '@mui/material/Card';
import { useQuery, gql } from '@apollo/client';
import ClientOnly from '../components/clientOnly';
import axios from 'axios';
import { useAccount, useEnsName, useProvider, useSigner, useNetwork } from 'wagmi';
import { CompressOutlined } from '@mui/icons-material';
import { TailSpin } from 'react-loader-spinner';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import styles from '../styles/Home.module.css';
import { gsap } from "gsap";
import cloud from '../images/cloud.jpg';
import farm from '../images/farm.svg';
import cows from '../images/cows.svg';
import clouds from '../images/clouds.svg';
import useSessionModal from '../components/useSessionModal';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import WelcomeCard from '../components/welcomeCard';

type ArData = {
    address: string;
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

const OpenBounties: NextPage = () => {
    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address, enabled: false, });
    const { chain } = useNetwork();

    const [openBountyPosts, setOpenBountyPosts] = React.useState(Array<JSX.Element>);

    const { data, loading, error, startPolling } = useQuery(OPENBOUNTIES, { variables: { chain: chain?.network! ? chain?.network! : 'ethereum' }, }); // Set default chain to ethereum if nothing connected
    startPolling(1000);
    console.log(data)

    if (error) {
        console.error(error); // add snackbar error msg;
    }

    const postIds = data?.transactions.edges.map((edge: any) => edge.node.id);

    const getPosts = async (openBountyIds?: Array<string>) => {
        let bountyPosts: Array<JSX.Element> = [];
        console.log('bounty ids',openBountyIds)
        const promises = openBountyIds?.map( async (openBountyId: string) => {

            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            const postId = postData?.config?.url?.split("https://arweave.net/")[1]; // This is the postId of the creator's post

            bountyPosts.push(
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
                        postId={postId}
                        postLinks={postData.data.postLinks}
                        startDate={postData.data.startDate}
                        endDate={postData.data.endDate}
                        description={postData.data.description}
                        title={postData.data.title}
                        amount={postData.data.amount}
                        tokenAddress={postData.data.tokenAddress}
                        tokenSymbol={postData.data.tokenSymbol}
                        tokenDecimals={postData.data.tokenDecimals}
                        formName={"Apply"}
                        summary={"Please fill out this form to apply to this bounty!"}  
                        formButtons={["Cancel", "Apply"]}
                        formType={"applyBounty"}
                        tags={[
                            {
                                name: "Content-Type",
                                value: "application/json"
                            },
                            {
                                name: "App-Name",
                                value: "Cornucopia-test2"
                            },
                            {
                                name: "Form-Type",
                                value: "bounty-app"
                            },
                            {
                                name: "Hunter-Address",
                                value: address!
                            },
                            {
                                name: "Post-ID",
                                value: postId // postID of the bounty created by the creator
                            },
                            {
                                name: "Chain",
                                value: chain?.network!
                            }
                        ]}
                    />
                </BasicAccordian>
            ); 
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }
        // change foreach to map which returns an array of promises then await for this array of promises to resolve using promise.all before the code continues

        setOpenBountyPosts(bountyPosts);
    };

    useEffect(() => {
        if (!loading) {
            getPosts(postIds);
        } 
    }, [loading, postIds.length]);

    const [showModal, hideModal] = useSessionModal();

    if (showModal) {
        return (
            <Dialog open={showModal} onClose={hideModal} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                <DialogTitle className={styles.formHeader}>Welcome to Cornucopia!</DialogTitle>
                <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody}>
                    Cornucopia is a permissionless bounty protocol where projects/DAOs can post bounties for freelancers to apply to. Once the bounty creator 
                    accepts the application, the bounty amount will be escrowed in the Cornucopia smart contract. After a freelancer submits their work, the 
                    creator can then choose to pay freelancer, sending the escrowed funds to the freelancer, or dispute the bounty. A creator might dispute the bounty
                    if they think that the freelancer's submitted work doesn't match the bounty description. 
                    <br />
                    <br />
                    The freelancer then has 1 week to respond to the dispute: they can 
                    either dispute the creator's dispute or leave it and loose any chance of recuperating some of the bounty amount. If they choose to dispute, then the dispute 
                    is escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) who then vote whether they think the freelancer did the work, did not do the work, or unclear whether the freelancer did the work.
                    In the first case, the freelancer gets paid the bounty amount plus half the bond the creator put up to dispute the work. In the second case, the creator gets their 
                    escrowed funds back plus half the bond the freelancer put up to dispute the creator's dispute. In the third case, the freelancer gets paid half the bounty amount and 
                    half the bond the creator put up to dispute the work while the creator gets half the bount amount back. 
                    <br />
                    <br />
                    Connect your wallet and select your chain of choice to view and apply for open bounties and create bounties of your own!  
                    </DialogContentText>
                </DialogContent>
                <DialogActions className={styles.formFooter}>
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={hideModal}>Got it!</Button>
                </DialogActions>
            </Dialog>
        );
    }
    
    if (!isConnected) {
        return (
            <WelcomeCard isConnected={isConnected}/>
        );
    } else if (!loading && openBountyPosts.length > 0) {
        return (
            <div>
                <Head>
                    <title>Open Bounties</title>
                    <meta name="description" content="Cornucopia is a permissionless freelancing protocol where projects/DAOs can create bounties for freelancers to complete." />
                    <link rel="icon" href="/favicon.ico" />
                </Head>

                <main>
                <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '160px', paddingRight: '160px', color: 'rgba(6, 72, 41, 0.85)', }}> 
                    <h2 className={styles.h2}>Open Bounties</h2>
                    <Card className={styles.accordionBackground} sx={{backgroundColor: 'rgba(6, 72, 41, 0.05)', borderRadius: '12px', paddingTop: '12px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}> 
                        <ClientOnly>
                            {openBountyPosts}
                        </ClientOnly>
                    </Card>
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

const OPENBOUNTIES = gql`
    query OpenBounties($chain: String!) {
        transactions(
            tags: [
                {
                    name: "Content-Type",
                    values: ["application/json"]
                },
                {
                    name: "App-Name",
                    values: ["Cornucopia-test2"]
                },
                {
                    name: "Form-Type",
                    values: ["bounty-post"]
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

export default OpenBounties;

