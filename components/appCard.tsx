import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { flexbox } from '@mui/system';
import Link from '@mui/material/Link';
import styles from '../styles/Home.module.css';

type Props = {
  experience: string;
  contactInfo: string;
  arweaveHash: string;
  links: Array<string>;
  workLinks?: Array<string>;
  children?: React.ReactNode;
};

const BasicCard: React.FC<Props> = props => {
  return (
    <Card sx={{ minWidth: '275', borderRadius: '12px',  }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'space-between', paddingLeft: '1px', paddingRight: '1px', paddingTop: '1px' }}>
          <Typography className={styles.cardTag}  sx={{ fontSize: 16, color: '#064829' }}>
            Experience: </Typography> <Typography className={styles.h2}>{props.experience}</Typography>
          <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829' }}>
            Contact Info: {props.contactInfo}
          </Typography>
          <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829' }}>
            Links: {props.links}
          </Typography>
          <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829' }}>
            Work Links: {props.workLinks}
          </Typography>
          <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829' }}>
            Arweave Hash: <Link target="_blank" rel="noopener" href={"https://arweave.net/" + props.arweaveHash}>{props.arweaveHash}</Link>
          </Typography>
        </Box>
      </CardContent>
      <CardActions>
        {props.children}
      </CardActions>
    </Card>
  );
};

export default BasicCard;
