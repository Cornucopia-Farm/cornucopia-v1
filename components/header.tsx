import React from 'react';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from '../styles/Home.module.css';

export default function HeaderTabs() {
  return ( 
    <Box className={styles.header} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderColor: 'divider', justifyContent: 'space-between', }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', marginLeft: '16px', gap: '32px', }}> 
        <Link href="/openBounties" >
          <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>Open Bounties</Button>
        </Link>

        <Link href="/myBounties">
            <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>My Bounties</Button>
        </Link>
        
        <Link href="/createBounties">
          <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>Create Bounties</Button>
        </Link>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', }}> 
        <Box> 
          <ConnectButton />
        </Box>
        <Box>
          <Image alt="" src="/corn_logo.png" height="100px" width="100px"/>
        </Box>
      </Box>
    </Box>   
  );
};
