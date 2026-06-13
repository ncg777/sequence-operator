var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// public/manifest.json
var require_manifest = __commonJS({
  "public/manifest.json"(exports, module) {
    module.exports = {
      short_name: "SeqOp",
      name: "Sequence Operator",
      icons: [
        {
          src: "logo32.png",
          sizes: "32x32",
          type: "image/png"
        },
        {
          src: "logo192.png",
          type: "image/png",
          sizes: "192x192"
        },
        {
          src: "logo512.png",
          type: "image/png",
          sizes: "512x512"
        }
      ],
      start_url: ".",
      display: "standalone",
      theme_color: "#00ff00",
      background_color: "#000000"
    };
  }
});

// vite.config.mts
import Components from "file:///D:/repos/sequence-operator/node_modules/unplugin-vue-components/dist/vite.js";
import Vue from "file:///D:/repos/sequence-operator/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Vuetify, { transformAssetUrls } from "file:///D:/repos/sequence-operator/node_modules/vite-plugin-vuetify/dist/index.mjs";
import ViteFonts from "file:///D:/repos/sequence-operator/node_modules/unplugin-fonts/dist/vite.mjs";
import { VitePWA } from "file:///D:/repos/sequence-operator/node_modules/vite-plugin-pwa/dist/index.js";
import { defineConfig } from "file:///D:/repos/sequence-operator/node_modules/vite/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///D:/repos/sequence-operator/vite.config.mts";
var vite_config_default = defineConfig({
  plugins: [
    Vue({
      template: { transformAssetUrls }
    }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: require_manifest(),
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        // 5 MiB, adjust as needed
      }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify(),
    Components(),
    ViteFonts({
      google: {
        families: [{
          name: "Roboto",
          styles: "wght@100;300;400;500;700;900"
        }]
      }
    })
  ],
  base: "/sequence-operator/",
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    },
    extensions: [
      ".js",
      ".json",
      ".jsx",
      ".mjs",
      ".ts",
      ".tsx",
      ".vue"
    ]
  },
  server: {
    port: 3e3
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler"
      }
    }
  },
  build: {
    outDir: "docs"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicHVibGljL21hbmlmZXN0Lmpzb24iLCAidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJ7XHJcbiAgXCJzaG9ydF9uYW1lXCI6IFwiU2VxT3BcIixcclxuICBcIm5hbWVcIjogXCJTZXF1ZW5jZSBPcGVyYXRvclwiLFxyXG4gIFwiaWNvbnNcIjogW1xyXG4gICAge1xyXG4gICAgICBcInNyY1wiOiBcImxvZ28zMi5wbmdcIixcclxuICAgICAgXCJzaXplc1wiOiBcIjMyeDMyXCIsXHJcbiAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBcInNyY1wiOiBcImxvZ28xOTIucG5nXCIsXHJcbiAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICBcInNpemVzXCI6IFwiMTkyeDE5MlwiXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBcInNyY1wiOiBcImxvZ281MTIucG5nXCIsXHJcbiAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICBcInNpemVzXCI6IFwiNTEyeDUxMlwiXHJcbiAgICB9XHJcbiAgXSxcclxuICBcInN0YXJ0X3VybFwiOiBcIi5cIixcclxuICBcImRpc3BsYXlcIjogXCJzdGFuZGFsb25lXCIsXHJcbiAgXCJ0aGVtZV9jb2xvclwiOiBcIiMwMGZmMDBcIixcclxuICBcImJhY2tncm91bmRfY29sb3JcIjogXCIjMDAwMDAwXCJcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXHJlcG9zXFxcXHNlcXVlbmNlLW9wZXJhdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxyZXBvc1xcXFxzZXF1ZW5jZS1vcGVyYXRvclxcXFx2aXRlLmNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L3JlcG9zL3NlcXVlbmNlLW9wZXJhdG9yL3ZpdGUuY29uZmlnLm10c1wiOy8vIFBsdWdpbnNcclxuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSdcclxuaW1wb3J0IFZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCBWdWV0aWZ5LCB7IHRyYW5zZm9ybUFzc2V0VXJscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZXRpZnknXHJcbmltcG9ydCBWaXRlRm9udHMgZnJvbSAndW5wbHVnaW4tZm9udHMvdml0ZSdcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcblxyXG4vLyBVdGlsaXRpZXNcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIFZ1ZSh7XHJcbiAgICAgIHRlbXBsYXRlOiB7IHRyYW5zZm9ybUFzc2V0VXJscyB9LFxyXG4gICAgfSksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgIG1hbmlmZXN0OiByZXF1aXJlKCcuL3B1YmxpYy9tYW5pZmVzdC5qc29uJyksXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNSAqIDEwMjQgKiAxMDI0IC8vIDUgTWlCLCBhZGp1c3QgYXMgbmVlZGVkXHJcbiAgICAgIH1cclxuICAgIH0pLFxyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3Z1ZXRpZnlqcy92dWV0aWZ5LWxvYWRlci90cmVlL21hc3Rlci9wYWNrYWdlcy92aXRlLXBsdWdpbiNyZWFkbWVcclxuICAgIFZ1ZXRpZnkoKSxcclxuICAgIENvbXBvbmVudHMoKSxcclxuICAgIFZpdGVGb250cyh7XHJcbiAgICAgIGdvb2dsZToge1xyXG4gICAgICAgIGZhbWlsaWVzOiBbe1xyXG4gICAgICAgICAgbmFtZTogJ1JvYm90bycsXHJcbiAgICAgICAgICBzdHlsZXM6ICd3Z2h0QDEwMDszMDA7NDAwOzUwMDs3MDA7OTAwJyxcclxuICAgICAgICB9XSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgYmFzZTonL3NlcXVlbmNlLW9wZXJhdG9yLycsXHJcbiAgZGVmaW5lOiB7ICdwcm9jZXNzLmVudic6IHt9IH0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSksXHJcbiAgICB9LFxyXG4gICAgZXh0ZW5zaW9uczogW1xyXG4gICAgICAnLmpzJyxcclxuICAgICAgJy5qc29uJyxcclxuICAgICAgJy5qc3gnLFxyXG4gICAgICAnLm1qcycsXHJcbiAgICAgICcudHMnLFxyXG4gICAgICAnLnRzeCcsXHJcbiAgICAgICcudnVlJyxcclxuICAgIF0sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgc2Fzczoge1xyXG4gICAgICAgIGFwaTogJ21vZGVybi1jb21waWxlcicsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJ2RvY3MnLFxyXG4gIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFDRSxZQUFjO0FBQUEsTUFDZCxNQUFRO0FBQUEsTUFDUixPQUFTO0FBQUEsUUFDUDtBQUFBLFVBQ0UsS0FBTztBQUFBLFVBQ1AsT0FBUztBQUFBLFVBQ1QsTUFBUTtBQUFBLFFBQ1Y7QUFBQSxRQUNBO0FBQUEsVUFDRSxLQUFPO0FBQUEsVUFDUCxNQUFRO0FBQUEsVUFDUixPQUFTO0FBQUEsUUFDWDtBQUFBLFFBQ0E7QUFBQSxVQUNFLEtBQU87QUFBQSxVQUNQLE1BQVE7QUFBQSxVQUNSLE9BQVM7QUFBQSxRQUNYO0FBQUEsTUFDRjtBQUFBLE1BQ0EsV0FBYTtBQUFBLE1BQ2IsU0FBVztBQUFBLE1BQ1gsYUFBZTtBQUFBLE1BQ2Ysa0JBQW9CO0FBQUEsSUFDdEI7QUFBQTtBQUFBOzs7QUN2QkEsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sV0FBVywwQkFBMEI7QUFDNUMsT0FBTyxlQUFlO0FBQ3RCLFNBQVMsZUFBZTtBQUd4QixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGVBQWUsV0FBVztBQVQrSCxJQUFNLDJDQUEyQztBQVluTixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsTUFDRixVQUFVLEVBQUUsbUJBQW1CO0FBQUEsSUFDakMsQ0FBQztBQUFBLElBQ0QsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLFFBQ1AsK0JBQStCLElBQUksT0FBTztBQUFBO0FBQUEsTUFDNUM7QUFBQSxJQUNGLENBQUM7QUFBQTtBQUFBLElBRUQsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsVUFBVTtBQUFBLE1BQ1IsUUFBUTtBQUFBLFFBQ04sVUFBVSxDQUFDO0FBQUEsVUFDVCxNQUFNO0FBQUEsVUFDTixRQUFRO0FBQUEsUUFDVixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQUs7QUFBQSxFQUNMLFFBQVEsRUFBRSxlQUFlLENBQUMsRUFBRTtBQUFBLEVBQzVCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxJQUNBLFlBQVk7QUFBQSxNQUNWO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxxQkFBcUI7QUFBQSxNQUNuQixNQUFNO0FBQUEsUUFDSixLQUFLO0FBQUEsTUFDUDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
