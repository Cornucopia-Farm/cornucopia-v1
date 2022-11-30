import { request } from 'graphql-request';

const gqlFetcher = (query: any, variables: any) => request('https://arweave.net/graphql', query, variables);

export default gqlFetcher;