import { youtubeKey } from "./scripts/query-params.js";
import { createAuthorizeEndpoint, getAuthCodeFromLogin, getAccessToken, authorize} from "./scripts/spotify-log-in.js";
import { searchTrackFirstTrack, saveTrack } from "./scripts/spotify-actions.js";

const testId = '11dFghVXANMlKmJXsNCbNl'
const testVideoId = 'cvChjHcABPA' 
let userLoggedIn = '';

const getTab = async() => {
    const queryOptions = {active: true, 
                          currentWindow: true};
        const tabs = await chrome.tabs.query(queryOptions);
        return tabs[0];
}

const injectScripts = (tab) => {
    const url = tab.url;
    if(url.startsWith('https://www.youtube.com/watch?v=')){
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['./foreground.js']
        });
    }
}

const setVideoId = (tab) => {
    const url = tab.url;
    if(url.startsWith('https://www.youtube.com/watch?v=')){
        const videoId = url.substring(url.indexOf('=') +1)
        chrome.storage.local.set({"videoId": videoId})
    }
}
    
const setTabListeners = () => {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
       if(userSignedIn){
            injectScripts(tab)
            setVideoId(tab)
        }
    })
    chrome.tabs.onActivated.addListener(async () => {
        const tab = await getTab();
        if(userSignedIn){
            injectScripts(tab)
            setVideoId(tab)
        }
    })  
}

const trimVideoTitle = (title) => {
    const substrings = ["(Official Music Video)", "(Official Video)", "(Official Audio)"]
    let newTitle = '';  
        substrings.forEach((str) => {
            if(title.includes(str)){
                newTitle = title.replace(str, '')
            }
        })
    return (newTitle === '') ? title : newTitle;
}

const getVideoSnippet = async(videoId) => {
    const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`
    const requestSnippet = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        json: true
    })
    const response = await requestSnippet.json();
    const videoSnippet = response.items[0].snippet
    return videoSnippet;
}

const handleAsyncLogin = async({sendResponse}) => {
    const authorizeData = await createAuthorizeEndpoint();
        const endpoint = authorizeData.endpoint;
        const codeVerifier = authorizeData.codeVerifier;
    
    const redirect = await authorize(endpoint)
    const {code: code, loggedIn: loggedIn} = getAuthCodeFromLogin(redirect, {sendResponse})
        
        userLoggedIn = loggedIn
        const Token = Object.assign({ }, await getAccessToken(code, codeVerifier))
        chrome.storage.session.set({'token': Token})
    console.log(Token)

    //injected script if user logs in on youtube.com/watch*
   const tab = await getTab();
   injectScripts(tab);
   setVideoId(tab);
   
    //injected script when user navigates/tabs to youtube.com/watch*
   setTabListeners();
}

const handleAsyncAddSong = async() => {
    const storageResponse = await chrome.storage.local.get("videoId");
    const videoId = storageResponse.videoId;

    const videoSnippet = await getVideoSnippet(videoId)
    const isMusicCategory = videoSnippet.categoryId === "10";
    const videoTitle = trimVideoTitle(videoSnippet.title)
    
    const tokenResponse = await chrome.storage.session.get("token")
    const accessToken = tokenResponse.token.access_token;

    if(isMusicCategory === true){
        const searchTrackResponse = await searchTrackFirstTrack(videoTitle, accessToken);
        const trackId = searchTrackResponse.id;
        const saveTrackResponse = saveTrack(trackId, accessToken)
        
        if(saveTrackResponse.status === 200){
            //nice
            console.log("Track Saved")
        }
    }    
    //else
        //send Respones "fail"
        //text bubble ""
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {    
    if(request.message === 'login') {
        handleAsyncLogin({sendResponse})
       
        //keeps message channel open
    return true;
    }

    else if (request.message === 'logout') {
            userLoggedIn = false;
            chrome.action.setPopup({ popup: './views/log-in.html' }, () => {
                sendResponse({message: 'success' });
            })
            chrome.storage.local.clear();
    return true;
    }

    else if(request.message === 'add_song'){
        //if categoryId is #10 music sendResponse 'success'
            //song added!
            //else
                //sendResponse 'fail', 'Video not listed as music'
        sendResponse({message: 'success'});
        handleAsyncAddSong();
    return true;
    }
});






