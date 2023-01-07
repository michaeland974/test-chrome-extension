import { queryParams } from "./auth.js";
import {generateCodeVerifier, generateCodeChallengeFromVerifier} from "./auth.js"

let user_signed_in = false;
let access_str = '';
let access_token = '';
let spotify_endpoint = '';

const create_spotify_endpoint = async() => {
    queryParams.state = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15));
    await generateCodeChallengeFromVerifier(generateCodeVerifier())
            .then(str => queryParams.code_challenge = str)

    const oauth2_url = 
        `https://accounts.spotify.com/authorize?`+
         `client_id=${queryParams.client_id}`+
         `&response_type=${queryParams.response_type}`+
         `&redirect_uri=${queryParams.redirect_uri}`+
         `&state=${queryParams.state}`+
         `&scope=${queryParams.scope}`+
         `&show_dialog=${queryParams.show_dialog}`+
         `&code_challenge_method=${queryParams.code_challenge_method}`+
         `&code_challenge=${queryParams.code_challenge}`;

        console.log(oauth2_url);
        return oauth2_url;
}

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if(request.message === 'login') {
        if(!user_signed_in){
          (async() => {
            await create_spotify_endpoint().then(data => spotify_endpoint=data)
            chrome.identity.launchWebAuthFlow ({
                url: spotify_endpoint,
                interactive: true 
            }, 
            (redirect_url) => {
                if (chrome.runtime.lastError || redirect_url.includes('callback?error=access_denied')) {
                    sendResponse({ message: 'fail' });
                } else {
                    access_str = redirect_url.substring(redirect_url.indexOf('access_token=') + 13);
                    access_token = access_str.substring(0, access_str.indexOf('&'));
                    const state = redirect_url.substring(redirect_url.indexOf('state=') + 6);
                        
                    if(state === queryParams.state){
                        user_signed_in = true;
                        setTimeout(() => {
                            access_token = '';
                            user_signed_in = false;
                        }, 3600000);
                            
                        chrome.action.setPopup({ popup: './popup/views/sign-out.html' }, ()=>{
                            sendResponse({ message: 'success' });
                            });
                        } else {
                            sendResponse({ message: 'fail' });
                        }
                }})
        })();
        return true; 
        }  
    }
    else if (request.message === 'logout') {
        (async() => {
            user_signed_in = false;
            chrome.action.setPopup({ popup: './popup/views/sign-in.html' }, () => {
                sendResponse({message: 'success' });
            })
        })();
        return true;
    }
});

    