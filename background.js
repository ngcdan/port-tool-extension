chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-popup') {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const popupWindow = windows.find(win => win.type === 'popup');

      if (popupWindow) {
        // Đóng cửa sổ popup nếu nó đang mở
        chrome.windows.remove(popupWindow.id);
      } else {
        // Mở cửa sổ popup nếu nó chưa mở
        chrome.action.openPopup();
      }
    });
  }
});

//Xử lý mở popup và điền text vào pickup trong background.js
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'openPopupWithText') {
    chrome.storage.local.set({ pickupText: request.text }, () => {
      console.log('Text saved to storage:', request.text); // In ra để kiểm tra
      chrome.action.openPopup();
    });
  }
});