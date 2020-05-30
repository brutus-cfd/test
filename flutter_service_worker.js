'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/AssetManifest.json": "4e42b64a6232762ef99fa2557d7302f5",
"assets/assets/brutus.gif": "175e37a17e77e0faab498dbbd0106782",
"assets/assets/deploying.jpg": "12ad8af1636021403585f75a85bd9d0c",
"assets/assets/gif2.gif": "84090ff207c57dee93fbab66d6de844b",
"assets/assets/Result/r1.png": "e41bfc0753dadddff15a1ce6e73778ba",
"assets/assets/Result/r2.png": "bcc57902c31f2021b843ea1700039030",
"assets/assets/Result/r3.png": "f4c45a51cf73097e191a4c60b7f828df",
"assets/assets/Result/r4.png": "3d80577cd6dceaa9d8ebde2c48dd1d6c",
"assets/assets/Result/r5.png": "0384d97da0773d74d125130568e20422",
"assets/assets/Result/r6.png": "1f341c148a17bf1615e8d36ee2e0f474",
"assets/assets/Result/r7.png": "cc01dd47ad5668dbb12064872237cd2e",
"assets/assets/Result/r8.png": "31c073aa2de541dd1abe645da16a36df",
"assets/assets/Result/r9.png": "9802ea2a3fcdecf000c32e7423fe0a58",
"assets/assets/result.jpg": "a8121c870c2f612c4401223788429e06",
"assets/assets/samhar.jpg": "8c345961a78d50972e8bb26c89b19d2e",
"assets/assets/tile.png": "04e29e42c124e6cbb44d141298352d96",
"assets/FontManifest.json": "01700ba55b08a6141f33e168c4a6c22f",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/LICENSE": "0ecd02e0921710604a91972f24684df7",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"index.html": "5aaad0c8c61e9460e8ca8164119702d2",
"/": "5aaad0c8c61e9460e8ca8164119702d2",
"main.dart.js": "f7ac569e8ab27e20e70013ef68118afa",
"manifest.json": "41614c10e50bcc866588abed91f1dccd"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
"/",
"index.html",
"assets/LICENSE",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(CORE);
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // If the URL is not the the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

