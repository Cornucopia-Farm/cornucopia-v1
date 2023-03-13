import axios from 'axios';
import { Session } from 'next-auth';
import { useEffect, useCallback } from 'react';

const useSocial = (session: Session, company: string) => {
    const getSocialAccount = useCallback(async (company: string) => {
        const response = await axios.get('api/social');
        // see if session params are here as address => social params; if so return them, otherwise 
        // call axios.patch to update params with mapping and return mapping
        // set mapping for github and twitter

    }, []);

    useEffect(() => {

    }, [session, company])

};

export default useSocial;