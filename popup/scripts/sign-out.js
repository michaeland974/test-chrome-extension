const signOutButton = document.querySelector('#sign-out')

signOutButton.addEventListener('click',() => {
    chrome.runtime.sendMessage({message: "logout"}, (response) => {
        if(response.message === "success"){
            window.close()
        }
    })
})