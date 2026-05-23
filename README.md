# 頑シミュ MHXX - Android版 プロジェクト

## 概要
オリジナルの「頑シミュ MHXX ver.0.9」（Java Swing PC版）を Android Studio プロジェクトに移植したものです。

オリジナルファイルは一切変更せず `app/src/main/assets/data/original/` に収録しています。

---

## ビルド方法（Android Studio）

### 必要なもの
- **Android Studio** Hedgehog (2023.1.1) 以降
- **JDK 17** 以上
- **Android SDK** API 34

### 手順

1. このフォルダを Android Studio で開く
   - `File → Open` → `MHXXGanSimu` フォルダを選択

2. Gradle Sync を完了させる
   - 初回は依存ライブラリのダウンロードに時間がかかります

3. APK ビルド
   - メニュー `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   - または実機/エミュレータを繋いで Run ▶ ボタン

4. APK の場所
   - `app/build/outputs/apk/debug/app-debug.apk`

---

## プロジェクト構成

```
MHXXGanSimu/
├── app/
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/mhxx/gansimu/
│       │   └── MainActivity.java        ← WebViewホスト + アセット読み込みブリッジ
│       ├── assets/
│       │   ├── data/                    ← 全データファイル（UTF-8変換済み）
│       │   │   ├── MHXX_SKILL.csv
│       │   │   ├── MHXX_EQUIP_HEAD.csv
│       │   │   ├── MHXX_EQUIP_BODY.csv
│       │   │   ├── MHXX_EQUIP_ARM.csv
│       │   │   ├── MHXX_EQUIP_WST.csv
│       │   │   ├── MHXX_EQUIP_LEG.csv
│       │   │   ├── MHXX_DECO.csv
│       │   │   ├── MHXX_CHARM.csv
│       │   │   ├── conf/
│       │   │   │   ├── CATEGORY.txt
│       │   │   │   ├── FUKUGO.txt
│       │   │   │   ├── SIBORI.txt
│       │   │   │   └── KEI.txt
│       │   │   └── original/            ← オリジナルファイル（変更なし）
│       │   │       ├── gansimu.jar      ← 頑シミュ.jar（オリジナル）
│       │   │       ├── gansimu.bat      ← 頑シミュ.bat（オリジナル）
│       │   │       └── ReadMe.txt
│       │   └── www/                     ← WebアプリUI
│       │       ├── index.html           ← メインUI
│       │       └── js/
│       │           └── engine.js        ← スキルシミュレータエンジン
│       └── res/
│           ├── drawable/ic_launcher.png
│           ├── layout/activity_main.xml
│           └── values/
│               ├── strings.xml
│               └── themes.xml
├── build.gradle
├── settings.gradle
└── gradle.properties
```

---

## アーキテクチャ

```
Android WebView
    │
    ├── file:///android_asset/www/index.html  ← UI
    │       └── js/engine.js                  ← 検索エンジン
    │
    └── JavascriptInterface (AssetBridge)
            └── Android.readAsset(path)  ← assetsからCSVを読み込む
```

### なぜこの構成？
オリジナルJARは **Java Swing**（デスクトップGUI）で書かれており、
SwingはAndroidに存在しないため直接変換は不可能です。
代わりに以下の方法を採用：

- **全CSVデータ** → assets に収録し WebView JS で読み込み
- **検索ロジック** → engine.js として JavaScript で再実装
- **オリジナルJAR** → assets/data/original に一切変更なく保存

---

## 注意事項
- スキル加点＋２、護石系統倍加は現在正しく検索されません（オリジナルと同じ注意）
- お守りはゲーム内でランダム取得のため手動入力が必要です
- 最小SDK: Android 7.0 (API 24)

---

## ライセンス・クレジット
オリジナルデータ: masax_mh 様（http://www.geocities.jp/masax_mh/）
