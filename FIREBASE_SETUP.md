# HostIncome — Sambung Firebase Realtime Database

App ini **opt-in**: kalau config Firebase kosong, ia jalan mod demo (in-memory).
Isi config = terus jadi realtime (sync antara peranti / browser).

## 1. Buat projek Firebase
1. Pergi https://console.firebase.google.com → **Add project**.
2. Bila projek siap, buka **Build → Realtime Database → Create Database**.
   - Pilih lokasi **asia-southeast1 (Singapore)** (paling dekat Malaysia).
   - Mula dengan **Test mode** (sementara) → nanti tukar rules.
3. Salin **databaseURL**, contoh:
   `https://hostincome-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`

## 2. Dapatkan config
**Project Settings (⚙️) → General → Your apps → Web app (</>)** → daftar app →
salin objek `firebaseConfig`.

## 3. Tampal config dalam app
Buka `src/HostIncome.jsx`, cari `const FIREBASE_CONFIG = {` (atas sekali fail) dan isi:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "hostincome-xxxx.firebaseapp.com",
  databaseURL: "https://hostincome-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hostincome-xxxx",
  storageBucket: "hostincome-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};
```

Bila `databaseURL` ada nilai, app auto-guna Firebase. Kosongkan = balik mod demo.

## 4. Install & run
```bash
npm install      # firebase sudah ada dalam package.json
npm run dev
```
Kali pertama jalan, app akan **seed data demo** ke Realtime DB (kalau DB kosong).

## 5. Struktur data (RTDB)
```
hostincome/
  settings/           { hostName, phone, email, address, bankName, bankAccount, photo, maxSlots, ... }
  brands/   {brandId}  { name, rate, weekStart, color, phone, address, logo }
  sessions/ {sessionId}{ date, brandId, brand, start, end, hours, rate, commission, sales, kpi, note, income, status }
  claims/   {claimId}   { brandId, brand, color, start, end, invoiceNo, sessionIds[], sessions, hours, hourlyIncome, commission, total, paid, paidDate, ref }
```

## 6. Security rules
Test mode terbuka untuk semua — **jangan guna untuk production**.
Untuk app peribadi 1 pengguna, paling ringkas tambah Firebase Auth (Anonymous/Email)
dan kunci ikut uid:

```json
{
  "rules": {
    "hostincome": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Kalau nak skop per-pengguna (multi-host), tukar path jadi `hostincome/{uid}/...`
dan ubah `FB_ROOT` kepada `hostincome/` + uid selepas login.

## Nota
- **Gambar/logo** sekarang disimpan sebagai base64 dalam DB. Untuk fail besar / banyak,
  lebih elok guna **Firebase Storage** (simpan URL sahaja dalam RTDB).
- Semua tulisan (tambah slot, daftar brand, tutup bil, mark paid, simpan tetapan)
  terus tulis ke RTDB dan auto-sync ke semua peranti via listener `onValue`.

---

## 7. User Management (Auth + Admin Panel)

App sekarang ada **login** dan **Admin Panel**.

### a) Hidupkan Email/Password Auth
1. Firebase Console → **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Email/Password** → **Enable** → Save.

### b) Siapa jadi admin?
- **Pengguna PERTAMA** yang daftar auto jadi **admin**.
- Atau letak email dalam `ADMIN_EMAILS` (atas fail `HostIncome.jsx`), contoh:
  ```js
  const ADMIN_EMAILS = ["faiz@nadeenbeau.com"];
  ```
  Email dalam senarai ini sentiasa admin.

### c) Cara guna
- Buka app → skrin **Log Masuk / Daftar**.
- Admin nampak tab **Admin** di menu: senarai semua user, tukar role (Host/Admin),
  **Gantung/Aktifkan** akaun, dan padam rekod+data.
- Host hanya nampak tracker sendiri (data berasingan ikut UID).

### d) Struktur data baharu
```
hostincome/
  users/{uid}        { name, email, role: "admin"|"host", status: "active"|"suspended", createdAt }
  data/{uid}/        { brands, sessions, claims, settings }   <- data setiap host berasingan
```

### e) Rules disyorkan (selepas Auth aktif)
```json
{
  "rules": {
    "hostincome": {
      "users": {
        ".read": "auth != null",
        "$uid": { ".write": "auth != null" }
      },
      "data": {
        "$uid": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && auth.uid == $uid"
        }
      }
    }
  }
}
```
> Nota: rules di atas benarkan host akses data sendiri sahaja. Untuk admin baca/tulis
> data semua host atau guna butang "Gantung", tambah semakan role admin dalam rules
> (perlu simpan senarai admin uid di satu nod yang rules boleh baca). Boleh saya
> tolong setup bila anda dah ready.

### Limitasi
- Padam akaun **log masuk** sepenuhnya perlu **Firebase Admin SDK** (server / Cloud Function).
  Butang "padam" di Admin Panel hanya buang rekod & data RTDB. Untuk block akses, guna **Gantung**.
