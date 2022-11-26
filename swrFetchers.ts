import { request } from 'graphql-request';

const gqlFetcher = (query: any, variables: any) => request('/api/graphql', query, variables);

export default gqlFetcher;