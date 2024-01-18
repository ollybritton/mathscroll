const content = document.getElementById("content");
let fetching = false;
let count;
let stackexchangecache = [];

function request(method, url, cb) {
  const req = new XMLHttpRequest();
  function onFailure() {
    setTimeout(request, 250, method, url, cb);
  }
  function onResponse() {
    if (((this.status / 100) | 0) !== 2) {
      return onFailure();
    }
    let json;
    try {
      json = JSON.parse(this.responseText);
    } catch (e) {
      return cb(e);
    }
    return cb(null, JSON.parse(this.responseText));
  }
  req.addEventListener("load", onResponse);
  req.addEventListener("error", onFailure);
  req.open(method, url);
  req.send();
}

function fetchEntry(i, cb) {
  request("GET", "./output/articles/" + i + ".json", cb);
}

function fetchStackExchange(cb) {
  request("GET", "./math-stackexchange.json", cb);
}

// entry.url
// entry.image
// entry.title
// entry.summary

function addCard(entry) {
  const wrapper = document.createElement("a");
  wrapper.className = "card";

  if (entry.type == "wiki") {
    wrapper.href = "https://en.wikipedia.org/wiki/" + entry.url;
  } else {
    wrapper.href = entry.url;
  }
  const imageContainer = document.createElement("div");
  imageContainer.className = "image-container";
  const image = document.createElement("img");

  if (entry.type == "wiki") {
    image.src = "./output/images/" + encodeURIComponent(entry.image);
  } else {
    image.src = "https://cdn.sstatic.net/Sites/math/Img/favicon.ico";
  }
  imageContainer.appendChild(image);
  wrapper.appendChild(imageContainer);

  const verticalRule = document.createElement("div");
  verticalRule.className = "vr";
  wrapper.appendChild(verticalRule);

  const text = document.createElement("div");
  const title = document.createElement("h1");
  title.innerText = entry.title;
  text.appendChild(title);
  let summary = document.createElement("p");
  entry.summary = entry.summary.replace(/\{\\displaystyle[^}]*\}/g, "");
  summary.innerText = entry.summary;
  text.appendChild(summary);
  wrapper.appendChild(text);
  content.appendChild(wrapper);

  MathJax.typeset();
}

function fetchCount(cb) {
  request("GET", "./output/00_index_count.txt", cb);
}

function pick() {
  return Math.floor(Math.random() * (count + 1));
}

// fetch <size> number of wikipedia articles, and then add them all to the page
function fetchBatch(size, cb) {
  if (fetching) {
    return;
  }
  fetching = true;
  console.log("fetching batch");
  let fetched = 0;
  for (let i = 0; i < size; i++) {
    console.log(fetched);
    if (Math.random() > 1 / 2) {
      if (stackexchangecache.length == 0) {
        fetchStackExchange((err, data) => {
          stackexchangecache = data;

          entry =
            stackexchangecache[
              Math.floor(Math.random() * stackexchangecache.length)
            ];

          addCard(entry);

          if (++fetched === size - 1) {
            fetching = false;
            cb();
          }
        });
      } else {
        entry =
          stackexchangecache[
            Math.floor(Math.random() * stackexchangecache.length)
          ];
        addCard(entry);

        if (++fetched === size - 1) {
          fetching = false;
          cb();
        }
      }
    } else {
      fetchEntry(pick(), function haveEntry(err, content) {
        content["type"] = "wiki";
        addCard(content);
        if (++fetched === size - 1) {
          fetching = false;
          cb();
        }
      });
    }

    // temporarily replace with stack exchange questions only
  }
}

function registerScroll() {
  let lastKnownScrollPosition = 0;
  let waiting = false;

  function pullMaybe(scrollPos) {
    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    if (pageHeight - 1000 <= scrollPos + window.innerHeight) {
      fetchBatch(25, function noop() {});
    }
  }

  document.addEventListener("scroll", function (e) {
    lastKnownScrollPosition = window.pageYOffset;

    if (!waiting) {
      window.requestAnimationFrame(function () {
        pullMaybe(lastKnownScrollPosition);
        waiting = false;
      });

      waiting = true;
    }
  });
}

fetchCount(function (err, c) {
  // get number of articles json files
  count = c;
  fetchBatch(25, function () {
    console.log("hello??");
    // fetch 25 entries,
    registerScroll(); // start listening for scrolling to the end, so we can pre-load
  });
});
