import '@src/Popup.css';
import { ComponentPropsWithoutRef, useEffect, useState } from 'react';
import { useStorageSuspense, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';


interface Port {
  code: string;
  name: string;
  address: string;
  location: string;
  distance: string;
  est_time_hours: string;
  google_maps_link: string;
}

interface Result {
  fromPort: Port | null;
  toPort: Port | null;
}

const Popup = () => {
  const theme = useStorageSuspense(exampleThemeStorage);
  const isLight = theme === 'light';

  // State để lưu trữ các thông tin pickup, delivery, và kết quả tìm kiếm
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [result, setResult] = useState<Result>({ fromPort: null, toPort: null });
  const [transportMethod, setTransportMethod] = useState('Sea');

  // Hàm để tải giá trị từ storage khi component mount
  useEffect(() => {
    chrome.storage.local.get(['pickupText'], (result) => {
      const pickupText = result.pickupText || '';
      setPickup(pickupText);
      // Xóa giá trị sau khi điền để tránh điền lại trong lần mở tiếp theo
      chrome.storage.local.remove('pickupText');
    });
  }, []);

  const findNearestPort = async (address: string, transportMethod: string) => {
    try {
      const mapboxToken = 'pk.eyJ1IjoicmVkLXJpZ2h0LWhhbmQiLCJhIjoiY2x6dXZiMzB1MDEzMzJrcHp3emYyYXA5MCJ9.IgZIATJctq_QpY0ArYe9Yg';
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
        console.log('No ports found')
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
        console.log('Nearest port not found')
        throw new Error('No port found for the given address and transport method.');
      }

      const google_maps_link = `https://www.google.com/maps/search/?api=1&query=${nearestPort.latitude},${nearestPort.longitude}`;

      return {
        code: nearestPort.unlocs,
        name: nearestPort.name,
        address: nearestPort.address,
        location: `${nearestPort.latitude}, ${nearestPort.longitude}`,
        distance: minDistance.toFixed(2),
        est_time_hours: (minDistance / 50).toFixed(2),
        google_maps_link: google_maps_link,
      };
    } catch (error) {
      console.error('Error in findNearestPort:', error);
      throw error;
    }
  };

  const handleFindPort = async () => {
    if (!pickup) {
      alert('Please enter pickup address.');
      return;
    }

    if (!delivery) {
      alert('Please enter delivery address.');
      return;
    }

    try {
      const [fromPort, toPort] = await Promise.all([
        findNearestPort(pickup, transportMethod),
        findNearestPort(delivery, transportMethod)
      ]);
      setResult({ fromPort: fromPort, toPort: toPort, });
    } catch (error) {
      console.error('Error finding ports:', error);
    }
  };

  const transformPortData = (data: any[]) => {
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
  };

  // Hàm tính khoảng cách giữa hai tọa độ (Haversine formula)
  const calculateDistance = (coords1: any, coords2: any) => {
    const R = 6371; // Bán kính Trái Đất tính theo km
    const dLat = toRadians(coords2.lat - coords1.lat);
    const dLng = toRadians(coords2.lng - coords1.lng);
    const lat1 = toRadians(coords1.lat);
    const lat2 = toRadians(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: any) => {
    console.log('degrees', degrees);

    return degrees * Math.PI / 180;
  };

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ['/content-runtime/index.iife.js'],
    });
  };

  return (
    <div className={`bg-slate-50 flex flex-col min-h-screen p-4 `}>
      <h2 className="mb-4 text-xl font-bold text-center border-b-2 border-dotted">Find Nearest Route</h2>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">Transportation</label>
        <div>
          <label className="inline-flex items-center mr-4">
            <input type="radio" name="transport" value="Sea"
              className="form-radio" checked={transportMethod === 'Sea'} onChange={() => setTransportMethod('Sea')} />
            <span className="ml-2">Sea</span>
          </label>
          <label className="inline-flex items-center mr-4">
            <input type="radio" name="transport" value="Air"
              className="form-radio" checked={transportMethod === 'Air'} onChange={() => setTransportMethod('Air')} />
            <span className="ml-2">Air</span>
          </label>
          <label className="inline-flex items-center mr-4">
            <input type="radio" name="transport" value="Trucking"
              className="form-radio" checked={transportMethod === 'Trucking'} onChange={() => setTransportMethod('Trucking')} />
            <span className="ml-2">Trucking</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Pickup Address</label>
        <input type="text"
          className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter pickup address"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
        <input
          type="text"
          className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter delivery address"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)} />
      </div>

      <button className="w-full py-2 font-bold text-black bg-blue-200 rounded shadow hover:scale-105"
        onClick={handleFindPort}>Finding</button>

      {result.fromPort && result.toPort && (
        <div id="result" className="mt-4 space-y-4">
          <h1 className="text-2xl font-bold text-green-600">Nearest Route</h1>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">{result.fromPort.code}: {result.fromPort.name}</h2>
              <p className="text-gray-600"><strong>Address:</strong> {result.fromPort.address}</p>
              <p className="text-gray-600"><strong>Distance:</strong> {result.fromPort.distance} km</p>
              <p className="text-gray-600"><strong>Estimated Time:</strong> {result.fromPort.est_time_hours} hours</p>
              <a href={result.fromPort.google_maps_link} target="_blank" className="text-blue-500 underline">
                View on Google Maps
              </a>
            </div>

            <div className="flex items-center justify-center text-xl text-gray-500">➜</div>

            <div className="p-4 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">{result.toPort.code}: {result.toPort.name}</h2>
              <p className="text-gray-600"><strong>Address:</strong> {result.toPort.address}</p>
              <p className="text-gray-600"><strong>Distance:</strong> {result.toPort.distance} km</p>
              <p className="text-gray-600"><strong>Estimated Time:</strong> {result.toPort.est_time_hours} hours</p>
              <a href={result.toPort.google_maps_link} target="_blank" className="text-blue-500 underline">
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white')
          }
          onClick={injectContentScript}>
          Click to inject Content Script
        </button>
        <ToggleButton>Toggle theme</ToggleButton>
      </footer>


    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const theme = useStorageSuspense(exampleThemeStorage);
  return (
    <button
      className={
        props.className +
        ' ' +
        'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
        (theme === 'light' ? 'bg-white text-black shadow-black' : 'bg-black text-white')
      }
      onClick={exampleThemeStorage.toggle}>
      {props.children}
    </button>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
