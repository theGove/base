const GLOBALS={
  blogger:false
}


async function initialize(platform="web"){
    GLOBALS.blogger=platform==="blogger"



    add_to_head("link",{
      id:"google-fonts",
      href:'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
      rel:'stylesheet'
    })
  
    // add_to_head("script",{
    //   id:"prism-1",
    //   src:'https://cdnjs.cloudflare.com/ajax/libs/prism/1.23.0/components/prism-core.min.js'
    // })
  
    // add_to_head("script",{
    //   id:"prism-2",
    //   src:"https://cdnjs.cloudflare.com/ajax/libs/prism/1.23.0/plugins/autoloader/prism-autoloader.min.js"
    // })
  
    // add_to_head("script",{
    //   id:"sqlite",
    //   crossorigin:'anonymous',
    //   integrity:'sha512-n7swEtVCvXpQ7KxgpPyp0+DQQEf5vPpmzCRl14x2sp2v5LpCYCjrAx03mkBAbWwGF9eUoIk8YVcDFuJRIeYttg==',
    //   referrerpolicy:'no-referrer',
    //   src:'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js'
    // })
  
    add_to_head("script",{
      id:'markdown',
      crossorigin:'anonymous',
      integrity:'sha512-uwSxMaa/W7dmSIXEd07BMVymisMRRUS/Pr5a76AquekKKu9HWn4rBiCd+ZtwqnoijAJvttdrz8krzP26kZjg0Q==',
      referrerpolicy:'no-referrer',
      src:'https://cdnjs.cloudflare.com/ajax/libs/marked/4.2.12/marked.min.js'
    })
  
    // add_to_head("script",{
    //   id:"sjcl",
    //   crossorigin:'anonymous',
    //   integrity:'sha512-s0r9TyYSs5CusSDL5s/QEZQZ4DNYLDXx0S+imS+SHR9mw0Yd0Z5KNS9dw7levSp7GpjOZu/bndds3FEDrKd8dg==',
    //   referrerpolicy:'no-referrer',
    //   src:'https://cdnjs.cloudflare.com/ajax/libs/sjcl/1.0.8/sjcl.min.js'
    // })
  
    load_js_from_blog_post("firebase-js","module")
  




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
    const page_url = new URL(window.location)

    if (GLOBALS.blogger) {
      return `${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`
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
  