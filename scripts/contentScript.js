// Tạo một icon nổi trên trang khi người dùng highlight văn bản
const icon = document.createElement('img');
icon.src = chrome.runtime.getURL('images/icon-16.png');
icon.style.position = 'absolute';
icon.style.cursor = 'pointer';
icon.style.display = 'none';
icon.style.zIndex = '9999';
document.body.appendChild(icon);

// Khi người dùng highlight text, di chuyển icon đến vị trí của text
document.addEventListener('mouseup', (event) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    const range = window.getSelection().getRangeAt(0).getBoundingClientRect();
    icon.style.top = `${range.bottom + window.scrollY}px`;
    icon.style.left = `${range.right + window.scrollX}px`;
    icon.style.display = 'block';
  } else {
    icon.style.display = 'none';
  }
});

// Xử lý sự kiện click vào icon
icon.addEventListener('click', async () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // Lưu text vào clipboard
    await navigator.clipboard.writeText(selectedText);

    // Mở popup của extension
    chrome.runtime.sendMessage({ action: 'openPopupWithText', text: selectedText });
  }
});

// Xử lý phím tắt Shift + S để tìm thông tin cảng
document.addEventListener('keydown', (event) => {
  if (event.shiftKey && event.key === 'S') {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      findNearestPort(selectedText).then(port => {
        showTooltip(port.name, port.location);
      }).catch(error => {
        showTooltip('Error', error.message);
      });
    }
  }
});

// Hàm giả lập tìm kiếm cảng
function findNearestPort(_address, transportMethod) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (transportMethod === 'Sea') {
        resolve({ name: 'Port of New York (Sea)', location: 'New York, NY' });
      } else if (transportMethod === 'Air') {
        resolve({ name: 'Los Angeles International Airport (Air)', location: 'Los Angeles, CA' });
      } else if (transportMethod === 'Trucking') {
        resolve({ name: 'Chicago Trucking Hub', location: 'Chicago, IL' });
      } else {
        reject(new Error('No port found for the given address and transport method.'));
      }
    }, 1000);
  });
}

// Hàm hiển thị tooltip bên cạnh text đang được highlight
function showTooltip(title, message) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = `<strong>${title}:</strong> ${message}`;
  document.body.appendChild(tooltip);

  const range = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.top = `${range.bottom + window.scrollY}px`;
  tooltip.style.left = `${range.left + window.scrollX}px`;

  setTimeout(() => {
    tooltip.remove();
  }, 3000);
}
