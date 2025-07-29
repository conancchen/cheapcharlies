// js/script.js

// Static target: Cheap Charlie’s Bar (On Nut, Bangkok)
const DEST_LAT = 13.70632;
const DEST_LNG = 100.59896;

// Element references
const compassContainer = document.getElementById('compass-container');
const centerBtn        = document.getElementById('center-btn');
const warningBox       = document.getElementById('warning-box');
const enableBtn        = document.getElementById('enable-btn');

// State for compass rotation and haptics
let targetBearing = 0;
let currentRot    = 0;
let desiredRot    = 0;
let buzzed        = false;

// Conversion helpers
const toRad = x => x * Math.PI / 180;
const toDeg = x => x * 180 / Math.PI;

// Haversine: distance in meters
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bearing from current to target (degrees)
function calcBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Called on each GPS update
function onPosition(pos) {
  // Hide enable button once location is available
  enableBtn.style.display = 'none';
  warningBox.classList.add('hidden');

  const { latitude: lat, longitude: lon } = pos.coords;
  targetBearing = calcBearing(lat, lon, DEST_LAT, DEST_LNG);
  const dist = calcDistance(lat, lon, DEST_LAT, DEST_LNG);

  // Display 'Here' within 200m, meters under 2km, else km
  if (dist <= 200) {
    centerBtn.innerText = 'Here';
  } else if (dist < 2000) {
    centerBtn.innerText = `${Math.round(dist)} m`;
  } else {
    centerBtn.innerText = `${(dist / 1000).toFixed(1)} km`;
  }
}

// Smooth rotation animation
function animate() {
  currentRot += (desiredRot - currentRot) * 0.1;
  compassContainer.style.transform = `rotate(${currentRot}deg)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Handle device orientation
function updateCompass(evt) {
  let heading = evt.webkitCompassHeading ?? evt.alpha;
  if (heading == null) return;

  const screenAngle = (screen.orientation && screen.orientation.angle) || 0;
  heading = (heading + screenAngle) % 360;

  let rot = targetBearing - heading;
  rot = ((rot + 540) % 360) - 180;
  desiredRot = rot;

  // Haptic feedback within ±5°
  if (Math.abs(rot) < 5 && !buzzed) {
    navigator.vibrate?.(100);
    buzzed = true;
  }
  if (Math.abs(rot) >= 5) buzzed = false;
}

// Enable orientation and location
function enableSensors() {
  enableBtn.style.display = 'none';
  warningBox.classList.add('hidden');

  // Request motion permission if needed (iOS 13+)
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(res => {
        if (res === 'granted') {
          window.addEventListener('deviceorientation', updateCompass);
          window.addEventListener('deviceorientationabsolute', updateCompass);
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener('deviceorientation', updateCompass);
    window.addEventListener('deviceorientationabsolute', updateCompass);
  }

  // Start watching GPS
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      onPosition,
      () => warningBox.classList.remove('hidden'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  enableBtn.addEventListener('click', enableSensors);
  warningBox.addEventListener('click', enableSensors);

  // Immediately start location watch so onPosition runs when granted
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      onPosition,
      () => warningBox.classList.remove('hidden'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  } else {
    warningBox.classList.remove('hidden');
  }

  centerBtn.innerText = 'Ready';
  warningBox.classList.remove('hidden');
});
