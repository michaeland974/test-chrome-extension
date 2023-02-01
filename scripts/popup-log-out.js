const signOutButton = document.querySelector('#sign-out')

signOutButton.addEventListener('click',() => {
    console.log("1st click")
    chrome.runtime.sendMessage({message: "logout"}, (response) => {
        if(response.message === "success"){
            console.log("yeah log out")
            window.close()
        }
    })
})