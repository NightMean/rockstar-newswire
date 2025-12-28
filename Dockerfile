FROM node:22-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Update Puppeteer to use installed Chrome if desired, or just rely on bundled chromium with dependencies installed above
# We'll set ENV to tell puppeteer to skip download if we wanted to use system chrome, but for now we let it download its compatible revision
# Just in case, we can set P_SKIP_CHROMIUM_DOWNLOAD=true and executable path if we prefer system chrome. 
# But standard practice for simplicity: let puppeteer download its own, we just provided libs.

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Expose port (if RSS is enabled)
EXPOSE 3000

CMD [ "node", "index.js" ]
