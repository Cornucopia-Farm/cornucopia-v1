import { request } from 'graphql-request';

const gqlFetcher = (query: any, variables: any) => request('https://arweave.net/graphql', query, variables);

const socialFetcher = (url: string) => fetch(url).then((res) => res.json());

const socialUpdateFetcher = (url: string, { arg }: { arg: { updatedData: any }}) => fetch(url, {
        method: 'PATCH',
        body: JSON.stringify(arg)
    }).then((res) => res.json());


export { gqlFetcher, socialFetcher, socialUpdateFetcher };