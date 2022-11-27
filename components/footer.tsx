import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import CowAnimation from '../components/cowAnimation';
import CowAnimation2 from '../components/cowAnimation2';
import CowAnimation3 from '../components/cowAnimation3';

// img size is 1080 x 703
export default function Footer() {
    return ( 
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'absolute', bottom: 0, width: '100%', }}> 
        {/* <Box>  */}
          {/* <CowAnimation /> */}
          {/* <CowAnimation2 /> */}
          <CowAnimation3 />
        {/* </Box> */}

        {/* <Image src="/corn_logo_full copy.png" height="100px" width="154px"/> */}
        {/* <Image src="/corn_logo_full copy.png" height="88px" width="135px"/> */}
        <Image src="/corn_text.png" height="24px" width="121px"/>
      </Box>   
    );
};

// 	1212 × 238