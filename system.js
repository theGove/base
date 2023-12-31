const GLOBALS = {
  blogger: false,   // used to tell of we are running on blogger
  devMode: false    // used to tell if we are running on local host
}


async function initialize(platform = "web") {
  GLOBALS.blogger = platform === "blogger"
  GLOBALS.devMode = window.location.hostname.toLowerCase().startsWith('localhost')


  add_to_head("script", {
    id: 'markdown',
    crossorigin: 'anonymous',
    integrity: 'sha512-uwSxMaa/W7dmSIXEd07BMVymisMRRUS/Pr5a76AquekKKu9HWn4rBiCd+ZtwqnoijAJvttdrz8krzP26kZjg0Q==',
    referrerpolicy: 'no-referrer',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/marked/4.2.12/marked.min.js'
  })

  initialize_app()
}

async function initialize_app() {
  // wait to be sure the initialize things have loaded

  if ( //typeof firebase==='undefined'      ||
    //typeof Prism?.highlightAll==='undefined' ||
    //typeof sjcl?.encrypt==='undefined' ||
    typeof marked === 'undefined'

  ) {
    log("caught")
    setTimeout(initialize_app, 100)
    return

  }

  
  // ------------  load libraries  ------------------
  //  load_page({webPath:"lib/load_libs.js",localRequest:true})

  // ------------  choose between book and API  ------------------


  // ------------  load interface  ------------------ should already be loaded
  // load_page({webPath:"interface/interface.css",localRequest:true})
  // load_page({webPath:"interface/interface.js",localRequest:true})


  log("starting")
  initialize_book()
  const url_params = get_params()
  log("url_params", url_params)

  // let webPath = null
  // if (url_params.page) {
  //   webPath = url_params.page
  // } else {
  //   webPath = "interface/index.html"
  // }
  // await load_page({webPath,localRequest:true})

  // now the interface is loaded, build the table of contents
  //const response = await fetch(await get_url(webPath))
  //const raw_toc = await response.text();

}


async function get_url(page_path) {
  const page_url = new URL(window.location)

  if (GLOBALS.blogger) {
    log("url", page_path, `${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`)
    return `${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`
  } else {
    return page_path
  }
}

function blog_link_handler(evt) {
  log("at link handler", evt.target.getAttribute("href"))
  const link = evt.target.getAttribute("href")
  if (link.split("?")[0].includes(":")) {
    // this is a link with a protocol. just follow it
    return true
  } else if (link.startsWith("/")) {
    //this is a absolute path on this site
    load_page({webPath:link.substring(1)})// get rid of the initial slash because we don't prefix with slash in pageId
  } else {
    // must be a relative path on this site
    // need to have a way to figure the path of the current page
    const current_path = document.body.dataset.pagePath.split("/")
    current_path.pop()
    new_path = link.split("/")

    while (new_path[0] === ".") {
      new_path.shift()
    }

    while (new_path[0] === "..") {
      new_path.shift()
      current_path.pop()
    }

    load_page({webPath:current_path.concat(new_path).join("/")})
  }
  evt.preventDefault();
  return false

}




// return the id of a blogger post based on its page_path
async function bloggerId(page_path) {
  const msgUint8 = new TextEncoder().encode(page_path); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8); // hash the page_path
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  let hash36 = ""
  // encode blocks of 10 characters at a time to base 36
  for (let x = 0; x < 4; x++) {
    hash36 += parseInt(hashHex.substring(x * 10, x * 10 + 10), 16).toString(36)
  }
  return hash36;
}


function get_params(query_string) {
  const page_url = new URL(window.location)
  if (!query_string) {
    query_string = page_url.search
  }
  const url_params_array = query_string.split("?").join("").split("&")
  const url_params = {}

  for (let x = 0; x < url_params_array.length; x++) {
    // returns the params from the url as an object
    const temp = url_params_array[x].split("=")
    url_params[decodeURI(temp[0])] = decodeURI(temp[1])
  }
  return url_params
}


/** 
 * gets js that is stored as a base-64 encoded string (if fetched in production) 
 * in a post and loads it to the <header> tag.
 * If the tag already exists, then it will override the js tag with the content of the file. 
 * @param {string} webPath the name of the file we want to get. It gets converted into 
 * a URL.
 */



async function add_to_head(tag_name, attributes) {
  // place a tag in the document header with the specified attributes
  let tag_id_header = document.getElementById(attributes.id)
  if (!tag_id_header) {
    tag_id_header = document.createElement(tag_name)
    for (const [attr_name, attr_val] of Object.entries(attributes)) {
      tag_id_header.setAttribute(attr_name, attr_val)
    }
    document.head.appendChild(tag_id_header)
  }
}

function decodeHtml(input) {
  var doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}

// send a tag or the id of the tag.  returns the relevant tag
function tag(tag_or_id) {
  if (typeof tag_or_id === 'string') {
    return document.getElementById(tag_or_id)
  } else {
    return tag_or_id
  }
}





function log(...args) {
  // use this to log only in development mode
  //if (!GLOBALS.blogger) log(...args)
  console.log(window.location.host, ...args)
}




async function get_page_content(parameters) {
  // get the content of a file using fetch.  if on blogger, it will return 
  // just the post content, properly decoded.
  const params = Object.assign({webPath:"interface/index.html", localRequest: false }, parameters)

  //response=await load_page({webPath:"basis-dev/content/junk7.html", returnContent:true})
  
  const page_url = new URL(window.location)
  let request_url = ""
  let source = ""
  if (GLOBALS.blogger) {
    if (params.localRequest) {
      // request blog page without iframe
      log("params.webPath",params.webPath)
      const response = await fetch(`${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(params.webPath)}.html`)
      source = getRealContentFromBlogPost(await response.text())
    } else {
      // request through an iframe
      //debugger
      const webPath_array = params.webPath.split("/")
      const host = webPath_array.shift()
      const host_name_array = page_url.hostname.split(".")
      host_name_array.shift()
      host_name_array.unshift(host)
      
      request_url = `${page_url.protocol}//${host}.${host_name_array.join(".")}/2022/02/${await bloggerId(webPath_array.join("/"))}.html`
      source = await api_request({ mode: "get-page", webPath: webPath_array.join("/") }, `${page_url.protocol}//${host_name_array.join(".")}?api`)
    }
    // decode the source if necessary
    if (params.webPath.endsWith(".js")) {
      source = atob(source)
    }
    return source
  } else if (GLOBALS.devMode) {
    if (params.localRequest) {
      request_url = params.webPath
    } else {
      request_url = "/" + params.webPath
    }
    const response = await fetch(request_url)
    return await response.text()
  } else {
    // production non-blogger (hopefully we never get here)
    // need to think about what the structure would be the structure on aws or github pages 
  }

  function getRealContentFromBlogPost(source) {
    return source.split("==~~--FiLe" + "-" + "CoNtEnTs--~~==")[1]
  }

}



async function load_page(parameters) {
  const params = Object.assign({webPath:"interface/index.html", destinationTag: null, localRequest: false },parameters);
  log("parameters", parameters)
  log("params", params)
  let source = await get_page_content(params);

  if(params.returnContent){
    // send content back to caller
    return source
  }
  

  if(params.webPath.endsWith(".css")){
    // write CSS to the head
    const css = document.createElement(`style`)
    css.innerHTML = source
    document.head.appendChild(css)
    return
  }

  if(params.webPath.endsWith(".js")){
    // write JS to head 

    js_tag_id = params.webPath.split("/").join("-")
    let js_tag = document.getElementById(js_tag_id)
  
    if (!js_tag) {
      js_tag = document.createElement(`script`)
      js_tag.setAttribute("id", js_tag_id)
      if (params.scriptType) {
        js_tag.setAttribute("type", params.scriptType)
      } else {
        const type_attr = source.match(/@type=["'](.*)['"]@/)
        if (type_attr) {
          js_tag.setAttribute("type", type_attr[1])
        }
      }
      js_tag.async = false;
      document.head.appendChild(js_tag)
    }
    // js_tag.addEventListener('load', function () {
    //   //log("hi hi hi");
    // });
  
    js_tag.replaceChildren(source)
  

    return
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "text/html")

  log("doc", doc)
  if (params.destinationTag) {
      tag(params.destinationTag).replaceChildren(doc)
  } else if (document.body) {
    // the document has a body tag, replace current body with it
    doc.body.dataset.pagePath = params.webPath
    document.body.remove()
    document.head.parentNode.append(doc.body)
  } else {
    // document does not have a body, but no destination was specified, replace the body with the doc
    document.body.remove()
    document.head.parentNode.append(doc)
  }

}
