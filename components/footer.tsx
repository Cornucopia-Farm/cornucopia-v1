import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import CowAnimation from '../components/cowAnimation';

// img size is 1080 x 703
export default function Footer() {
    return ( 
      <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '200px', }}>
        <CowAnimation />
        <Image src="/corn_logo_full copy.png" height="100px" width="154px"/>
      </Box>   
    );
};