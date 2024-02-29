const content = document.getElementById("content");
let fetching = false;
let count;
let stackexchangecache = [];
let mathoverflowcache = [];
let oxfordcache = [];

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
  console.log("Fetching Wikipedia articles");
  request("GET", "./output/articles/" + i + ".json", cb);
}

function fetchStackExchange(cb) {
  console.log(
    "Fetching Mathematics Stack Exchange questions",
    stackexchangecache.length
  );
  request("GET", "./math-stackexchange.json", cb);
}

function fetchMathOverflow(cb) {
  console.log("Fetching MathOverflow questions", mathoverflowcache.length);
  request("GET", "./math-mathoverflow.json", cb);
}

function fetchOxford(cb) {
  console.log("Fetching Oxford course data", oxfordcache.length);
  request("GET", "./oxford-courses.json", cb);
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
  } else if (entry.type == "ms") {
    image.src = "https://cdn.sstatic.net/Sites/math/Img/favicon.ico";
  } else if (entry.type == "mo") {
    image.src = "https://cdn.sstatic.net/Sites/mathoverflow/Img/favicon.ico";
  } else if (entry.type == "ox") {
    image.src =
      "https://www.ox.ac.uk/sites/default/themes/custom/oxweb/favicon.ico";
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

  MathJax.typesetPromise();
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
  //   console.log("fetching batch");
  let fetched = 0;
  for (let i = 0; i < size; i++) {
    // console.log(fetched);
    let rand = Math.random() * 100;
    if (rand < 30) {
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
    } else if (rand < 60) {
      //   console.log("yo");
      if (mathoverflowcache.length == 0) {
        fetchMathOverflow((err, data) => {
          mathoverflowcache = data;

          entry =
            mathoverflowcache[
              Math.floor(Math.random() * mathoverflowcache.length)
            ];

          addCard(entry);

          if (++fetched === size - 1) {
            fetching = false;
            cb();
          }
        });
      } else {
        entry =
          mathoverflowcache[
            Math.floor(Math.random() * mathoverflowcache.length)
          ];
        addCard(entry);

        if (++fetched === size - 1) {
          fetching = false;
          cb();
        }
      }
    } else if (rand < 65) {
      if (oxfordcache.length == 0) {
        fetchOxford((err, data) => {
          for (const [year, courses] of Object.entries(data)) {
            for (const course of courses) {
              let courseName = course[0];
              let courseURL = course[1];
              oxfordcache.push({
                title: `${courseName}`,
                url: courseURL,
                summary: `${year} course at the University of Oxford.`,
                type: "ox",
              });
            }
          }

          entry = oxfordcache[Math.floor(Math.random() * oxfordcache.length)];

          addCard(entry);

          if (++fetched === size - 1) {
            fetching = false;
            cb();
          }
        });
      } else {
        entry = oxfordcache[Math.floor(Math.random() * oxfordcache.length)];
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
    if (pageHeight - 1500 <= scrollPos + window.innerHeight) {
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
    // fetch 25 entries,
    registerScroll(); // start listening for scrolling to the end, so we can pre-load
  });
});
