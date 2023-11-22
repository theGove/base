const INITIAL_FUNCTION = start_me_up

const PAGE_URL = new URL(window.location)
async function start_me_up(){
    console.log("starting")
    const url_params = get_params()
    console.log("url_params",url_params)
    let page_path="src/index.html"
    if(url_params.page){
        page_path = "src/" + url_params.page
    }
    const page=await load_page(page_path)
    console.log("page", page)
    const parser = new DOMParser();
    const doc = parser.parseFromString(page, "text/html")
    document.body.replaceChildren(doc.body)
    
}


async function get_url(page_path) {
    const PAGE_URL = new URL(window.location)

    if (SERVER==="blogger") {
      return `${PAGE_URL.protocol}//${PAGE_URL.host}/2022/02/${await bloggerId(page_path)}.html`
    } else {
      return page_path
    }
  }


async function load_page(page_path){
    const url = await get_url(page_path)
    console.log("url", url)
    const response = await fetch(url)
    let post_body = await response.text();  
    if (SERVER==="blogger") {
        const contentDelimiter="==~~--FiLe"+"-"+"CoNtEnTs--~~=="
        return post_body.split(contentDelimiter)[1]
    }
    return post_body

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
  