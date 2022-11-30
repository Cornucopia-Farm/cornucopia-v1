import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useCallback, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Form from '../components/form';
import BasicAccordian from '../components/basicAccordion';
import Card from '@mui/material/Card';
import axios from 'axios';
import { useAccount, useNetwork } from 'wagmi';
import { TailSpin } from 'react-loader-spinner';
import styles from '../styles/Home.module.css';
import WelcomeCard from '../components/welcomeCard';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';

const OpenBounties: NextPage = () => {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();

    const [openBountyPosts, setOpenBountyPosts] = React.useState(Array<JSX.Element>);

    const { data, error, isValidating } = useSWR([OPENBOUNTIES, { chain: chain?.network! ? chain?.network! : 'ethereum' },], gqlFetcher);

    if (error) {
        console.error(error); 
    }

    const postIds = useMemo(() => {
        return data?.transactions.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]) 

    const getPosts = useCallback(async (openBountyIds?: Array<string>) => {
        let bountyPosts: Array<JSX.Element> = [];
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            return await axios.get(`https://arweave.net/${openBountyId}`);    
        });

        if (promises) {
            Promise.all(promises).then((results) => {
                results.forEach((postData) => {
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
                            arweaveHash={postId!}
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
                                        value: "Cornucopia-test4"
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
                setOpenBountyPosts(bountyPosts);
            }); // Wait for these promises to resolve before setting the state variables
        }
    }, [address, chain]);

    useEffect(() => {
        if (postIds && postIds.length > 0 && !isValidating) {
            getPosts(postIds);
        } 
    }, [getPosts, postIds, isValidating]);
    
    if (!isConnected) {
        return (
            <div className={styles.background}> 
                <WelcomeCard isConnected={isConnected}/>
            </div>
        );
    } else if (!isValidating) {
        return (
            <div className={styles.background}>
                <Head>
                    <title>Open Bounties</title>
                    <meta name="description" content="Cornucopia is a permissionless freelancing protocol where projects/DAOs can create bounties for freelancers to complete." />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <main>
                <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '160px', paddingRight: '160px', color: 'rgba(6, 72, 41, 0.85)', }}> 
                    <h2 className={styles.h2}>Open Bounties</h2>
                    <Card className={styles.accordionBackground} sx={{ backgroundColor: 'rgba(6, 72, 41, 0.05)', borderRadius: '12px', paddingTop: '12px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px', }}> 
                        {openBountyPosts}
                    </Card>
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
                    values: ["Cornucopia-test4"]
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

