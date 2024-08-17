document.addEventListener('DOMContentLoaded', () => {

  chrome.storage.local.get(['pickupText'], (result) => {
    console.log('Result from storage:', result); // In ra kết quả để kiểm tra
    const pickupText = result.pickupText || '';
    document.getElementById('pickup').value = pickupText;
    // Xóa giá trị sau khi điền để tránh điền lại trong lần mở tiếp theo
    chrome.storage.local.remove('pickupText');
  });

  //I used async/await syntax to wait for both findNearestPort promises to resolve before proceeding to update the DOM.
  document.getElementById('findPort').addEventListener('click', async () => {
    const pickUpAddress = document.getElementById('pickup').value.trim();
    const deliveryAddress = document.getElementById('delivery').value.trim();
    const transportMethod = document.querySelector('input[name="transport"]:checked').value;

    if (!pickup) {
      alert('Please enter pickup address.');
      return;
    }

    if (!delivery) {
      alert('Please enter delivery address.');
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { contentScriptQuery: "findNearestRoute", data: { pickUpAddress, deliveryAddress } },
        function (response) {
          console.log('Response:', response);
          const fromLocation = response['fromLocation']
          const toLocation = response['toLocation']
          if (!fromLocation || !toLocation) {
            document.getElementById('result').innerHTML = `<p class="text-green-500">Nearest Route: NOT FOUND</p>`;
          }
          const fromLocationHtml = `
              <div class="p-4 bg-white rounded-lg shadow-md">
                <h2 class="text-xl font-semibold text-gray-800">${fromLocation.unlocs}: ${fromLocation.name}</h2>
                <p class="text-gray-600"><strong>Address:</strong> ${fromLocation.address}</p>
                <p class="text-gray-600"><strong>Distance:</strong> ${fromLocation.distance} km</p>
                <p class="text-gray-600"><strong>Estimated Time:</strong> ${fromLocation.estTimeHours} hours</p>
                  <a href="${fromLocation.googleMapsLink}" target="_blank" class="text-blue-500 underline">
                  View on Google Maps
                </a>
              </div>`;

          const toLocationHtml = `
              <div class="p-4 bg-white rounded-lg shadow-md">
                <h2 class="text-xl font-semibold text-gray-800">${toLocation.unlocs}: ${toLocation.name}</h2>
                <p class="text-gray-600"><strong>Address:</strong> ${toLocation.address}</p>
                <p class="text-gray-600"><strong>Distance:</strong> ${toLocation.distance} km</p>
                <p class="text-gray-600"><strong>Estimated Time:</strong> ${toLocation.estTimeHours} hours</p>
                <a href="${toLocation.googleMapsLink}" target="_blank" class="text-blue-500 underline">
                  View on Google Maps
                </a>
              </div>`;

          document.getElementById('result').innerHTML = `
              <div class="space-y-4">
                <h1 class="text-2xl font-bold text-green-600">Nearest Route</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  ${fromLocationHtml}
                  <div class="flex items-center justify-center text-xl text-gray-500">➜</div>
                  ${toLocationHtml}
                </div>
              </div>`;
        });
    } catch (error) {
      console.error('Error finding ports:', error);
      document.getElementById('result').innerHTML = `<p class="text-green-500">Nearest Route: NOT FOUND</p>`;
    }
  });

})