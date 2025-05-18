/* -----------------------------------------------------------------
   WebGazer ► always pin to the "USB CAMERA (10bb:2b08)" device
----------------------------------------------------------------- */
(async () => {
  console.log('[selectUSBcamera.js] Attempting to select USB camera...');
  /* 1 – make sure we have permission so labels are populated */
  try {
    // Requesting audio:false is good practice if you don't need the mic
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    console.error('[selectUSBcamera.js] Camera permission denied or no camera found:', err);
    // If permission is denied, or no camera, WebGazer won't work.
    // We could display a message to the user here.
    return; // nothing more we can do
  }

  /* 2 – list every camera Chrome can see */
  let cams = [];
  try {
    cams = (await navigator.mediaDevices.enumerateDevices())
                  .filter(d => d.kind === 'videoinput');
  } catch (err) {
    console.error('[selectUSBcamera.js] Error enumerating devices:', err);
    return;
  }
  
  console.log('[selectUSBcamera.js] Available video inputs:', cams.map(c => ({ label: c.label, deviceId: c.deviceId })));


  /* 3 – pick the USB camera by label or by vendor/product id */
  // Regex to identify the target USB camera. Adjust if label changes.
  // Example: /USB Camera.*\(10bb:2b08\)/i - more specific if "USB Camera" is always part of the label
  const targetCameraLabelRegex = /USB CAMERA \(10bb:2b08\)|10bb.*2b08|EXTERNAL.*USB/i;

  const usbCam = cams.find(d => targetCameraLabelRegex.test(d.label));

  if (usbCam) {
    console.log('[selectUSBcamera.js] Target USB camera found:', usbCam.label, 'ID:', usbCam.deviceId);

    // Wait for WebGazer to be ready for setCameraConstraints
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (typeof webgazer !== "undefined" && typeof webgazer.setCameraConstraints === 'function') {
                console.log('[selectUSBcamera.js] WebGazer is ready for setCameraConstraints.');
                clearInterval(interval);
                resolve();
            } else {
                console.log('[selectUSBcamera.js] Waiting for WebGazer to be ready for setCameraConstraints...');
            }
        }, 100); // Check every 100ms
    });

    try {
        await webgazer.setCameraConstraints({
            video: { deviceId: { exact: usbCam.deviceId } }
        });
        console.log('[selectUSBcamera.js] WebGazer camera constraints set to USB camera ID:', usbCam.deviceId);
        localStorage.setItem('selectedUSBdeviceId', usbCam.deviceId);
    } catch (constraintError) {
        console.error('[selectUSBcamera.js] Error setting camera constraints:', constraintError);
    }
  } else {
    console.warn('[selectUSBcamera.js] Target USB camera not found based on label. WebGazer will use default device or fail if constrained otherwise.');
    localStorage.removeItem('selectedUSBdeviceId');
  }

  // Now, explicitly call initializeWebGazer from webgazer.js, 
  // but ONLY if not on a jsPsych page (like calibration.html)
  if (typeof jsPsych === 'undefined') { // jsPsych object will be defined on calibration.html
    if (typeof initializeWebGazer === 'function') {
        console.log('[selectUSBcamera.js] Camera selection process complete. Not a jsPsych page. Calling initializeWebGazer()...');
        initializeWebGazer();
    } else {
        console.error('[selectUSBcamera.js] initializeWebGazer function not found. Ensure webgazer.js is loaded and initializeWebGazer is globally accessible.');
    }
  } else {
    console.log('[selectUSBcamera.js] Camera selection process complete. On a jsPsych page. jsPsych will handle WebGazer initialization.');
  }
})(); 