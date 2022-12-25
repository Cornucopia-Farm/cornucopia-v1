import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BountyCard from './bountyCard';
import { Dayjs } from 'dayjs';
import styles from '../styles/Home.module.css';

type Props = {
  description: string;
  startDate: Dayjs;
  endDate: Dayjs;
  bountyName: string;
  amount: number;
  arweaveHash: string;
  postLinks: string;
  workLinks?: string;
  applications?: Array<JSX.Element>;
  tokenSymbol: string;
};

const NestedAccordion: React.FC<Props> = props => {
  return (
    <div>
      <Accordion square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)', boxShadow: '0px 0px 3px rgb(248, 215, 154)', }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'rgb(233, 233, 198)', marginLeft: '2vh !important', }}/>}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
            <Typography className={styles.h2} sx={{ width: '90%', flexShrink: 0, color: '#064829', }}>{props.bountyName}</Typography>
            <Typography className={styles.h2} sx={{ color: '#064829', }}>{props.amount} {props.tokenSymbol}</Typography>     
        </AccordionSummary>
        <AccordionDetails>
          <BountyCard 
            description={props.description}
            startDate={props.startDate}
            endDate={props.endDate} 
            links={props.postLinks}
            workLinks={props.workLinks}
            arweaveHash={props.arweaveHash}
          />
        {props.applications} 
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default NestedAccordion;