// Static destination: Cheap Charlie’s Bar (On Nut, Bangkok)
const DEST_LAT = 13.7290;
const DEST_LNG = 100.5780;

// Elements
const compassContainer = document.getElementById("compass-container");
const centerBtn = document.getElementById("center-btn");
const warningBox = document.getElementById("warning-box");
const enableBtn = document.getElementById("enable-btn");

let targetBearing = 0;
let currentRot = 0;
let desiredRot = 0;
let buzzed = false;

// Helpers
const toRad = x => (x * Math.PI) / 180;
const toDeg = x => (x * 180) / Math.PI;

// Distance in meters
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Bearing in degrees
function calcBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ)*Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (toDeg(Math.atan2(y,x)) + 360) % 360;
}

// GPS callback
function onPosition(pos) {
  warningBox.classList.add("hidden");
  const { latitude: lat, longitude: lon } = pos.coords;
  targetBearing = calcBearing(lat, lon, DEST_LAT, DEST_LNG);
  const dist = calcDistance(lat, lon, DEST_LAT, DEST_LNG);

  let text;
  if (dist <= 200) {
    text = "Here";
  } else if (dist > 2000) {
    text = `${(dist/1000).toFixed(1)} km`;
  } else {
    text = `${Math.round(dist)} m`;
  }
  centerBtn.innerText = text;
}

// Smooth animation
function animate() {
  currentRot += (desiredRot - currentRot)*0.1;
  compassContainer.style.transform = `rotate(${currentRot}deg)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Device orientation callback
function updateCompass(evt) {
  let heading = evt.webkitCompassHeading ?? evt.alpha;
  if (heading == null) return;
  const screenAngle = (screen.orientation?.angle) || 0;
  heading = (heading + screenAngle) % 360;

  let rot = targetBearing - heading;
  rot = ((rot + 540) % 360) - 180;
  desiredRot = rot;

  // Haptic at ±5°
  if (Math.abs(rot) < 5 && !buzzed) {
    navigator.vibrate?.(100);
    buzzed = true;
  }
  if (Math.abs(rot) >= 5) buzzed = false;
}

// Enable sensors & geolocation
function enableSensors() {
  enableBtn.style.display = "none";
  warningBox.classList.add("hidden");

  // iOS motion permission
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(res => {
        if (res === "granted") {
          window.addEventListener("deviceorientation", updateCompass);
          window.addEventListener("deviceorientationabsolute", updateCompass);
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener("deviceorientation", updateCompass);
    window.addEventListener("deviceorientationabsolute", updateCompass);
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      onPosition,
      err => {
        warningBox.classList.remove("hidden");
        centerBtn.innerText = "–––";
      },
      { enableHighAccuracy:true, maximumAge:10000 }
    );
  }
}

enableBtn.addEventListener("click", enableSensors);
warningBox.addEventListener("click", enableSensors);

// Initial state
warningBox.classList.remove("hidden");
centerBtn.innerText = "Ready";
