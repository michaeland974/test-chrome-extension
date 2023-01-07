const signInButton = document.querySelector('#sign-in');

signInButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({message: "login"}, (response) => {
        if(response.message === "success") {
            window.close();
        }
    })
});