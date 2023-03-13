// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios';

const getSocialData = async () => {
    const response = await axios.get(`https://api.github.com/gists/${process.env.GIST_ID}`);
    const gist = response.data;
    return JSON.parse(gist.files[process.env.GIST_FILENAME!].content);
};

const updateSocialData = async (updatedData: Object) => {
  const response = await axios.patch(
    `https://api.github.com/gists/${process.env.GIST_ID}`, 
    [
        JSON.stringify({
            files: {
              [process.env.GIST_FILENAME!]: {
                content: JSON.stringify(updatedData),
              },
            },
        }),
    ],
    {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
    }
  );

  return response.data;
};


export default async function handler(req: any, res: any) { // Making this a type causes prod issues
  if (req.method === 'GET') {
    try {
      const socialData = await getSocialData();
      res.status(200).json({socialData});
    } catch (error) {
      res.status(500).send(error);
    }
  } else if (req.method === 'PATCH') {
    try {
        const socialData = await updateSocialData(req.body.updatedData);
        res.status(200).json({socialData});
    } catch (error) {
        res.status(500).send(error);
    }
  }
};