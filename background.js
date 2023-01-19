import {queryParams, youtube_key} from "./auth.js";
import {generateCodeVerifier, generateCodeChallengeFromVerifier} from "./auth.js"

const getTab = async() => {
    const queryOptions = {active: true, 
                          currentWindow: true};
    const tabs = await chrome.tabs.query(queryOptions);
    return tabs[0];
}

const getCurrentTabInfo = () => {
    let currentTabUrl = '';
    let videoId = '';
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        //preventing multiple fires on youtube.com
       if(tab.status ==="complete" && tab.url!=currentTabUrl){
        currentTabUrl = tab.url;
           if(currentTabUrl.startsWith('https://www.youtube.com/watch?v=')){
                videoId = currentTabUrl.substring(currentTabUrl.indexOf('=') +1)
                console.log(`video id is ${videoId}`);
            }
       }
    }) 
    chrome.tabs.onActivated.addListener(async () => {
        const tab = await getTab()
        currentTabUrl = tab.url;
            if(currentTabUrl.startsWith('https://www.youtube.com/watch?v=')){
                videoId = currentTabUrl.substring(currentTabUrl.indexOf('=') +1)
                console.log(`video id is ${videoId}`);
        }
    })   
    return {currentTabUrl, videoId}
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

const authorize = async({sendResponse}) => {
    const authorizeData = await createAuthorizeEndpoint();
        const endpoint = authorizeData.endpoint;
        const codeVerifier = authorizeData.codeVerifier;
    
    chrome.identity.launchWebAuthFlow({
        url: endpoint,
        interactive: true 
        }, async (redirect_url) => {
           const code = getAuthCode(redirect_url, {sendResponse});

                const Token = Object.assign({ }, await getAccessToken(code, codeVerifier))
                console.log(Token) 
                console.log(Token.access_token)
                const testId = '11dFghVXANMlKmJXsNCbNl'
                const testVideoId = 'cvChjHcABPA'
                    getTrack(testId, Token.access_token)
                    getVideoSnippet(testVideoId);
                    //searchTrackFirstTrack("Cut To The Feeling", Token.access_token)
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.message === 'login') {
        getCurrentTabInfo();   
        authorize({sendResponse})
        return true;  
    }
    else if (request.message === 'logout') {
        (async() => {
            userSignedIn = false;
            chrome.action.setPopup({ popup: './popup/views/sign-in.html' }, () => {
                sendResponse({message: 'success' });
            })
        })();
        return true;
    }
});

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
      console.log(response) 
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
    console.log(firstTrack)
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
    console.log(videoSnippet);
}
