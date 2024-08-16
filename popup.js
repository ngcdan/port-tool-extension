


document.addEventListener('DOMContentLoaded', () => {
  console.log(chrome.storage);

  chrome.storage.local.get(['pickupText'], (result) => {
    console.log('Result from storage:', result); // In ra kết quả để kiểm tra
    const pickupText = result.pickupText || '';
    document.getElementById('pickup').value = pickupText;
    // Xóa giá trị sau khi điền để tránh điền lại trong lần mở tiếp theo
    chrome.storage.local.remove('pickupText');
  });


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

      console.log('Nearest ports:', fromPort, toPort);

      const fromLocation = `
          <div class="p-4 bg-white rounded-lg shadow-md">
            <h2 class="text-xl font-semibold text-gray-800">${fromPort.code}: ${fromPort.name}</h2>
            <p class="text-gray-600"><strong>Address:</strong> ${fromPort.address}</p>
            <p class="text-gray-600"><strong>Distance:</strong> ${fromPort.distance} km</p>
            <p class="text-gray-600"><strong>Estimated Time:</strong> ${fromPort.est_time_hours} hours</p>
            <a href="https://www.google.com/maps/search/?api=1&query=${fromPort.latitude},${fromPort.longitude}" target="_blank" class="text-blue-500 underline">
              View on Google Maps
            </a>
          </div>`;

      const toLocation = `
          <div class="p-4 bg-white rounded-lg shadow-md">
            <h2 class="text-xl font-semibold text-gray-800">${toPort.code}: ${toPort.name}</h2>
            <p class="text-gray-600"><strong>Address:</strong> ${toPort.address}</p>
            <p class="text-gray-600"><strong>Distance:</strong> ${toPort.distance} km</p>
            <p class="text-gray-600"><strong>Estimated Time:</strong> ${toPort.est_time_hours} hours</p>
            <a href="https://www.google.com/maps/search/?api=1&query=${toPort.latitude},${toPort.longitude}" target="_blank" class="text-blue-500 underline">
              View on Google Maps
            </a>
          </div>`;

      document.getElementById('result').innerHTML = `
          <div class="space-y-4">
            <h1 class="text-2xl font-bold text-green-600">Nearest Route</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              ${fromLocation}
              <div class="flex items-center justify-center text-xl text-gray-500">➜</div>
              ${toLocation}
            </div>
          </div>`;

      // const fromLocation = fromPort.code + ':' + fromPort.name + ' (' + fromPort.distance + ')';
      // const toLocation = toPort.code + ':' + toPort.name + ' (' + toPort.distance + ')';

      // document.getElementById('result').innerHTML = `<p class="text-green-500">Nearest Route: ${fromLocation} - ${toLocation}</p>`;
    } catch (error) {
      console.error('Error finding ports:', error);
    }
  });

  function transformPortData(data) {
    const result = [];

    for (const [key, value] of Object.entries(data)) {
      if (!value || !key) continue;

      const coordinate = value.coordinates || '';
      if (!coordinate) continue;

      const latitude = coordinate[1];
      const longitude = coordinate[0];
      const name = value.name;
      const portAddress = `${value.city || ''}, ${value.province || ''}, ${value.country || ''}`;
      const country = value.country || '';
      const unlocs = (value.unlocs && value.unlocs.length > 0) ? value.unlocs[0] : '';

      const newEntry = {
        latitude: latitude,
        longitude: longitude,
        name: name,
        address: portAddress,
        country: country,
        unlocs: unlocs
      };

      result.push(newEntry);
    }

    return result;
  }

  async function findNearestPort(address, transportMethod) {
    try {
      const mapboxToken = 'pk.eyJ1IjoicmVkLXJpZ2h0LWhhbmQiLCJhIjoiY2x6dXZiMzB1MDEzMzJrcHp3emYyYXA5MCJ9.IgZIATJctq_QpY0ArYe9Yg'; // Thay bằng token của bạn
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}`;

      const geocodeResponse = await fetch(geocodeUrl);
      if (!geocodeResponse.ok) {
        throw new Error('Failed to geocode address');
      }

      const geocodeData = await geocodeResponse.json();
      const features = geocodeData.features;
      if (!features || features.length === 0) {
        throw new Error('No results found for the given address');
      }

      const userCoords = features[0].geometry.coordinates;
      const userLatLng = { lat: userCoords[1], lng: userCoords[0] };

      const portsResponse = await fetch(chrome.runtime.getURL('ports.json')); // Đọc tệp JSON từ extension
      const ports = await portsResponse.json();
      if (!ports || ports.length === 0) {
        throw new Error('No ports found');
      }
      const portData = transformPortData(ports);

      let nearestPort = null;
      let minDistance = Infinity;

      for (const port of portData) {
        if (!port || !port.latitude || !port.longitude) continue;

        const portCoords = { lat: port.latitude, lng: port.longitude };
        const distance = calculateDistance(userLatLng, portCoords); // Hàm tính khoảng cách Haversine

        if (distance < minDistance) {
          minDistance = distance;
          nearestPort = port;
        }
      }

      if (!nearestPort) {
        throw new Error('No port found for the given address and transport method.');
      }

      google_maps_link = `https://www.google.com/maps/search/?api=1&query=${nearestPort['latitude']},${nearestPort['longitude']}`

      return {
        code: nearestPort.unlocs,
        name: nearestPort.name,
        address: nearestPort.address,
        location: `${nearestPort.latitude}, ${nearestPort.longitude}`,
        distance: minDistance.toFixed(2),
        est_time_hours: minDistance.toFixed(2) / 50,
        google_maps_link: google_maps_link
      };
    } catch (error) {
      console.error('Error in findNearestPort:', error);
      throw error;
    }
  }

  // Hàm tính khoảng cách giữa hai tọa độ (Haversine formula)
  function calculateDistance(coords1, coords2) {
    const R = 6371; // Bán kính Trái Đất tính theo km
    const dLat = toRadians(coords2.lat - coords1.lat);
    const dLng = toRadians(coords2.lng - coords1.lng);
    const lat1 = toRadians(coords1.lat);
    const lat2 = toRadians(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }


  // function findNearestPort(_address, transportMethod) {
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       if (transportMethod === 'Sea') {
  //         resolve({ name: 'Port of New York (Sea)', location: 'New York, NY' });
  //       } else if (transportMethod === 'Air') {
  //         resolve({ name: 'Los Angeles International Airport (Air)', location: 'Los Angeles, CA' });
  //       } else if (transportMethod === 'Trucking') {
  //         resolve({ name: 'Chicago Trucking Hub', location: 'Chicago, IL' });
  //       } else {
  //         reject(new Error('No port found for the given address and transport method.'));
  //       }
  //     }, 1000);
  //   });
  // }

})