# Git Backup And Restore

Repo nay dang cau hinh theo huong private Git: push source code, lockfile, cau hinh build, Firebase config va Android keystore de clone lai co the khoi phuc du nhat. Khong push dependency, cache build, artifact tam, hay `.env`.

## Duoc push len Git

- Source app: `App.tsx`, `index.js`, `src/`, `android/`, `ios/`, `functions/src/`
- Cau hinh build: `package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json`
- Firebase rules/config public: `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- Tai lieu va checklist trong repo

## Khong push len Git

- `node_modules/`, `functions/node_modules/`, `Pods/`
- Build/cache: `.gradle/`, `android/build/`, `ios/build/`, `.bundle/`, `.taw/`, `.expo/`, `.metro-cache/`, `coverage/`
- Secret va file may local: `.env*`, `*.p12`, `*.p8`, `*.mobileprovision`, `key.properties`, `keystore.properties`

Ghi chu: repo private nay co the commit `android/app/*.jks`, `android/app/*.keystore`, va `android/app/google-services.json` de khoi phuc day du. Neu sau nay doi sang public repo, phai xoa cac file nay khoi Git history truoc khi public.

## File quan trong can co trong private Git hoac backup rieng

De khoi phuc 100%, dam bao cac file nay co trong private Git hoac duoc backup rieng co ma hoa:

- `android/app/google-services.json`
- `ios/GoogleService-Info.plist` neu dung Firebase cho iOS
- Release signing key: `android/app/*.jks` hoac `android/app/*.keystore`
- Android signing values dat trong `~/.gradle/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=ten-file-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=ten-alias
MYAPP_UPLOAD_STORE_PASSWORD=...
MYAPP_UPLOAD_KEY_PASSWORD=...
```

Neu mat release signing key, khong the cap nhat app Android da publish bang cung chu ky cu. Vi vay file key nay quan trong hon ca source code.

## Cach khoi phuc tu may moi

1. Clone repo.
2. Cai Node dung version trong `package.json` (`>=22.11.0`).
3. Chay `npm ci`.
4. Chay `npm --prefix functions ci`.
5. Dat lai cac file secret da backup rieng vao dung vi tri.
6. Dat signing values vao `~/.gradle/gradle.properties`.
7. Kiem tra nhanh:

```powershell
npm run qa:smoke
npm run qa:functions
```

8. Build Android release khi can:

```powershell
npm run android:bundle:release
```
