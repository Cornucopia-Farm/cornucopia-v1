import '../styles/globals.css';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { NextPage } from 'next';
import type { AppProps } from 'next/app';
import  { useEffect } from 'react';
import Layout from '../components/layout';
import '@rainbow-me/rainbowkit/styles.css';
import { connectorsForWallets, getDefaultWallets, RainbowKitProvider, wallet, darkTheme, midnightTheme, Theme, Chain } from '@rainbow-me/rainbowkit';
import {
  chain,
  configureChains,
  createClient,
  WagmiConfig
} from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { makeStyles } from '@mui/styles';
import merge from 'lodash.merge';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

// type NextPageWithLayout = NextPage & {
//   getLayout?: (page: ReactElement) => ReactNode
// };

// type AppPropsWithLayout = AppProps & {
//   Component: NextPageWithLayout
// };

type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout<P> = AppProps<P> & { 
  Component: NextPageWithLayout<P>; 
};

const aurora: Chain = {
  id: 1313161554,
  name: 'Aurora',
  network: 'aurora',
  iconUrl: 'https://raw.githubusercontent.com/aurora-is-near/bridge-assets/master/tokens/aurora.svg',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: 'https://mainnet.aurora.dev',
  },
  blockExplorers: {
    default: { name: 'AuroraScan', url: 'aurorascan.dev' },
  }
}

const { chains, provider, webSocketProvider  } = configureChains(
  // [chain.mainnet, chain.polygon, chain.arbitrum, chain.optimism, chain.goerli, aurora], // chain.localhost,
  [chain.mainnet, chain.goerli], // chain.localhost,
  [
    alchemyProvider({ apiKey: '8kuy75lJC7Rq_P7tpu-n2_q1cOJ0nctf' }),
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === aurora.id) {
          return { http: chain.rpcUrls.default };
        } 
        return null;
      },
    }),
    // publicProvider(),
    // jsonRpcProvider({ rpc: (chain: any) => ({ http: `http://localhost:8545/ ` })}),
  ]
);

const { wallets } = getDefaultWallets({
  appName: 'Cornucopia',
  chains
});

const connectors = connectorsForWallets([
  ...wallets,
  // {
  //   groupName: 'Other',
  //   wallets: [
  //     wallet.argent({ chains }),
  //     wallet.trust({ chains }),
  //     wallet.ledger({ chains }),
  //   ],
  // },
]);


const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider 
});

const myTheme = merge(midnightTheme(), {
  fonts: {
    body: 'Space Grotesk !important',
  },
  colors: {
    connectButtonText: 'rgb(233, 233, 198) !important',
    connectButtonTextError: 'rgb(233, 233, 198) !important',
    modalText: 'rgb(233, 233, 198) !important',
    accentColor: 'rgb(248, 215, 154) !important', // Connect Wallet Color
    accentColorForeground: 'rgb(23, 21, 20) !important', // Connect Wallet Font
    // actionButtonSecondaryBackground: 'rgb(233, 233, 198)',
    // selectedOptionBorder: 'rgb(248, 215, 154)',
    // connectButtonInnerBackground: 'rgb(233, 233, 198)',
    // modalTextSecondary:'rgb(233, 233, 198)',
    // standby: 'rgb(248, 215, 154)',
    // connectionIndicator: 'rgb(233, 233, 198)',
  },
} as Theme);

export default function MyApp({ Component, pageProps, }: AppPropsWithLayout<{ session: Session }>) {
  
    useEffect(() => {
      const jssStyles = document.querySelector('#jss-server-side')
      if (jssStyles) {
        jssStyles.parentElement!.removeChild(jssStyles)
      }
    }, []);

    return (
      <WagmiConfig client={wagmiClient}> 
        <SessionProvider session={pageProps.session}> 
          <RainbowKitProvider theme={myTheme} chains={chains} >
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </RainbowKitProvider>
        </SessionProvider>
      </WagmiConfig>
    );
};

