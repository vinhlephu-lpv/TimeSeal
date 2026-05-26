# Cap nhat app bang Firebase Realtime Database

App dang lang nghe URL `src/config/firebase.ts -> realtimeDatabaseUrl`, node Realtime Database nay:

```json
{
  "appUpdate": {
    "android": {
      "enabled": true,
      "versionName": "1.0.1",
      "versionCode": 2,
      "forceUpdate": false,
      "minSupportedVersionCode": 1,
      "title": "Co ban cap nhat moi",
      "message": "Ban 1.0.1 da san sang. Hay cap nhat de dung on dinh hon.",
      "updateUrl": "https://play.google.com/store/apps/details?id=com.timeseal_aurasoft_systems"
    }
  }
}
```

Quy trinh phat hanh:

1. Tang `versionCode` va `versionName` trong `android/app/build.gradle`.
2. Build va upload ban moi len Google Play.
3. Khi ban moi da co tren Google Play, sua `appUpdate/android` trong Firebase Realtime Database.
4. Nguoi dung co `versionCode` thap hon Firebase se thay thong bao cap nhat. Nguoi dung da bang hoac cao hon `versionCode` Firebase se khong bi nhac nua.

`versionCode` la gia tri so sanh chinh. `versionName` chi duoc dung du phong neu remote khong co `versionCode`.

Neu Realtime Database cua Firebase khong phai URL mac dinh `https://timeseal-bba5a-default-rtdb.firebaseio.com`, hay sua `realtimeDatabaseUrl` trong `src/config/firebase.ts`.
