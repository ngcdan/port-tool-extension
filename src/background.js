function createPopup() {
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    top: 300, left: 300,
    width: 480,
    height: 700
  });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  const url = 'https://www.nqcdan.rocks/dev/api';
  console.log('Background script received message:', message);

  if (message.contentScriptQuery == "getdata") {
    fetch(url)
      .then(response => response.text())
      .then(response => sendResponse(response))
      .catch()
    return true;
  }

  if (message.contentScriptQuery == "findNearestRoute") {
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
      },
      body: JSON.stringify(message.data)
    })
      .then(response => response.json())
      .then(response => sendResponse(response))
      .catch(error => console.log('Error:', error));
    return true;
  }

  //Xử lý mở popup và điền text vào pickup
  if (message.action === 'openPopupWithText') {
    chrome.storage.local.set({ pickupText: message.text }, () => {
      console.log('Text saved to storage:', message.text); // In ra để kiểm tra
      createPopup()
    });
  }

});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-popup') {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const popupWindow = windows.find(win => win.type === 'popup');
      if (popupWindow) {
        chrome.windows.remove(popupWindow.id);
      } else {
        createPopup();
      }
    });
  }
});

