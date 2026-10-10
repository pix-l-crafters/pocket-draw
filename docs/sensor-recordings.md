# Local sensor recordings

Development builds automatically record one calibration session from Start
calibration until completion, retry, sensor failure or leaving the screen, and
one session per round from pre-round entry until round end or leaving the screen.
False-start retries remain in the same round session, with attempt markers.
Production builds do not capture readings or show sharing controls.

Tap **Share latest sensor JSON** after calibration passes, before Continue, to
export calibration. After a round, export from the next pre-round screen (or the
next calibration screen). Only the latest finished session is retained locally;
export before another session finishes if you need both. The share sheet sends
JSON text; save or copy it using a supported destination. Cancelling is harmless.
Recordings never enter the Firebase analytics queue.

Each version 1 export includes platform, requested intervals in milliseconds,
source units, native timestamps, application receipt times, calibrated angles,
thresholds, samples and ordered markers. DeviceMotion rotation is radians,
rotation rate is degrees per second, and acceleration is metres per second
squared. Separate Accelerometer readings are in g-force. Raw reported
DeviceMotion interval is **seconds on iOS**, milliseconds on Android/web in the
installed Expo implementation; requested intervals remain milliseconds.

Native timestamp fields are retained in seconds. Do not subtract them from
application Date.now() timestamps: their clock origins can differ. Use `order`
to merge samples and markers in callback order, including equal receipt times.
The recording retains the latest 30 seconds, at most 1,500 combined sensor samples
and 256 markers. `truncated` and `dropped` identify discarded entries. Missing
native readings are not filled in; non-finite values serialize as JSON null.

Confirmation markers include the latest original pitch, saved median pitch,
contributing reading count and span in milliseconds. Existing analytics motion
snapshots remain original measurements. Calibration uses at least three valid
motion callbacks within 350 ms, validated using fresh Accelerometer pose data.
Automatic confirmation retains the two-second hold; volume up can confirm once
the recent window is eligible, without that hold.

## Physical-device procedure

1. On each supported phone/platform, repeat steady calibration five times.
   Export each calibration before Continue. Compare saved medians and original
   confirmation readings; check source units and requested/reported intervals.
2. Repeat with mild hand tremor, then briefly leave and return to the valid pose.
   Verify invalid poses do not confirm or contribute old readings.
3. Confirm each pose with volume up, including an immediate press and another
   after a brief steady pause. Check insufficient samples leave the stage intact;
   background/resume or open/close help and confirm that new samples are required.
4. Play rounds with slow and fast raises, fire via tap and volume, and deliberately
   false-start once. Export each round from the next pre-round screen. Inspect
   countdown, fire cue, input and round-end order alongside original motion and
   Accelerometer samples. Reaction timing and zone thresholds should stay intact.
5. Spend over 30 seconds in a session, then finish/export and check truncation.
   Cancel a share sheet and retry. Check that a release build has no export action.

These recordings support later noise and latency measurements. Mocked tests do
not establish improved real-device accuracy, sensor latency or share-target
compatibility. Verify permissions, background/resume, native volume events,
actual sampling cadence and complete JSON sharing on physical devices.
