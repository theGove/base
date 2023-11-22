const GLOBALS={
  blogger:false
}

const PAGE_URL = new URL(window.location)
async function initialize(platform="web"){
    GLOBALS.blogger=platform==="blogger"

    console.log("starting")
    const url_params = get_params()
    console.log("url_params",url_params)
    let page_path=null
    if(url_params.page){
      page_path = url_params.page
    }else{
      page_path="content/index.html"
    }
    await load_page(page_path)
    
}


async function get_url(page_path) {
    const PAGE_URL = new URL(window.location)

    if (GLOBALS.blogger) {
      return `${PAGE_URL.protocol}//${PAGE_URL.host}/2022/02/${await bloggerId(page_path)}.html`
    } else {
      return page_path
    }
  }
function blog_link_handler(evt){
  console.log("at link handler", evt.target.getAttribute("href"))
  const link=evt.target.getAttribute("href")
  if(link.includes(":")){
    // this is a link with a protocol. just follow it
    return true
  }else if(link.startsWith("/")){
    //this is a absolute path on this site
    load_page(link.substring(1))// get rid of the initial slash because we don't prefix with slash in pageId
  }else{
    // must be a relative path on this site
    // need to have a way to figure the path of the current page
    const current_path=document.body.dataset.pagePath.split("/")
    current_path.pop()
    new_path=link.split("/")

    while(new_path[0]==="."){      
      new_path.shift()
    }

    while(new_path[0]===".."){
      new_path.shift()
      current_path.pop()
    }
    
    console.log("loading relative link not yet supported", current_path, new_path, ) 
    
    load_page(current_path.concat(new_path).join("/"))
  }
  evt.preventDefault();
  return false
  
}

async function get_page_content(page_path){
  const url = await get_url(page_path)
  console.log("url", url)
  const response = await fetch(url)
  return await response.text();  

}

async function load_page(page_path){
    let raw_page = await get_page_content(page_path);  
    const parser = new DOMParser();
    if (GLOBALS.blogger) {
        const contentDelimiter="==~~--FiLe"+"-"+"CoNtEnTs--~~=="
        raw_page = raw_page.split(contentDelimiter)[1]
    }

    const doc = parser.parseFromString(raw_page, "text/html")

    if (GLOBALS.blogger || true) {
      // add event listener to links on blog
      for(const element of doc.getElementsByTagName('a')) {
          console.log("link handler", element)
          element.onclick = blog_link_handler
      }

    }

    console.log("doc",doc)
    doc.body.dataset.pagePath=page_path
    document.body.parentNode.replaceChildren(doc.body)
    


}

// return the id of a blogger post based on its page_path
async function bloggerId(page_path) {
    const msgUint8 = new TextEncoder().encode(page_path); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8); // hash the page_path
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); // convert bytes to hex string
    let hash36=""    
    // encode blocks of 10 characters at a time to base 36
    for(let x=0;x<4;x++){
        hash36+=parseInt(hashHex.substring(x*10, x*10+10),16).toString(36)
    }
    return hash36;
}


function get_params(query_string) {
    if (!query_string) {
      query_string = PAGE_URL.search
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
  