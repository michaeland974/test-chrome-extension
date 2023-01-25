var spotifyButton = document.createElement("button");
    spotifyButton.id = "spotify-button";
    spotifyButton.textContent = "Spotify Click";
    spotifyButton.style.backgroundColor = "black";
//prevents multiple fires
var hasButton = document.querySelector("#owner").querySelector("#spotify-button");

    if(hasButton === null){
        document.querySelector("#owner").append(spotifyButton)
    }
