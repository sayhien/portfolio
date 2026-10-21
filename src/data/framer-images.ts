// Case study pictures still live on Framer's image host. Keeping the host in
// one place means moving them into the repo later is a one line change here.
const FRAMER_IMAGES = 'https://framerusercontent.com/images/';

export const framerImage = (file: string) => FRAMER_IMAGES + file;
