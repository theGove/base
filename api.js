const GLOBALS = {
  blogger: false,   // used to tell of we are running on blogger
  api: false,       // used to tell of we are acting as a book or an api
  devMode: false    // used to tell if we are running on local host
}


async function initialize(platform = "web") {
  GLOBALS.blogger = platform === "blogger"
  GLOBALS.api = window.location.search === "?api"
  GLOBALS.devMode = window.location.hostname.toLowerCase().startsWith('localhost')

  Slick.createReceiver(async event => {
    log("api-data", event.data)
    if (event.data.mode === "get-page") {
      // this is a request for a page
      let source=null
      if(event.data.webPath){
        log("getting page", event.data.webPath)
        source=await get_page_content({webPath:event.data.webPath,localRequest:true})
      }else{
        log("getting page", event.data.pageId)
        source=await get_page_content({pageId:event.data.pageId,localRequest:true})
      }
      return {source}
    }
    return {
      message: "Blogger API: External event. No need to process result",
    }
  })
  document.body.replaceChildren("API: " + window.location.host)
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
}log



// send a tag or the id of the tag.  returns the relevant tag
function tag(tag_or_id) {
  if (typeof tag_or_id === 'string') {
    return document.getElementById(tag_or_id)
  } else {
    return tag_or_id
  }
}


/**
 * An Object for handling Cross origin i-frame communication
 */
const Slick = {
  /**
   * Adds and listener for the message event. You should only call this method once.
   * @param {(event: MessageEvent<*>)=> Promise<Object.<string, any>>} handlerCallback 
   */
  createReceiver(handlerCallback) {
    window.addEventListener("message",
      async event => {
        try {
          if(event.source){
            log( "createReceiver", event)
            //debugger
            const data = await handlerCallback(event)
            event.source.postMessage({ ...data, __slick_id__: event.data.__slick_id__ }, event.origin)
          }// otherwise, there is no source, Gove thinks there is no reason to try to postMessage
        } catch (error) {
          event.source.postMessage({ __slick_error__: error, id: event.data.id }, event.origin)
        }
      }
    );
  },

  /**
   * An object that has the post method, used for making cross origin requests across i-frames. 
   */
  requester: function () {
    const requests = {}
    window.addEventListener(
      "message",
      (e) => {
        if (requests[e.data.__slick_id__]) {
          log("---at reqester",e.data)
          if (e.data.__slick_error__) {
            requests[e.data.__slick_id__].reject(e.data.__slick_error__)
          } else {
            requests[e.data.__slick_id__].resolve(e.data)
          }
        }
      },
    );
    return {
      async post(contentWindow, data, origin = "*") {
        const __slick_id__ = Math.random()
        const promise = new Promise((resolve, reject) => {
          requests[__slick_id__] = { resolve, reject }
        })
        contentWindow.postMessage({ ...data, __slick_id__ }, origin)
        const result = await promise
        delete requests[__slick_id__]
        log("-------------------------------------result",result)
        return result
      }
    }
  }()
}

async function api_request(message_object, api_url) {
  //call the specified api, creating the iframe if it is the first call to this api
  //api url is the domain name where where the api is located.
  //debugger
  const frame_id = btoa(api_url.split("?")[0])
  let iframe = document.getElementById(frame_id)

  // if the iframe has successfully received a response from the API, just use it
  if (iframe?.dataset?.status === "verified") {
    return await Slick.requester.post(iframe.contentWindow, message_object, "*")
  }

  // if we just created the iframe, the handler from it's content will not have loaded, set up
  // a race to see if the response comes back with in 100 milliseconds, if not try again

  iframe = document.createElement("iframe")
  iframe.id = frame_id
  iframe.src = api_url
  //iframe.style.display = "none"
  document.body.append(iframe)


  let result = null
  let delay = 100
  while (!result) {
    delay = delay * 1.5  // increase the time we wait  by 50% for each iteration in case we are on a slow connection
    //log ("waiting",delay,"milliseconds" )
    result = await Promise.race([
      Slick.requester.post(iframe.contentWindow, message_object, "*"),
      new Promise((resolve, reject) => {
        let wait = setTimeout(() => {
          clearTimeout(wait);
          resolve(null);
        }, delay)
      })
    ])
  }
  iframe.dataset.status = "verified"
  return result
}


async function get_page_content(parameters) {
  // get the content of a file using fetch.  if on blogger, it will return 
  // just the post content, properly decoded.
  const params = Object.assign({localRequest: false }, parameters)

  //response=await load_page({webPath:"basis-dev/content/junk7.html", returnContent:true})
  
  const page_url = new URL(window.location)
  let request_url = ""
  let page_source = ""
  if (GLOBALS.blogger) {
    if (params.localRequest) {
      
      // request blog page without iframe
      let response=null
      //debugger
      if(params.webPath){
        const api_fetch_url=`${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(params.webPath)}.html`
        log("direct request with webPath", api_fetch_url)
        response = await fetch(api_fetch_url)
      }else{
        const api_fetch_url=`${page_url.protocol}//${page_url.host}/2022/02/${params.pageId}.html`
        log("direct request with pageId", api_fetch_url)
        response = await fetch(api_fetch_url)
      }
      page_source = getRealContentFromBlogPost(await response.text())
    } else {
      // request through an iframe
      //debugger
      const webPath_array = params.webPath.split("/")
      const host = webPath_array.shift()
      const host_name_array = page_url.hostname.split(".")
      host_name_array.shift()
      host_name_array.unshift(host)
      
      request_url = `${page_url.protocol}//${host}.${host_name_array.join(".")}/2022/02/${await bloggerId(webPath_array.join("/"))}.html`
      log("iframe api request",api_fetch_url)
      page_source = await api_request({ mode: "get-page", webPath: webPath_array.join("/") }, `${page_url.protocol}//${host_name_array.join(".")}?api`)
    }
    // decode the source if necessary
    // if (params.webPath.endsWith(".js")) {
    //   source = atob(source)
    // }
    return page_source
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
    //    return source.split("==~~--FiLe" + "-" + "CoNtEnTs--~~==")[1]
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, "text/html")
    return doc.querySelector(".code").innerText
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

function log(...args) {
  // use this to log only in development mode
  //if (!GLOBALS.blogger) log(...args)
  console.log(window.location.href,...args)
}
