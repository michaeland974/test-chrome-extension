const logOutButton = document.querySelector('#log-out')

logOutButton.addEventListener('click',() => {
    console.log("1st click")
    chrome.runtime.sendMessage({message: "logout"}, (response) => {
        if(response.message === "success"){
            console.log("yeah log out")
            window.close()
        }
    })
})