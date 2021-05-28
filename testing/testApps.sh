#! /bin/sh
GREEN='\e[0m\e[1m\e[32m'
PURPLE='\e[0m\e[35m\e[1m'
CYAN='\e[0m\e[1m\e[36m'
NC='\e[0m'
BLUE='\e[0m\e[1m\e[34m'
DIM='\e[2m'

echo -e "${GREEN}Hello, thanks for testing! I will make a directory and download the examples
git repo and then start a local server for space-inspector.${DIM}"
mkdir testingTemp
cd testingTemp
git clone https://github.com/highfidelity/Spatial-Audio-API-Examples.git
cd Spatial-Audio-API-Examples/experiments/web/space-inspector
python3 -m http.server 8090 &
serverPID=$!
cd ../../../
sleep 1
echo -e "${GREEN}\nGreat, I have all the latest files and your local server has been started on port 8090 with 
PID ${serverPID}. Create a token for the testing space we will be using and then go to ${CYAN}http://localhost:8090/${GREEN} 
in your browser and fill in the token to connect to the space. You can use this app to confirm that the 
rest of the apps are working correctly. I will still need your account data, though. Press 'ENTER' when you 
are connected in space inspector and ready to give me account credentials.${DIM}"
read
echo -e "${GREEN}What token did you use to connect to space inspector?${PURPLE}"
read token
echo -e "${GREEN}What stack is that token for? (ex. 'api.highfidelity.com')${PURPLE}"
read stackname
echo -e "${GREEN}What is your app ID?${PURPLE}"
read appID
echo -e "${GREEN}What is the secret key for that app?${PURPLE}"
read appSecret
echo -e "${GREEN}OK, space ID?${PURPLE}"
read spaceID
echo -e "${GREEN}Credit card number?"
sleep 1

echo -e "${GREEN}\nJust kidding. Let's start with a simple web app. I will set it up on a local server for you.${DIM}"
cd examples/web/simple
sed -i "s/let HiFiAudioJWT;/let HiFiAudioJWT = '${token}';/g" index.html
touch Dockerfile
echo -e "FROM python:3\n
COPY [\"index.html\", \"./\"]\n
RUN wget -O hifiZip.zip https://hifi-spatial-audio-api.s3.amazonaws.com/releases/main/highfidelity-hifi-audio-web.zip \n
RUN unzip hifiZip.zip\n
CMD python3 -m http.server 8060"  > Dockerfile
docker build --no-cache -f Dockerfile . -t simple | sed 's/\x1B\[[0-9;]\{1,\}[A-Za-z]//g'
docker run -d -p 8060:8060 --name simple simple
echo -e "\n${GREEN}The simple web app is running. Navigate to ${CYAN}http://localhost:8060/?stack=${stackname} ${GREEN}to verify 
that you can connect through it. You should see the test app avatar appear in space inspector and should 
be able to hear yourself. Leave your feedback and press 'ENTER' when you are done.${PURPLE}"
read simpleStatus
echo -e  "${GREEN}OK, stopping the simple app server and deleting it's container and image.${DIM}"
docker rm --force simple
docker rmi simple

echo -e "${GREEN}\nOK, the next app will generate a JWT and connect to a space to verify that the token works. 
You will be connected to the container that runs the app in order to view the logs. In space inspector, 
you should see the avatar connect and appear at the origin. When you are ready to move on, press 
${CYAN}CTRL + c${GREEN} to exit the container. Building the app now...${DIM}"
cd ../../nodeJS/getAJWT
touch Dockerfile
sed -i "s/APP_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_ID = \"${appID}\"/g" index.js
sed -i "s/SPACE_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/SPACE_ID = \"${spaceID}\"/g" index.js
sed -i "s/APP_SECRET = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_SECRET = \"${appSecret}\"/g" index.js
sed -i "s/connectToHiFiAudioAPIServer(hiFiSampleJWT)/connectToHiFiAudioAPIServer(hiFiSampleJWT, '${stackname}')/g" index.js
echo -e "FROM node:14\n
COPY [\"package.json\", \"index.js\", \"./\"]\n
RUN npm install\n
CMD [\"npm\", \"run\", \"start\"]" > Dockerfile
docker build --no-cache -f Dockerfile . -t get-jwt | sed 's/\x1B\[[0-9;]\{1,\}[A-Za-z]//g'
docker run -it --name get-jwt get-jwt
echo -e "\n${GREEN}You should see this line in the app's logs above:
'Successfully connected to HiFi Audio API Server!'
followed by a response. Leave your comments and press 'ENTER' and we will move on.${PURPLE}"
read getJWTStatus
echo -e  "${GREEN}\nAlright, that was an easy one. I'll clean up now.
Removing all the things...${DIM}"
docker rm --force get-jwt
docker rmi get-jwt

echo -e "${GREEN}\nNow I am going to create a test for a DJ Bot by creating a docker container that runs a DJ 
Bot in the space you provided. Let me set that up...${DIM}"
cd ../djbot
cp ../../../../../testing/testAudio.mp3 .
touch Dockerfile
sed -i "s/APP_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_ID = \"${appID}\"/g" index.js
sed -i "s/SPACE_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/SPACE_ID = \"${spaceID}\"/g" index.js
sed -i "s/APP_SECRET = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_SECRET = \"${appSecret}\"/g" index.js
sed -i "s/connectToHiFiAudioAPIServer(hiFiJWT)/connectToHiFiAudioAPIServer(hiFiJWT, '${stackname}')/g" index.js
echo -e "FROM node:14\n
COPY [\"package.json\", \"index.js\", \"testAudio.mp3\", \"./\"]\n
RUN npm install\n
CMD [\"node\", \"-r\", \"esm\", \"index.js\", \"--audio\", \"testAudio.mp3\"]" > Dockerfile
docker build --no-cache -f Dockerfile . -t djbot
docker run -d --name djbot djbot
echo -e "\n${GREEN}The DJ Bot is running and you may now use space inspector to confirm that you can hear 
it and that everything looks (sounds?) good. When you are ready to report the app's status, type 
your comments and press 'ENTER' to continue to the next test.${PURPLE}"
read djbotStatus
echo -e  "${GREEN}\nOk, as Negan would say, 'I will shut that &*%$ down!'.
Removing the djbot and it's container and image...${DIM}"
docker rm --force djbot
docker rmi djbot

echo -e "${GREEN}\nThe next test will be to create a web app with Express and EJS. Setting up...${DIM}"
cd ../express-webapp
touch Dockerfile
sed -i "s/APP_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_ID = \"${appID}\"/g" index.js
sed -i "s/SPACE_ID = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/SPACE_ID = \"${spaceID}\"/g" index.js
sed -i "s/APP_SECRET = \"aaaaaaaa-1111-bbbb-2222-cccccccccccc\"/APP_SECRET = \"${appSecret}\"/g" index.js
sed -i "s/connectToHiFiAudioAPIServer(HIFI_AUDIO_JWT)/connectToHiFiAudioAPIServer(HIFI_AUDIO_JWT, '${stackname}')/g" ./views/index.ejs
echo -e "FROM node:14\n
COPY [\"package.json\", \"package-lock.json\", \"index.js\", \"./\"]\n
COPY [\"views\", \"./views/\"]\n
RUN npm install\n
CMD [\"node\", \"index.js\"]" > Dockerfile
docker build --no-cache -f Dockerfile . -t express-app
docker run -d -p 127.0.0.1:8070:8080 --name express-app express-app
echo -e "\n${GREEN}The Express app is running and you can test it out by opening your 
browser and navigating to ${CYAN}http://localhost:8070/${GREEN}. Use space 
inspector to ensure you can hear yourself from the express app correctly.
When you are ready to report the app's status, type your comments and press 
'ENTER' to continue to the next test.${PURPLE}"
read expressAppStatus
echo -e  "${GREEN}\nOk, another one bites the dust.
Removing the express app and it's container and image...${DIM}"
docker rm --force express-app
docker rmi express-app

echo -e "${GREEN}Ok, those were all of the tests we have. Here are the results:\n\n
${BLUE}Simple Web App: ${DIM}${simpleStatus}\n
${BLUE}Get a JWT: ${DIM}${getJWTStatus}\n
${BLUE}DJ Bot: ${DIM}${djbotStatus}\n
${BLUE}Express Web App: ${DIM}${expressAppStatus}\n\n
${GREEN}I'm going to clean up and take off now...see ya later!
Killing the local server, deleting downloaded files, and exiting.${NC}"
cd ../../../../../
rm -rf testingTemp
kill ${serverPID}