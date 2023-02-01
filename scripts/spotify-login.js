import { queryParams } from "./query-params.js";
import { generateCodeVerifier, generateCodeChallengeFromVerifier } from "./spotify-code-challenge.js";

export const createAuthorizeEndpoint = async() => {
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

export const getAuthCodeFromLogin = (redirect, {sendResponse}) => {
    let code = '';
    let signedIn = null;
    try{
        const state = redirect.substring(redirect.indexOf('state=') + 6);
        const authString = redirect.substring(redirect.indexOf('code=') + 5);
              code = authString.substring(0, authString.indexOf('&'));

        if(state === queryParams.state){
            signedIn = true;
            chrome.action.setPopup({ popup: './views/sign-out.html' }, ()=>{
                sendResponse({ message: 'success' });
            })
        } 
        else {
            signedIn = false;
            sendResponse({ message: 'error' });
        }
    }catch{ //user clicks "x" on spotify login
        console.log("x")
        sendResponse({message: 'exit'})
    }
    return {code, signedIn};
}

export const getAccessToken = async(authCode, codeVerifier) => {
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

export const authorize = (endpoint) => {
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
            url: endpoint,
            interactive: true 
        }, (redirect_url) => resolve(redirect_url)) 
        //if redirect url includes callback access denied
    })
}