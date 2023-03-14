import axios from 'axios';
import { Session } from 'next-auth';
import { useEffect, useCallback, useState } from 'react';
import useSWR from 'swr';
import { socialFetcher } from '../swrFetchers';

type SocialData = {
    github: {
        username?: string;
        userLink?: string;
        profilePic?: string | null;
    };
    twitter: {
        username?: string;
        userLink?: string;
        profilePic?: string | null;
    };
};

const useSocial = (companyOrPerson: string) => {
    const [addressSocialData, setAddressSocialData] = useState<SocialData>();

    const getSocial = useCallback(async (address: string) => {
        const response = await axios.get('api/social');
        const socialData = response.data.socialData;
        if (address in socialData) {
            setAddressSocialData(socialData[address]);
        }
    }, []);

    useEffect(() => {
        // const getSocial = async (address: string) => {
        //     const response = await axios.get('api/social');
        //     const socialData = response.data.socialData;
        //     if (address in socialData) {
        //         setAddressSocialData(socialData[address]);
        //     }
        // };
        if (companyOrPerson) {
            getSocial(companyOrPerson);
        }
    }, [companyOrPerson, getSocial]);

    return addressSocialData;
};

const useUpdateSocial = (session: Session | null, address?: string) => {    
    const { data, error, isValidating } = useSWR('api/social', socialFetcher);

    if (error) {
        console.error(error);
    }

    const setSocialData = (session: Session, address: string, socialData: any) => {
        console.log('socialData', socialData)
        const addressData = { 
            [address]: {
                "github": {
                    "username": session.user.login,
                    "userLink": session.user.url,
                    "profilePic": session.user.login ? session.user.image : '',
                },
                "twitter": {
                    "username": session.user.username,
                    "userLink": session.user.twitter_url,
                    "profilePic": session.user.username ? session.user.image : '',
                },
            }
        };
    
        let updatedData;
        if (socialData.length > 0) {
            updatedData = { ...socialData, ...addressData };
        } else {
            updatedData = {...addressData}
        }
        return updatedData;
    };

    const updateData = useCallback(async (updatedData: any) => {
        const response = await axios.patch('/api/social', { updatedData },);
        console.log('Updated social data', await response.data)
    }, []);

    useEffect(() => {
        // const updateData = async (updatedData: any) => {
        //     const response = await axios.patch('/api/social', { updatedData },);
        //     console.log(await response.data)
        // };
        if (!isValidating && data && address && session) {
            console.log('sesh')
            if (!(address in data)) {
                console.log('the data', data)
                const updatedData = setSocialData(session, address, data);
                updateData(updatedData);
            }
        }
    }, [isValidating, data, address, session, updateData]);
};

export { useSocial, useUpdateSocial };