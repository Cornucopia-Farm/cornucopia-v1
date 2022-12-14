import React from 'react';
import Box from '@mui/material/Box';
import Image from 'next/image';
import CowAnimation3 from '../components/cowAnimation3';
import twoBlades from '../images/two_blades.svg';
import threeBlades from '../images/three_blades.svg';
import tripleGrass from '../images/triple_grass.svg';
import fourGrass from '../images/four_grass.svg';

// img size is 1080 x 703
export default function Footer() {
    return ( 
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'relative', bottom: 0, width: '100vw', marginTop: '3vh', overflow: 'hidden', }}> 
        <CowAnimation3 />
        <Box sx={{ display: 'flex', justifyContent: 'center'}}> 
          <Box sx={{ display: 'flex', justifyContent: 'center'}}>
            <Image alt="" src={tripleGrass} height="24px" width="121px"/>
            <Image alt="" src={twoBlades} height="24px" width="121px"/>          
            <Image alt="" src={threeBlades} height="24px" width="121px"/>
          </Box>
          <Box sx={{ minHeight:'24px', minWidth:'121px', }}>
            <Image alt="" src="/corn_text.png" height="24px" width="121px"/>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center'}}>
            <Image alt="" src={threeBlades} height="24px" width="121px"/>
            <Image alt="" src={twoBlades} height="24px" width="121px"/>
            <Image alt="" src={fourGrass} height="24px" width="121px"/>
          </Box>
        </Box>
      </Box>   
    );
};

// 	1212 × 238