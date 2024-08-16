document.addEventListener('DOMContentLoaded', () => {
  console.log(chrome.storage);

  chrome.storage.local.get(['pickupText'], (result) => {
    console.log('Result from storage:', result); // In ra kết quả để kiểm tra
    const pickupText = result.pickupText || '';
    document.getElementById('pickup').value = pickupText;
    // Xóa giá trị sau khi điền để tránh điền lại trong lần mở tiếp theo
    chrome.storage.local.remove('pickupText');
  });


  console.log("This is a popup!")
  //I used async/await syntax to wait for both findNearestPort promises to resolve before proceeding to update the DOM.
  document.getElementById('findPort').addEventListener('click', async () => {
    const pickup = document.getElementById('pickup').value.trim();
    const delivery = document.getElementById('delivery').value.trim()

    if (!pickup) {
      alert('Please enter pickup address.');
      return;
    }

    if (!delivery) {
      alert('Please enter delivery address.');
      return;
    }

    const transportMethod = document.querySelector('input[name="transport"]:checked').value;

    //Promise.all is used to run both findNearestPort calls concurrently and wait for both to complete.
    try {
      const [fromPort, toPort] = await Promise.all([
        findNearestPort(pickup, transportMethod),
        findNearestPort(delivery, transportMethod)
      ]);

      const fromLocation = fromPort.name;
      const toLocation = toPort.name;

      document.getElementById('result').innerHTML = `<p class="text-green-500">Nearest Route: ${fromLocation} - ${toLocation}</p>`;
    } catch (error) {
      console.error('Error finding ports:', error);
    }
  });

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

})