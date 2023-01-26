var spotifyLogo = document.createElement("img");
    spotifyLogo.id = "spotify-logo";
    spotifyLogo.src = chrome.runtime.getURL("/images/icons/Spotify_Icon_RGB_Green.png");

var spotifyButton = document.createElement("button");
    spotifyButton.id = "spotify-button";
    spotifyButton.appendChild(spotifyLogo)

spotifyButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({message: "add_song"}, (response) => {
        if(response.message === "success") {
            //logic
            console.log("nice")
        }
    })
});

//prevents multiple fires
var hasButton = document.querySelector("#owner").querySelector("#spotify-button");

    if(hasButton === null){
        document.querySelector("#owner").appendChild(spotifyButton)
    }
