const logInButton = document.querySelector('#log-in');

logInButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({message: "login"}, (response) => {
        if(response.message === "success") {
            console.log("test yes")
            window.close();
        }
        else if(response.message === "exit"){
            console.log("exit click")
            window.close()
        }
    })
});
