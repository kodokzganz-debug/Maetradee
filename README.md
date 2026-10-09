# MAETRADE — Personal Trading Operating System

Front-end statis untuk GitHub Pages. Dirancang mobile-first dengan dashboard, jurnal trading, riwayat, ringkasan performa, dan backup data.

## Struktur
```text
Maetradee/
├── index.html
├── style.css
├── README.md
└── js/
    └── app.js
```

## Deploy ke GitHub Pages
1. Upload/replace file dan folder sesuai struktur di atas ke root branch `main`.
2. Buka **Settings → Pages** di repository.
3. Pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
4. Tunggu proses deployment selesai dan buka URL GitHub Pages.

## Fitur
- Dashboard KPI: realized P/L, win rate, total trades, profit factor.
- Form New Trade: symbol, BUY/SELL, entry, SL, TP, status, tanggal, P/L, catatan.
- Open trade dapat ditutup dengan memasukkan realized P/L.
- Journal dengan filter open/closed, trade history, delete trade.
- Grafik equity dari trade closed.
- Reports: average win/loss, expectancy, best trade.
- Export backup JSON dan CSV.
- Penyimpanan `localStorage`.

## Catatan penting
- Ini adalah **front-end personal**. Data hanya tersimpan di browser/perangkat yang digunakan; data tidak otomatis tersinkron antarperangkat dan bisa hilang jika browser storage dihapus.
- P/L diinput manual dalam **Rupiah (IDR)**. Aplikasi tidak terhubung langsung ke MT5/broker dan tidak mengambil harga pasar real-time.
- Sebelum dipakai sebagai catatan utama, lakukan uji dengan data dummy dan export backup secara berkala.
