import {queryParams, youtube_key} from "./auth.js";
import {generateCodeVerifier, generateCodeChallengeFromVerifier} from "./auth.js"

const testId = '11dFghVXANMlKmJXsNCbNl'
const testVideoId = 'cvChjHcABPA' 

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

let userSignedIn = '';

const createAuthorizeEndpoint = async() => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);
    queryParams.state = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15));

    const endpoint =  `https://accounts.spotify.com/authorize?`+
                        `client_id=${queryParams.client_id}`+
                        `&response_type=${queryParams.response_type}`+
                        `&redirect_uri=${queryParams.redirect_uri}`+
                        `&state=${queryParams.state}`+
                        `&scope=${queryParams.scope}`+
                        `&show_dialog=${queryParams.show_dialog}`+
                        `&code_challenge_method=${queryParams.code_challenge_method}`+
                        `&code_challenge=${codeChallenge}`;
        console.log(endpoint);
        return {endpoint, codeVerifier};
}

const getAuthCode = (redirect, {sendResponse}) => {
    let auth_code = '';
    if (chrome.runtime.lastError || redirect.includes('callback?error=access_denied')) {
       sendResponse({ message: 'fail' });
    } 
    else {
        const state = redirect.substring(redirect.indexOf('state=') + 6);
        const auth_str = redirect.substring(redirect.indexOf('code=') + 5);
              auth_code = auth_str.substring(0, auth_str.indexOf('&'));

        if(state === queryParams.state){
            userSignedIn = true;
            chrome.action.setPopup({ popup: './popup/views/sign-out.html' }, ()=>{
                sendResponse({ message: 'success' });
            })
        } 
        else {
            userSignedIn = false;
            sendResponse({ message: 'fail' });
            return;
        }
    }
    return auth_code;
}

const getAccessToken = async(authCode, codeVerifier) => {
    const body = new URLSearchParams({
        'grant_type': queryParams.grant_type,
        'code': authCode,
        'redirect_uri': queryParams.redirect_uri,
        'code_verifier' : codeVerifier,
        'client_id': queryParams.client_id,
        'code_secret': queryParams.client_key,
    })
    const requestToken = await fetch(`https://accounts.spotify.com/api/token`,{
        method: 'POST',
        headers: {
            "Content-Type": 'application/x-www-form-urlencoded',
        },
        body: body,
        json: true
    })
    const response = await requestToken.json();
    return response;    
}

const authorize = (endpoint) => {
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
            url: endpoint,
            interactive: true 
        }, (redirect_url) => resolve(redirect_url)) 
        //reject  
    })
}

const handleAsyncLogin = async(request, sender, {sendResponse}) => {
    const authorizeData = await createAuthorizeEndpoint();
        const endpoint = authorizeData.endpoint;
        const codeVerifier = authorizeData.codeVerifier;
    
    const redirect = await authorize(endpoint)
    const code = getAuthCode(redirect, {sendResponse})
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {    
    if(request.message === 'login') {
        handleAsyncLogin(request, sender, {sendResponse})
       
        //keeps message channel open
    return true;
    }

    else if (request.message === 'logout') {
        (async() => {
            userSignedIn = false;
            chrome.action.setPopup({ popup: './popup/views/sign-in.html' }, () => {
                sendResponse({message: 'success' });
            })
            chrome.storage.local.clear();
        })();
    return true;
    }

    else if(request.message === 'add_song'){
        //if categoryId is #10 music sendResponse 'success'
            //song added!
            //else
                //sendResponse 'fail', 'Video not listed as music'
        sendResponse({message: 'success'});
       /*  chrome.storage.local.get("videoId", (result) => {
            console.log(result)
        }) */
        handleAsyncAddSong();
    return true;
    }
});

const handleAsyncAddSong = async() => {
    const storageResponse = await chrome.storage.local.get("videoId");
    const videoId = storageResponse.videoId;

    const videoSnippet = await getVideoSnippet(videoId)
    const isMusicCategory = videoSnippet.categoryId === "10";
    const videoTitle = videoSnippet.title;

    // if song video title contains "Official Video" remove that from string
    
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

const getTrack = async (id, accessToken) => {
    const requestTrack = await fetch(`https://api.spotify.com/v1/tracks/${id}`,{
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    })
    const response = await requestTrack.json();
    console.log(response)
    return response; 
}

const getPlaylists = async (accessToken) => {
      const requestPlaylists = await fetch(`https://api.spotify.com/v1/me/playlists`,{
          method: 'GET',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = await requestPlaylists.json();
      console.log(response) 
}

const getSavedTracks = async (accessToken) => {
      const requestSavedTracks = await fetch(`https://api.spotify.com/v1/me/tracks/`,{
          method: 'GET',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = await requestSavedTracks.json();
      console.log(response) 
}

const saveTrack = async (id, accessToken) => {
      const saveTrackRequest = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${id}`,{
          method: 'PUT',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = saveTrackRequest;
      //if response is 200 ...
      return response 
}

const searchTrackFirstTrack = async(trackName, accessToken) => {
    const url = `https://api.spotify.com/v1/search?q=track${trackName}&type=track&limit=10`
    const search_track = await fetch(url,{
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    })
    const response = await search_track.json();
    const firstTrack = response.tracks.items[0];
    return firstTrack; 
}

const getVideoSnippet = async(videoId) => {
    const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtube_key}`
    const requestSnippet = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        json: true
    })
    const response = await requestSnippet.json();
    const videoSnippet = response.items[0].snippet
   // console.log(videoSnippet)
    return videoSnippet;
}
