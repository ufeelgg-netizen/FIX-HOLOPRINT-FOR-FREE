export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('device_id', deviceId);
  }

  return deviceId;
}

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  const navigatorInfo = navigator.userAgent + navigator.language;
  const hash = btoa(navigatorInfo).substring(0, 10);

  return `${timestamp}-${randomStr}-${hash}`;
}
