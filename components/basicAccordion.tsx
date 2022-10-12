import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BountyCard from './bountyCard';
import Box from '@mui/material/Box';
import { useEnsName } from 'wagmi';
import styles from '../styles/Home.module.css';

type Props = { // need to change bounty card to specify which component it is for!
  company: string;
  bountyName: string;
  description: string;
  date: string;
  time: string;
  postLinks: Array<string>;
  amount: number;
  arweaveHash: string;
  workLinks?: Array<string>;
  disputes: boolean;
  children?: React.ReactNode;
};

const BasicAccordion: React.FC<Props> = props => {

  const { data: ensName } = useEnsName({ address: props.company });

  const dispute = () => {
    if (props.disputes) {
      return props.children;
    };
  };

  const button = () => {
    if (!props.disputes) {
      return props.children;
    };
  };

  return (
    <div>
      <Accordion className={styles.accordionBackground} square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)' }} >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{color: 'rgb(233, 233, 198)'}}/>}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Box sx={{ borderRadius: '12px', width: '45%', flexShrink: 0 }}> 
            <Typography className={styles.h2} sx={{ color: '#064829' }}>{ensName ? ensName : props.company}</Typography>
          </Box>
          <Typography className={styles.h2} sx={{ width: '45%', flexShrink: 0, color: '#064829' }}>{props.bountyName}</Typography> 
          <Typography className={styles.h2} sx={{ color: '#064829' }}>{props.amount} ETH</Typography> 
            
        </AccordionSummary>
        <AccordionDetails >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <BountyCard  
              description={props.description}
              date={props.date}
              time={props.time} 
              arweaveHash={props.arweaveHash}
              links={props.postLinks}
              workLinks={props.workLinks}
            >
            {button()}
            </BountyCard>
            {dispute()}
          </Box>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default BasicAccordion;