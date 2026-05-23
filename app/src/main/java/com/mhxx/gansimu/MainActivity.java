package com.mhxx.gansimu;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {

    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // WebView をフルスクリーンで表示
        webView = new WebView(this);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        setContentView(webView, params);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setTextZoom(100);

        // JavaScriptInterface: CSV/テキストファイルをassetsから読み込む橋渡し
        webView.addJavascriptInterface(new AssetBridge(), "Android");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // assets/data/ へのリクエストを横取り
                String url = request.getUrl().toString();
                if (url.startsWith("file:///android_asset/")) {
                    return null; // 通常のasset読み込みに任せる
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // 外部リンクは開かない
                return true;
            }
        });

        // メインHTMLをロード
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * JavaScriptからassetsファイルを読み込むブリッジクラス
     */
    public class AssetBridge {

        /**
         * assetsからテキストファイルを読み込む
         * @param path assetsからの相対パス (例: "data/MHXX_SKILL.csv")
         * @return ファイル内容の文字列。失敗時は空文字
         */
        @JavascriptInterface
        public String readAsset(String path) {
            try {
                InputStream is = getAssets().open(path);
                byte[] bytes = new byte[is.available()];
                int totalRead = 0;
                int read;
                while ((read = is.read(bytes, totalRead, bytes.length - totalRead)) != -1) {
                    totalRead += read;
                    if (totalRead >= bytes.length) break;
                }
                // 残りを読む（available()が不正確な場合）
                if (totalRead == bytes.length) {
                    int remaining;
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    baos.write(bytes, 0, totalRead);
                    byte[] buf = new byte[4096];
                    while ((remaining = is.read(buf)) != -1) {
                        baos.write(buf, 0, remaining);
                    }
                    bytes = baos.toByteArray();
                    totalRead = bytes.length;
                }
                is.close();
                return new String(bytes, 0, totalRead, StandardCharsets.UTF_8);
            } catch (IOException e) {
                return "";
            }
        }

        /**
         * assetsファイルの一覧を返す（デバッグ用）
         * @param dir assetsのディレクトリパス
         * @return カンマ区切りのファイル名一覧
         */
        @JavascriptInterface
        public String listAssets(String dir) {
            try {
                String[] files = getAssets().list(dir);
                if (files == null) return "";
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < files.length; i++) {
                    if (i > 0) sb.append(",");
                    sb.append(files[i]);
                }
                return sb.toString();
            } catch (IOException e) {
                return "";
            }
        }
    }
}
